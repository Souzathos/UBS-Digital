import { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors";
import { PerfilEquipe, TipoAutor } from "../models/enums";
import { SessaoEquipe, SessaoPaciente, verificarToken } from "../utils/jwt";

function lerSessao(req: Request) {
    const header = req.headers.authorization
    if(!header || !header.startsWith('Bearer ')) throw new UnauthorizedError('Faça login para continuar')

    const sessao = verificarToken(header.slice(7))
    if(!sessao) throw new UnauthorizedError('Sessão inválida ou expirada. Faça login de novo')

    req.auth = sessao
    return sessao
}

// Qualquer pessoa logada (equipe ou paciente, inclusive com senha provisória)
export function authQualquer(req: Request, _res: Response, next: NextFunction) {
    lerSessao(req)
    next()
}

// Só equipe da UBS; com perfis, só esses perfis
export function authEquipe(...perfis: PerfilEquipe[]) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const sessao = lerSessao(req)
        if(sessao.tipo !== TipoAutor.EQUIPE) throw new ForbiddenError('Acesso restrito à equipe da UBS')
        if(perfis.length > 0 && !perfis.includes(sessao.perfil)) throw new ForbiddenError('Seu perfil não pode fazer esta ação')
        next()
    }
}

// Só paciente. Com senha provisória pendente, só passa onde a troca é permitida (seção 6)
export function authPaciente(opcoes: { permitirSenhaProvisoria?: boolean } = {}) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const sessao = lerSessao(req)
        if(sessao.tipo !== TipoAutor.PACIENTE) throw new ForbiddenError('Acesso restrito ao paciente')
        if(sessao.deveTrocarSenha && !opcoes.permitirSenhaProvisoria) throw new ForbiddenError('Troque a senha provisória antes de continuar')
        next()
    }
}

// Leitura tipada da sessão nos controllers (o middleware já garantiu o tipo)
export function sessaoEquipe(req: Request): SessaoEquipe {
    if(req.auth?.tipo !== TipoAutor.EQUIPE) throw new UnauthorizedError()
    return req.auth
}

export function sessaoPaciente(req: Request): SessaoPaciente {
    if(req.auth?.tipo !== TipoAutor.PACIENTE) throw new UnauthorizedError()
    return req.auth
}
