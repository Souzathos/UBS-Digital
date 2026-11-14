import { EntityManager } from "typeorm";
import { Clock, clock as relogioPadrao } from "../clock";
import { env } from "../config/env";
import { AppDataSource } from "../config/dataSource";
import { LinkToken, TipoAutor } from "../models";
import { gerarTokenAleatorio, hashToken } from "../utils/token";

export type ResolucaoLink =
    | { estado: 'VALIDO', linkToken: LinkToken }
    | { estado: 'EXPIRADO', linkToken: LinkToken }
    | { estado: 'INVALIDO' }

// RN-70: cada envio leva um token aleatório próprio para o agendamento e o destinatário. O banco guarda
// só o hash (SHA-256): quem lê o banco não consegue montar o link. O token expira no horário da consulta.
export class LinkTokenService {
    constructor(private readonly clock: Clock = relogioPadrao) {}

    async criar(manager: EntityManager, dados: { agendamentoId: number, destinatarioTipo: TipoAutor, destinatarioId: number, expiraEm: Date }) {
        const token = gerarTokenAleatorio()
        const repo = manager.getRepository(LinkToken)
        await repo.save(repo.create({ ...dados, tokenHash: hashToken(token), ofertaId: null, usadoEm: null }))

        return { token, url: `${env.LINK_BASE_URL.replace(/\/$/, '')}/l/${token}` }
    }

    async resolver(token: string, manager: EntityManager = AppDataSource.manager): Promise<ResolucaoLink> {
        if(!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return { estado: 'INVALIDO' }

        const linkToken = await manager.getRepository(LinkToken).findOneBy({ tokenHash: hashToken(token) })
        if(!linkToken) return { estado: 'INVALIDO' }
        if(linkToken.expiraEm <= this.clock.now()) return { estado: 'EXPIRADO', linkToken }

        return { estado: 'VALIDO', linkToken }
    }

    async marcarUsado(manager: EntityManager, linkToken: LinkToken) {
        if(linkToken.usadoEm) return
        await manager.getRepository(LinkToken).update({ id: linkToken.id }, { usadoEm: this.clock.now() })
    }
}
