import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { ApiErro, ligarSessao } from '@/api/cliente'
import type { PacienteProprio, UsuarioEquipe } from '@/api/tipos'
import { servicos } from '@/servicos'
import { apagarToken, gravarToken, lerToken } from './armazenamento'
import type { Sessao } from './guardas'

type ContextoSessao = {
    sessao: Sessao
    entrarPaciente: (cpf: string, senha: string) => Promise<void>
    entrarEquipe: (email: string, senha: string) => Promise<void>
    trocarSenha: (senhaAtual: string, novaSenha: string) => Promise<void>
    sair: () => Promise<void>
    // Busca de novo os dados de quem está logado (ex.: depois de mudar os canais no Perfil).
    atualizar: () => Promise<void>
    tentarDeNovo: () => void
    // Último paciente e último usuário da equipe logados (ver usePacienteLogado).
    ultimoPaciente: PacienteProprio | null
    ultimoUsuario: UsuarioEquipe | null
}

const Contexto = createContext<ContextoSessao | null>(null)

// Guarda quem está logado. Não navega: as telas que cada sessão pode ver são decididas pelas
// guardas do layout raiz (sessao/guardas.ts). Mudou a sessão, o router leva para o lugar certo.
export function SessaoProvider({ children }: { children: ReactNode }) {
    const [estado, setEstado] = useState<{ sessao: Sessao; ultimoPaciente: PacienteProprio | null; ultimoUsuario: UsuarioEquipe | null }>({
        sessao: { estado: 'carregando' },
        ultimoPaciente: null,
        ultimoUsuario: null
    })
    const { sessao, ultimoPaciente, ultimoUsuario } = estado
    // Troca a sessão e lembra quem estava logado: ao sair, a tela que está saindo ainda desenha
    // uma vez antes de a guarda tirá-la da pilha, e precisa desses dados para não quebrar.
    const setSessao = useCallback((nova: Sessao) => {
        setEstado(atual => ({
            sessao: nova,
            ultimoPaciente: nova.estado === 'paciente' ? nova.paciente : atual.ultimoPaciente,
            ultimoUsuario: nova.estado === 'equipe' ? nova.usuario : atual.ultimoUsuario
        }))
    }, [])
    const [tentativa, setTentativa] = useState(0)
    const queryClient = useQueryClient()

    // O cliente HTTP lê o token por esta referência, sempre atual, sem re-renderizar.
    const tokenAtual = useRef<string | null>(null)

    const limpar = useCallback(async () => {
        tokenAtual.current = null
        await apagarToken()
        queryClient.clear()
        setSessao({ estado: 'anonimo' })
    }, [queryClient, setSessao])

    const aplicar = useCallback(async (token: string, quem: { paciente: PacienteProprio } | { usuario: UsuarioEquipe }) => {
        tokenAtual.current = token
        await gravarToken(token)
        setSessao('paciente' in quem ? { estado: 'paciente', token, paciente: quem.paciente } : { estado: 'equipe', token, usuario: quem.usuario })
    }, [setSessao])

    useEffect(() => {
        ligarSessao({
            obterToken: () => tokenAtual.current,
            // Token vencido ou inválido no meio do uso: volta para o login.
            aoExpirar: () => {
                limpar()
            }
        })
    }, [limpar])

    // Ao abrir o app: há token guardado? Ele ainda vale? /auth/eu responde as duas perguntas.
    useEffect(() => {
        let ativo = true
        async function restaurar() {
            const token = await lerToken()
            if (!token) {
                if (ativo) setSessao({ estado: 'anonimo' })
                return
            }
            try {
                const eu = await servicos.auth.eu(token)
                if (!ativo) return
                tokenAtual.current = token
                setSessao(eu.tipo === 'PACIENTE' ? { estado: 'paciente', token, paciente: eu.paciente } : { estado: 'equipe', token, usuario: eu.usuario })
            } catch (erro) {
                if (!ativo) return
                if (erro instanceof ApiErro && erro.status === 0) {
                    // Sem conexão: o token pode estar bom; não apaga, mostra a tela de tentar de novo.
                    setSessao({ estado: 'semConexao' })
                } else {
                    await apagarToken()
                    setSessao({ estado: 'anonimo' })
                }
            }
        }
        restaurar()
        return () => {
            ativo = false
        }
    }, [tentativa, setSessao])

    const entrarPaciente = useCallback(async (cpf: string, senha: string) => {
        const r = await servicos.auth.entrarPaciente(cpf, senha)
        await aplicar(r.token, { paciente: { ...r.paciente, deveTrocarSenha: r.deveTrocarSenha } })
    }, [aplicar])

    const entrarEquipe = useCallback(async (email: string, senha: string) => {
        const r = await servicos.auth.entrarEquipe(email, senha)
        await aplicar(r.token, { usuario: r.usuario })
    }, [aplicar])

    const trocarSenha = useCallback(async (senhaAtual: string, novaSenha: string) => {
        if (sessao.estado !== 'paciente') return
        const r = await servicos.auth.trocarSenha(sessao.token, senhaAtual, novaSenha)
        // O token antigo carregava deveTrocarSenha = true; a partir daqui vale o novo.
        await aplicar(r.token, { paciente: { ...r.paciente, deveTrocarSenha: false } })
    }, [sessao, aplicar])

    const atualizar = useCallback(async () => {
        if (sessao.estado !== 'paciente' && sessao.estado !== 'equipe') return
        const eu = await servicos.auth.eu(sessao.token)
        await aplicar(sessao.token, eu.tipo === 'PACIENTE' ? { paciente: eu.paciente } : { usuario: eu.usuario })
    }, [sessao, aplicar])

    const tentarDeNovo = useCallback(() => {
        setSessao({ estado: 'carregando' })
        setTentativa(t => t + 1)
    }, [setSessao])

    const valor = useMemo(
        () => ({ sessao, entrarPaciente, entrarEquipe, trocarSenha, sair: limpar, atualizar, tentarDeNovo, ultimoPaciente, ultimoUsuario }),
        [sessao, entrarPaciente, entrarEquipe, trocarSenha, limpar, atualizar, tentarDeNovo, ultimoPaciente, ultimoUsuario]
    )

    return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSessao() {
    const contexto = useContext(Contexto)
    if (!contexto) throw new Error('useSessao precisa estar dentro de SessaoProvider')
    return contexto
}

// Atalhos para telas que só existem dentro de uma área (a guarda garante o tipo da sessão).
// Devolvem o último logado: no instante em que a pessoa sai, a tela ainda desenha uma vez.
export function usePacienteLogado(): PacienteProprio {
    const { ultimoPaciente } = useSessao()
    if (!ultimoPaciente) throw new Error('Tela do paciente aberta sem sessão de paciente')
    return ultimoPaciente
}

export function useEquipeLogada(): UsuarioEquipe {
    const { ultimoUsuario } = useSessao()
    if (!ultimoUsuario) throw new Error('Tela da equipe aberta sem sessão de equipe')
    return ultimoUsuario
}
