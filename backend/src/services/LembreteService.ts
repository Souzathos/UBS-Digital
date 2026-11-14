import { EntityManager, In } from "typeorm";
import { Clock, clock as relogioPadrao } from "../clock";
import { Agendamento, EtapaNotificacao, Notificacao, StatusNotificacao, TipoAutor } from "../models";
import { despachante, Despachante } from "../notifications/Despachante";
import { comHorario, inicioDoDia, somarDias } from "../utils/datas";
import { ConfiguracaoService } from "./ConfiguracaoService";

// As etapas que o enum conhece. lembrete.etapasDias pode ligar ou desligar qualquer uma delas.
const ETAPA_POR_DIAS: Record<number, EtapaNotificacao> = {
    14: EtapaNotificacao.D14,
    7: EtapaNotificacao.D7,
    3: EtapaNotificacao.D3,
    0: EtapaNotificacao.D0
}

export const ETAPAS_DE_LEMBRETE = Object.values(ETAPA_POR_DIAS)

export class LembreteService {
    constructor(private readonly clock: Clock = relogioPadrao, private readonly canais: Despachante = despachante) {}

    // RN-10: até 4 lembretes (D-14, D-7, D-3 com ação; D-0 de manhã, só para lembrar), no horário
    // lembrete.d0Hora do dia de cada etapa.
    // RN-11 [sugestão confirmada]: etapa cujo dia já passou é pulada. Se o dia é hoje e a hora já passou,
    // sai no próximo tick. Etapa que cairia no horário da consulta ou depois também é pulada.
    async agendar(manager: EntityManager, agendamentoId: number, agora = this.clock.now()) {
        const agendamento = await manager.getRepository(Agendamento).findOneOrFail({
            where: { id: agendamentoId },
            relations: { slot: true, paciente: true }
        })
        const { slot, paciente } = agendamento
        const config = new ConfiguracaoService(manager)
        const etapasDias = await config.get('lembrete.etapasDias', paciente.ubsId)
        const hora = await config.get('lembrete.d0Hora', paciente.ubsId)
        const { canal } = this.canais.escolherCanal(paciente, await config.get('canal.ordem', paciente.ubsId))

        const repo = manager.getRepository(Notificacao)
        const notificacoes: Notificacao[] = []

        for(const dias of [...new Set(etapasDias)].sort((a, b) => b - a)) {
            const etapa = ETAPA_POR_DIAS[dias]
            if(!etapa) continue

            const dia = somarDias(inicioDoDia(slot.inicio), -dias)
            if(dia < inicioDoDia(agora)) continue

            let agendadaPara = comHorario(dia, hora)
            if(agendadaPara < agora) agendadaPara = agora
            if(agendadaPara >= slot.inicio) continue

            notificacoes.push(repo.create({
                agendamentoId: agendamento.id,
                ofertaId: null,
                destinatarioTipo: TipoAutor.PACIENTE,
                destinatarioId: paciente.id,
                etapa,
                canal,
                status: StatusNotificacao.AGENDADA,
                agendadaPara,
                tentativa: 0
            }))
        }

        return repo.save(notificacoes)
    }

    // Agendamento saiu do ar (cancelado, remarcado, presença registrada): lembretes futuros não saem mais
    async cancelarPendentes(manager: EntityManager, agendamentoId: number) {
        await manager.getRepository(Notificacao).update(
            { agendamentoId, status: StatusNotificacao.AGENDADA },
            { status: StatusNotificacao.CANCELADA }
        )
    }

    // RN-62: uma resposta em qualquer canal encerra a etapa já enviada
    async marcarRespondidas(manager: EntityManager, agendamentoId: number, agora = this.clock.now()) {
        await manager.getRepository(Notificacao).update(
            { agendamentoId, status: In([StatusNotificacao.ENVIADA, StatusNotificacao.ENTREGUE]) },
            { status: StatusNotificacao.RESPONDIDA, respondidaEm: agora }
        )
    }
}
