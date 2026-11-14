import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { PerfilEquipe, TipoAutor } from "../models/enums";

// Quem está logado. A equipe carrega o perfil (RECEPCAO, ACS, GESTOR); o paciente carrega a flag da
// senha provisória, que bloqueia o resto da API até a troca (seção 6, "Entrar").
const sessaoSchema = z.discriminatedUnion('tipo', [
    z.object({ tipo: z.literal(TipoAutor.EQUIPE), id: z.number().int(), ubsId: z.number().int(), perfil: z.enum(PerfilEquipe) }),
    z.object({ tipo: z.literal(TipoAutor.PACIENTE), id: z.number().int(), ubsId: z.number().int(), deveTrocarSenha: z.boolean() })
])

export type Sessao = z.infer<typeof sessaoSchema>
export type SessaoEquipe = Extract<Sessao, { tipo: TipoAutor.EQUIPE }>
export type SessaoPaciente = Extract<Sessao, { tipo: TipoAutor.PACIENTE }>

export function gerarToken(sessao: Sessao) {
    return jwt.sign(sessao, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN })
}

export function verificarToken(token: string): Sessao | null {
    try {
        const resultado = sessaoSchema.safeParse(jwt.verify(token, env.JWT_SECRET))
        return resultado.success ? resultado.data : null
    } catch {
        return null
    }
}
