import { ApiErro, ligarSessao, MENSAGEM_SEM_CONEXAO, requisitar } from '../cliente'

function responder(status: number, corpo?: unknown) {
    globalThis.fetch = jest.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve(corpo === undefined ? '' : JSON.stringify(corpo))
    }) as unknown as typeof fetch
}

// Espera a requisição falhar e devolve o erro já tipado.
function falha(p: Promise<unknown>): Promise<ApiErro> {
    return p.then(
        () => {
            throw new Error('a requisição devia ter falhado')
        },
        (e: ApiErro) => e
    )
}

describe('cliente da API', () => {
    const aoExpirar = jest.fn()

    beforeEach(() => {
        aoExpirar.mockReset()
        ligarSessao({ obterToken: () => 'token-da-sessao', aoExpirar })
    })

    it('manda o token da sessão e devolve o JSON', async () => {
        responder(200, { ok: true })
        await expect(requisitar('GET', '/auth/eu')).resolves.toEqual({ ok: true })
        const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0]
        expect(url).toMatch(/\/auth\/eu$/)
        expect(init.headers.Authorization).toBe('Bearer token-da-sessao')
    })

    it('monta a query sem os parâmetros vazios', async () => {
        responder(200, [])
        await requisitar('GET', '/slots', { query: { tipoAtendimentoId: 3, de: undefined, q: '' } })
        expect((globalThis.fetch as jest.Mock).mock.calls[0][0]).toMatch(/\/slots\?tipoAtendimentoId=3$/)
    })

    it('transforma { message, errors } em ApiErro com a mensagem da API', async () => {
        responder(400, { message: 'Dados inválidos', errors: [{ campo: 'cpf', mensagem: 'CPF deve ter 11 números' }] })
        const erro = await falha(requisitar('POST', '/auth/paciente/entrar', { corpo: {}, token: null }))
        expect(erro).toBeInstanceOf(ApiErro)
        expect(erro.status).toBe(400)
        expect(erro.message).toBe('Dados inválidos')
        expect(erro.doCampo('cpf')).toBe('CPF deve ter 11 números')
    })

    it('401 com token encerra a sessão (token vencido)', async () => {
        responder(401, { message: 'Token inválido' })
        await expect(requisitar('GET', '/agendamentos/meus')).rejects.toBeInstanceOf(ApiErro)
        expect(aoExpirar).toHaveBeenCalledTimes(1)
    })

    it('401 no login (sem token) não mexe na sessão: é senha errada', async () => {
        responder(401, { message: 'CPF ou senha inválidos' })
        await expect(requisitar('POST', '/auth/paciente/entrar', { corpo: {}, token: null })).rejects.toThrow('CPF ou senha inválidos')
        expect(aoExpirar).not.toHaveBeenCalled()
    })

    it('401 na troca de senha não encerra a sessão: é a senha atual incorreta', async () => {
        responder(401, { message: 'Senha atual incorreta' })
        await expect(requisitar('POST', '/auth/paciente/trocar-senha', { corpo: {}, encerraSessaoEm401: false })).rejects.toThrow('Senha atual incorreta')
        expect(aoExpirar).not.toHaveBeenCalled()
    })

    it('sem conexão vira ApiErro de status 0 com mensagem para o usuário', async () => {
        globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch
        const erro = await falha(requisitar('GET', '/auth/eu'))
        expect(erro.status).toBe(0)
        expect(erro.message).toBe(MENSAGEM_SEM_CONEXAO)
    })
})
