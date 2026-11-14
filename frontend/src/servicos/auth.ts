import { requisitar } from '@/api/cliente'
import type { Canal, PacienteProprio, RespostaEntrarEquipe, RespostaEntrarPaciente, RespostaEu } from '@/api/tipos'

// Autenticação (SPEC, seção 14, "Autenticação").
export interface AuthServico {
    entrarPaciente(cpf: string, senha: string): Promise<RespostaEntrarPaciente>
    entrarEquipe(email: string, senha: string): Promise<RespostaEntrarEquipe>
    // Usa o token da senha provisória e devolve um token novo, já liberado.
    trocarSenha(token: string, senhaAtual: string, novaSenha: string): Promise<RespostaEntrarPaciente>
    eu(token: string): Promise<RespostaEu>
    // RN-80: a lista dos canais ligados; os de fora ficam recusados.
    atualizarCanais(canais: Canal[]): Promise<PacienteProprio>
}

export const authApi: AuthServico = {
    entrarPaciente: (cpf, senha) => requisitar('POST', '/auth/paciente/entrar', { corpo: { cpf, senha }, token: null }),
    entrarEquipe: (email, senha) => requisitar('POST', '/auth/equipe/entrar', { corpo: { email, senha }, token: null }),
    trocarSenha: (token, senhaAtual, novaSenha) =>
        requisitar('POST', '/auth/paciente/trocar-senha', { corpo: { senhaAtual, novaSenha }, token, encerraSessaoEm401: false }),
    eu: token => requisitar('GET', '/auth/eu', { token }),
    atualizarCanais: canais => requisitar('PATCH', '/auth/paciente/canais', { corpo: { canais } })
}
