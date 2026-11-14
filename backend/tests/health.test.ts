import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { api } from "./helpers";

describe('base da API', () => {
    it('GET /health responde ok', async () => {
        const res = await api().get('/health')

        assert.equal(res.status, 200)
        assert.deepEqual(res.body, { status: 'ok' })
    })

    it('rota desconhecida responde 404 em JSON', async () => {
        const res = await api().get('/nao-existe')

        assert.equal(res.status, 404)
        assert.equal(res.body.message, 'Rota não encontrada')
    })

    it('JSON malformado responde 400', async () => {
        const res = await api().post('/health').set('Content-Type', 'application/json').send('{')

        assert.equal(res.status, 400)
        assert.equal(res.body.message, 'JSON inválido')
    })
})
