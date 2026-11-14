import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { relogioAjustavel } from "../src/clock";
import { jobRunner } from "../src/jobs";
import { avancarRelogioRodandoJobs } from "../src/jobs/relogioDev";
import { caixaDeSaida } from "../src/notifications/adapters/MockAdapter";
import { api, authPaciente, clearDb, criarPaciente, montarCenario, SENHA, startDb, stopDb, zerarRelogio } from "./helpers";

const DIA = 24 * 60 * 60 * 1000
type Cenario = Awaited<ReturnType<typeof montarCenario>>

async function agendar(c: Cenario, dias: number) {
    const slot = await c.slot(dias)
    const res = await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: slot.id })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    return res.body as { id: number }
}

const avisos = (c: Cenario, id: number, auth = c.authPaciente) => api().get(`/agendamentos/${id}/avisos`).set('Authorization', auth)
const estados = (body: { avisos: { etapa: string, estado: string }[] }) => body.avisos.map(a => [a.etapa, a.estado])

describe('avisos de um agendamento, UBS na sessão e destinatário nos envios', () => {
    before(startDb)
    beforeEach(clearDb)
    afterEach(zerarRelogio)
    after(stopDb)

    it('RN-10: agendado com folga, as 4 etapas aparecem como "agendado"', async () => {
        const c = await montarCenario()
        const ag = await agendar(c, 20)

        const res = await avisos(c, ag.id)

        assert.equal(res.status, 200, JSON.stringify(res.body))
        assert.deepEqual(estados(res.body), [['D14', 'agendado'], ['D7', 'agendado'], ['D3', 'agendado'], ['D0', 'agendado']])
        assert.equal(res.body.prazoResposta, null)
    })

    it('RN-11: etapa cujo dia já passou não aparece', async () => {
        const c = await montarCenario()
        const ag = await agendar(c, 5)

        const res = await avisos(c, ag.id)

        assert.deepEqual(estados(res.body), [['D3', 'agendado'], ['D0', 'agendado']])
    })

    it('RN-10 / RN-62: enviada pede resposta; depois de confirmar vira "respondido"', async () => {
        const c = await montarCenario()
        const ag = await agendar(c, 20)
        await avancarRelogioRodandoJobs(relogioAjustavel!, jobRunner, 7 * DIA) // D-14 enviado

        const antes = await avisos(c, ag.id)
        assert.deepEqual(estados(antes.body)[0], ['D14', 'enviado'])
        assert.deepEqual(antes.body.avisos[0].canais.length, 1)

        await api().post(`/agendamentos/${ag.id}/confirmar`).set('Authorization', c.authPaciente)
        const depois = await avisos(c, ag.id)
        assert.deepEqual(estados(depois.body), [['D14', 'respondido'], ['D7', 'agendado'], ['D3', 'agendado'], ['D0', 'agendado']])
    })

    it('RN-12: enviada depois de confirmar é só lembrete', async () => {
        const c = await montarCenario()
        const ag = await agendar(c, 20)
        await api().post(`/agendamentos/${ag.id}/confirmar`).set('Authorization', c.authPaciente)
        await avancarRelogioRodandoJobs(relogioAjustavel!, jobRunner, 7 * DIA) // D-14 sai já confirmado

        const res = await avisos(c, ag.id)

        assert.deepEqual(estados(res.body)[0], ['D14', 'lembrete'])
    })

    it('RN-21: cancelado, as etapas que não saíram somem da linha do tempo', async () => {
        const c = await montarCenario()
        const ag = await agendar(c, 20)
        await api().post(`/agendamentos/${ag.id}/cancelar`).set('Authorization', c.authPaciente)

        const res = await avisos(c, ag.id)

        assert.deepEqual(res.body.avisos, [])
    })

    it('outro paciente não vê os avisos (404); a equipe da UBS vê', async () => {
        const c = await montarCenario()
        const ag = await agendar(c, 20)
        const outro = await criarPaciente(c.ubs.id)

        assert.equal((await avisos(c, ag.id, authPaciente(outro))).status, 404)
        const equipe = await api().get(`/equipe/agendamentos/${ag.id}/avisos`).set('Authorization', c.authRecepcao)
        assert.equal(equipe.status, 200)
        assert.equal(equipe.body.avisos.length, 4)
    })

    it('o login e /auth/eu trazem a UBS (nome no cabeçalho do app)', async () => {
        const c = await montarCenario()

        const login = await api().post('/auth/paciente/entrar').send({ cpf: c.paciente.cpf, senha: SENHA })
        assert.equal(login.status, 200, JSON.stringify(login.body))
        assert.deepEqual(login.body.ubs, { id: c.ubs.id, nome: c.ubs.nome, endereco: c.ubs.endereco, telefone: c.ubs.telefone })

        const eu = await api().get('/auth/eu').set('Authorization', c.authRecepcao)
        assert.equal(eu.body.ubs.nome, c.ubs.nome)
    })

    it('RN-90: a caixa de saída de dev traz o nome do destinatário e a hora do envio', async () => {
        const c = await montarCenario()
        await agendar(c, 20)
        caixaDeSaida.limpar()
        await avancarRelogioRodandoJobs(relogioAjustavel!, jobRunner, 7 * DIA)

        const res = await api().get('/dev/envios').set('Authorization', c.authRecepcao)

        assert.equal(res.status, 200)
        assert.equal(res.body[0].destinatarioNome, c.paciente.nome)
        assert.ok(res.body[0].enviadaEm)
    })
})
