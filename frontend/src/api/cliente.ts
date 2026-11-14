import { API_URL } from '@/config'
import type { CorpoErro } from './tipos'

// Cliente HTTP do app. Todas as chamadas à API passam por aqui, e só por aqui:
// - põe o token da sessão no cabeçalho;
// - transforma qualquer resposta de erro em ApiErro, com a `message` que a API escreveu para o
//   usuário final (as telas mostram essa mensagem como está);
// - avisa a sessão quando o token deixa de valer (401), e a navegação leva de volta ao login.

export class ApiErro extends Error {
    constructor(
        readonly status: number,
        message: string,
        readonly errors: { campo: string; mensagem: string }[] = []
    ) {
        super(message)
        this.name = 'ApiErro'
    }

    // Mensagem do campo, quando a API recusou um campo específico (erro de validação).
    doCampo(campo: string): string | undefined {
        return this.errors.find(e => e.campo === campo)?.mensagem
    }
}

// status 0: o pedido nem chegou à API (sem internet, endereço errado, servidor fora do ar).
export const MENSAGEM_SEM_CONEXAO = 'Não foi possível falar com a UBS. Confira sua internet e tente de novo.'

const TEMPO_LIMITE_MS = 15_000

type Ligacoes = {
    obterToken: () => string | null
    aoExpirar: () => void
}

let ligacoes: Ligacoes = { obterToken: () => null, aoExpirar: () => {} }

// Chamado pela sessão ao montar: o cliente não importa a sessão (evita dependência circular).
export function ligarSessao(novas: Ligacoes) {
    ligacoes = novas
}

type Opcoes = {
    corpo?: unknown
    query?: Record<string, string | number | undefined | null>
    // Token explícito (login e troca de senha usam o token recém-recebido).
    token?: string | null
    // Por padrão, um 401 com token encerra a sessão. A troca de senha desliga isso: lá o 401
    // significa "senha atual incorreta", não "sessão vencida".
    encerraSessaoEm401?: boolean
}

export async function requisitar<T>(metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE', rota: string, opcoes: Opcoes = {}): Promise<T> {
    const token = opcoes.token !== undefined ? opcoes.token : ligacoes.obterToken()
    const url = API_URL + rota + montarQuery(opcoes.query)

    const controle = new AbortController()
    const tempo = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS)

    let resposta: Response
    try {
        resposta = await fetch(url, {
            method: metodo,
            headers: {
                Accept: 'application/json',
                ...(opcoes.corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
            signal: controle.signal
        })
    } catch {
        throw new ApiErro(0, MENSAGEM_SEM_CONEXAO)
    } finally {
        clearTimeout(tempo)
    }

    const dados = await lerJson(resposta)

    if (!resposta.ok) {
        const corpo = (dados ?? {}) as Partial<CorpoErro>
        const erro = new ApiErro(resposta.status, corpo.message || mensagemPadrao(resposta.status), corpo.errors ?? [])
        if (resposta.status === 401 && token && opcoes.encerraSessaoEm401 !== false) ligacoes.aoExpirar()
        throw erro
    }

    return dados as T
}

function montarQuery(query: Opcoes['query']): string {
    if (!query) return ''
    const partes = Object.entries(query)
        .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
        .map(([chave, valor]) => `${encodeURIComponent(chave)}=${encodeURIComponent(String(valor))}`)
    return partes.length ? `?${partes.join('&')}` : ''
}

async function lerJson(resposta: Response): Promise<unknown> {
    const texto = await resposta.text().catch(() => '')
    if (!texto) return null
    try {
        return JSON.parse(texto)
    } catch {
        return null
    }
}

// Só usada se a API não mandar `message` (não deveria acontecer: o errorHandler sempre manda).
function mensagemPadrao(status: number): string {
    if (status === 401) return 'Sua sessão terminou. Entre de novo.'
    if (status === 403) return 'Você não tem permissão para fazer isso.'
    if (status === 404) return 'Não encontramos o que você procurou.'
    if (status === 409) return 'Isso mudou enquanto você olhava. Atualize a tela.'
    return 'Algo deu errado. Tente de novo em instantes.'
}

// Mensagem para mostrar ao usuário a partir de qualquer erro (ApiErro ou inesperado).
export function mensagemDeErro(erro: unknown): string {
    if (erro instanceof ApiErro) return erro.message
    return 'Algo deu errado. Tente de novo em instantes.'
}
