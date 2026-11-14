import { EntityManager } from "typeorm";
import { Clock, clock as relogioPadrao } from "../clock";
import { LogAcao } from "../models";
import { Autor } from "./tipos";

export enum AcaoLog {
    CRIADO = 'CRIADO',
    CONFIRMADO = 'CONFIRMADO',
    CANCELADO = 'CANCELADO',
    REMARCADO = 'REMARCADO',
    PRESENCA = 'PRESENCA'
}

// RN-82: toda ação sobre um agendamento gera log com autor, canal e horário. Grava dentro da
// mesma transação da ação, então log e mudança de estado entram (ou não) juntos.
export class LogAcaoService {
    constructor(private readonly clock: Clock = relogioPadrao) {}

    async registrar(manager: EntityManager, agendamentoId: number, acao: AcaoLog, autor: Autor, detalhes: Record<string, unknown> = {}) {
        const repo = manager.getRepository(LogAcao)
        return repo.save(repo.create({
            agendamentoId,
            acao,
            autorTipo: autor.tipo,
            autorId: autor.id,
            canal: autor.canal ?? null,
            detalhes: { via: autor.via, ...detalhes },
            criadoEm: this.clock.now()
        }))
    }
}
