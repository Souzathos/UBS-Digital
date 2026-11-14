import { In } from "typeorm";
import { AppDataSource } from "../config/dataSource";
import { Notificacao, StatusAgendamento, StatusNotificacao, TipoAutor } from "../models";
import { AgendamentoService } from "./AgendamentoService";
import { Autor } from "./tipos";
import { ETAPAS_DE_LEMBRETE } from "./LembreteService";

// Estado de uma etapa de lembrete, do ponto de vista de quem recebe:
// agendado: ainda vai sair · enviado: saiu e espera resposta · respondido: a pessoa respondeu
// · lembrete: saiu só para lembrar (RN-12, ou D-0) · semResposta: saiu e ninguém respondeu (RN-26)
export type EstadoAviso = 'agendado' | 'enviado' | 'respondido' | 'lembrete' | 'semResposta'

const ENVIADAS = [StatusNotificacao.ENVIADA, StatusNotificacao.ENTREGUE, StatusNotificacao.FALHOU]

// "Avisos desta consulta" no app: a linha do tempo D-14, D-7, D-3 e D-0 de um agendamento, montada
// a partir das notificações que o LembreteService agendou e o job enviou (RN-10 a RN-12).
export class AvisoService {
    constructor(private readonly agendamentos = new AgendamentoService()) {}

    async doAgendamento(id: number, autor: Autor, ubsId: number) {
        const manager = AppDataSource.manager
        await this.agendamentos.obterDoAutor(manager, id, autor, ubsId)
        const agendamento = await this.agendamentos.carregar(id, manager)

        const notificacoes = await manager.getRepository(Notificacao).find({
            where: { agendamentoId: id, destinatarioTipo: TipoAutor.PACIENTE, etapa: In(ETAPAS_DE_LEMBRETE) },
            order: { agendadaPara: 'ASC', id: 'ASC' }
        })

        // Uma etapa pode ter mais de uma notificação (um canal por tentativa, Camada 3).
        const porEtapa = new Map<string, Notificacao[]>()
        for(const n of notificacoes) porEtapa.set(n.etapa, [...(porEtapa.get(n.etapa) ?? []), n])

        const avisos = [...porEtapa.entries()].flatMap(([etapa, lista]) => {
            const estado = estadoDaEtapa(etapa, lista, agendamento.status)
            if(!estado) return []
            const enviadas = lista.filter(n => n.enviadaEm)
            return [{
                etapa,
                data: enviadas[0]?.enviadaEm ?? lista[0].agendadaPara,
                estado,
                canais: [...new Set((enviadas.length ? enviadas : lista).map(n => n.canal))]
            }]
        })

        return {
            avisos,
            // RN-26 (Camada 2) ainda não existe: sem cancelamento automático, não há prazo a mostrar.
            // Quando existir, este campo traz o horário-limite (semResposta.prazoD3Horas).
            prazoResposta: null as Date | null,
            canceladoAutomaticamenteEm: agendamento.status === StatusAgendamento.CANCELADO_AUTO ? agendamento.canceladoEm : null
        }
    }
}

function estadoDaEtapa(etapa: string, lista: Notificacao[], statusAgendamento: StatusAgendamento): EstadoAviso | null {
    if(lista.some(n => n.status === StatusNotificacao.RESPONDIDA)) return 'respondido'
    if(lista.some(n => ENVIADAS.includes(n.status))) {
        if(statusAgendamento === StatusAgendamento.CANCELADO_AUTO) return 'semResposta'
        // Enviada e ainda sem resposta: pede resposta só se o agendamento segue pendente (RN-12) e
        // não é o D-0, que nunca pede resposta (RN-10).
        return statusAgendamento === StatusAgendamento.PENDENTE && etapa !== 'D0' ? 'enviado' : 'lembrete'
    }
    if(lista.some(n => n.status === StatusNotificacao.AGENDADA)) return 'agendado'
    // Todas canceladas (o agendamento saiu do ar antes): a etapa não aparece.
    return null
}
