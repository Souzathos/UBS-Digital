import { EntityManager } from "typeorm";
import { Clock, clock as relogioPadrao } from "../clock";
import { AppDataSource } from "../config/dataSource";
import { BadRequestError, ConflictError } from "../errors";
import { Agendamento, Slot, StatusAgendamento } from "../models";
import { inicioDoDia } from "../utils/datas";
import { AgendamentoService, estaAtivo, mensagemDeEstado } from "./AgendamentoService";
import { LembreteService } from "./LembreteService";
import { AcaoLog, LogAcaoService } from "./LogAcaoService";
import { Autor } from "./tipos";

export type ResultadoPresenca = StatusAgendamento.COMPARECEU | StatusAgendamento.FALTOU

// Fluxo C: no dia da consulta, a recepção registra COMPARECEU ou FALTOU.
// Vale para PENDENTE e CONFIRMADO (um vulnerável pode chegar ao dia ainda PENDENTE, seção 4).
export class PresencaService {
    private agendamentos: AgendamentoService
    private lembretes: LembreteService
    private logs: LogAcaoService

    constructor(private readonly clock: Clock = relogioPadrao) {
        this.agendamentos = new AgendamentoService(clock)
        this.lembretes = new LembreteService(clock)
        this.logs = new LogAcaoService(clock)
    }

    async registrar(id: number, resultado: ResultadoPresenca, autor: Autor, ubsId: number) {
        await AppDataSource.transaction(async manager => {
            const agora = this.clock.now()
            const agendamento = await this.agendamentos.obterDoAutor(manager, id, autor, ubsId, true)

            // RN-71: registrar o mesmo resultado de novo não muda nada
            if(agendamento.status === resultado) return
            if(agendamento.status === StatusAgendamento.COMPARECEU || agendamento.status === StatusAgendamento.FALTOU) {
                throw new ConflictError('A presença desta consulta já foi registrada')
            }
            if(!estaAtivo(agendamento)) throw new ConflictError(mensagemDeEstado(agendamento.status))

            const slot = await manager.getRepository(Slot).findOneByOrFail({ id: agendamento.slotId })
            if(agora < inicioDoDia(slot.inicio)) throw new BadRequestError('A presença só pode ser registrada a partir do dia da consulta')

            const statusAnterior = agendamento.status
            agendamento.status = resultado
            agendamento.presencaRegistradaEm = agora
            await manager.getRepository(Agendamento).save(agendamento)

            await this.lembretes.cancelarPendentes(manager, agendamento.id)
            await this.logs.registrar(manager, agendamento.id, AcaoLog.PRESENCA, autor, { resultado, statusAnterior })
            await this.aoRegistrarPresenca(manager, agendamento, statusAnterior, agora)
        })

        return this.agendamentos.carregar(id)
    }

    // Ponto de extensão: pontuação (RN-40 a RN-42, Camada 2). Recebe o status anterior porque só
    // FALTOU vindo de CONFIRMADO tira pontos, e vulnerável nunca perde (RN-41).
    protected async aoRegistrarPresenca(_manager: EntityManager, _agendamento: Agendamento, _statusAnterior: StatusAgendamento, _agora: Date) {}
}
