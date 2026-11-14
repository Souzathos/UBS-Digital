import { In, LessThanOrEqual } from "typeorm";
import { AppDataSource } from "../config/dataSource";
import { Agendamento, Notificacao, STATUS_AGENDAMENTO_ATIVOS, StatusAgendamento, StatusNotificacao, TipoAutor } from "../models";
import { despachante, Despachante } from "../notifications/Despachante";
import { exigeResposta, textoLembrete } from "../notifications/mensagens";
import { ConfiguracaoService } from "../services/ConfiguracaoService";
import { ETAPAS_DE_LEMBRETE } from "../services/LembreteService";
import { LinkTokenService } from "../services/LinkTokenService";
import { Job } from "./runner";

const LOTE = 200

// RN-10 a RN-13, RN-63, RN-70: envia os lembretes cujo horário chegou. Cada envio ganha um token novo
// (RN-70) e o texto é montado na hora do envio, com o status atual (RN-12).
export function criarLembretesJob(canais: Despachante = despachante): Job {
    return {
        nome: 'lembretes',
        async executar(agora: Date) {
            return AppDataSource.transaction(async manager => {
                const contadores = { enviados: 0, cancelados: 0, falhas: 0 }

                // skip_locked: se outra rodada já pegou a notificação, esta passa direto
                const pendentes = await manager.getRepository(Notificacao).find({
                    where: { status: StatusNotificacao.AGENDADA, agendadaPara: LessThanOrEqual(agora), etapa: In(ETAPAS_DE_LEMBRETE) },
                    order: { agendadaPara: 'ASC', id: 'ASC' },
                    take: LOTE,
                    lock: { mode: 'pessimistic_write', onLocked: 'skip_locked' }
                })

                for(const notificacao of pendentes) {
                    const agendamento = notificacao.agendamentoId
                        ? await manager.getRepository(Agendamento).findOne({
                            where: { id: notificacao.agendamentoId },
                            relations: { slot: { tipoAtendimento: true, profissional: true }, paciente: { ubs: true } }
                        })
                        : null

                    const ativo = agendamento && (STATUS_AGENDAMENTO_ATIVOS as readonly StatusAgendamento[]).includes(agendamento.status)
                    if(!agendamento || !ativo || agendamento.slot.inicio <= agora) {
                        notificacao.status = StatusNotificacao.CANCELADA
                        await manager.save(notificacao)
                        contadores.cancelados += 1
                        continue
                    }

                    const { slot, paciente } = agendamento
                    const ordem = await new ConfiguracaoService(manager).get('canal.ordem', paciente.ubsId)
                    const { canal, destino } = canais.escolherCanal(paciente, ordem)
                    const { url } = await new LinkTokenService().criar(manager, {
                        agendamentoId: agendamento.id,
                        destinatarioTipo: TipoAutor.PACIENTE,
                        destinatarioId: paciente.id,
                        expiraEm: slot.inicio
                    })

                    const resultado = await canais.enviar({
                        notificacaoId: notificacao.id,
                        canal,
                        destinatarioTipo: TipoAutor.PACIENTE,
                        destinatarioId: paciente.id,
                        destino,
                        etapa: notificacao.etapa,
                        texto: textoLembrete({
                            etapa: notificacao.etapa,
                            status: agendamento.status,
                            ubsNome: paciente.ubs.nome,
                            pacienteNome: paciente.nome,
                            tipoNome: slot.tipoAtendimento.nome,
                            profissionalNome: slot.profissional.nome,
                            inicio: slot.inicio,
                            instrucoesPreparo: slot.tipoAtendimento.instrucoesPreparo,
                            link: url
                        }),
                        link: url,
                        exigeResposta: exigeResposta(notificacao.etapa, agendamento.status),
                        enviadaEm: agora
                    })

                    notificacao.canal = canal
                    notificacao.tentativa += 1
                    if(resultado.ok) {
                        notificacao.status = StatusNotificacao.ENVIADA
                        notificacao.enviadaEm = agora
                        contadores.enviados += 1
                    } else {
                        // Escalonamento para o próximo canal (RN-61) fica para a Camada 3
                        notificacao.status = StatusNotificacao.FALHOU
                        contadores.falhas += 1
                    }
                    await manager.save(notificacao)
                }

                return contadores
            })
        }
    }
}
