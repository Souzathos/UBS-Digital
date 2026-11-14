import type { PacienteProprio, UsuarioEquipe } from '@/api/tipos'

export type Sessao =
    | { estado: 'carregando' }
    | { estado: 'semConexao' }
    | { estado: 'anonimo' }
    | { estado: 'paciente'; token: string; paciente: PacienteProprio }
    | { estado: 'equipe'; token: string; usuario: UsuarioEquipe }

// Quais áreas do app a sessão libera. As quatro são exclusivas: em qualquer momento, só uma é
// verdadeira (ou nenhuma, enquanto carrega). O layout raiz usa isso nos Stack.Protected.
export type Guardas = {
    anonimo: boolean
    trocarSenha: boolean
    paciente: boolean
    equipe: boolean
}

export function calcularGuardas(sessao: Sessao): Guardas {
    const pacienteComSenhaProvisoria = sessao.estado === 'paciente' && sessao.paciente.deveTrocarSenha
    return {
        anonimo: sessao.estado === 'anonimo',
        // Senha provisória: a única tela possível é "Crie sua senha" (handoff, seção 3).
        trocarSenha: pacienteComSenhaProvisoria,
        paciente: sessao.estado === 'paciente' && !pacienteComSenhaProvisoria,
        equipe: sessao.estado === 'equipe'
    }
}

// Para onde a entrada do app manda cada sessão.
export function destinoInicial(sessao: Sessao): '/entrar' | '/trocar-senha' | '/paciente' | '/equipe' | null {
    const g = calcularGuardas(sessao)
    if (g.anonimo) return '/entrar'
    if (g.trocarSenha) return '/trocar-senha'
    if (g.paciente) return '/paciente'
    if (g.equipe) return '/equipe'
    return null
}
