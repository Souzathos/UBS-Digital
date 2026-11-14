import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { AppDataSource } from "../src/config/dataSource";
import { relogioAjustavel } from "../src/clock";
import { LogAcao, Notificacao, PerfilEquipe, StatusNotificacao } from "../src/models";
import { api, authEquipe, clearDb, criarEquipe, montarCenario, startDb, stopDb, zerarRelogio } from "./helpers";

type Cenario = Awaited<ReturnType<typeof montarCenario>>

async function agendar(c: Cenario, dias: number, hora = '09:00') {
    const slot = await c.slot(dias, {}, hora)
    const res = await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId: c.paciente.id, slotId: slot.id })
    return res.body
}

const registrar = (c: Cenario, id: number, resultado: string, auth = c.authRecepcao) =>
    api().post(`/equipe/agendamentos/${id}/presenca`).set('Authorization', auth).send({ resultado })

describe('registro de comparecimento ou falta (fluxo C)', () => {
    before(startDb)
    beforeEach(clearDb)
    afterEach(zerarRelogio)
    after(stopDb)

    it('fluxo C: no dia da consulta registra COMPARECEU, com horário e log (RN-82)', async () => {
        const c = await montarCenario()
        const agendamento = await agendar(c, 0, '14:00') // hoje às 14:00 (agora são 10:00)

        const res = await registrar(c, agendamento.id, 'COMPARECEU')

        assert.equal(res.status, 200)
        assert.equal(res.body.status, 'COMPARECEU')
        assert.equal(new Date(res.body.presencaRegistradaEm).toISOString(), new Date('2026-11-16T10:00:00').toISOString())
        assert.deepEqual(res.body.acoes, { confirmar: false, cancelar: false, remarcar: false })

        const log = await AppDataSource.getRepository(LogAcao).findOneByOrFail({ agendamentoId: agendamento.id, acao: 'PRESENCA' })
        assert.deepEqual(log.detalhes, { via: 'PAINEL', resultado: 'COMPARECEU', statusAnterior: 'CONFIRMADO' })
        assert.equal(log.autorId, c.recepcao.id)
    })

    it('fluxo C: registra FALTOU de agendamento ainda PENDENTE e cancela os lembretes que faltavam', async () => {
        const c = await montarCenario()
        const agendamento = await agendar(c, 10)
        assert.equal(agendamento.status, 'PENDENTE')
        relogioAjustavel!.avancar(10 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000) // dia da consulta, 07:00

        const res = await registrar(c, agendamento.id, 'FALTOU')

        assert.equal(res.body.status, 'FALTOU')
        const pendentes = await AppDataSource.getRepository(Notificacao).countBy({ agendamentoId: agendamento.id, status: StatusNotificacao.AGENDADA })
        assert.equal(pendentes, 0)
    })

    it('fluxo C: recusa antes do dia da consulta', async () => {
        const c = await montarCenario()
        const agendamento = await agendar(c, 1)

        const res = await registrar(c, agendamento.id, 'COMPARECEU')

        assert.equal(res.status, 400)
        assert.match(res.body.message, /a partir do dia da consulta/)
    })

    it('fluxo C: recusa em agendamento cancelado; o mesmo resultado de novo não muda nada; resultado diferente é 409', async () => {
        const c = await montarCenario()
        const cancelado = await agendar(c, 0, '11:00')
        await api().post(`/equipe/agendamentos/${cancelado.id}/cancelar`).set('Authorization', c.authRecepcao)
        const outro = await agendar(c, 0, '15:00')

        const emCancelado = await registrar(c, cancelado.id, 'COMPARECEU')
        assert.equal(emCancelado.status, 409)
        assert.equal(emCancelado.body.message, 'Esta consulta já foi cancelada')

        await registrar(c, outro.id, 'COMPARECEU')
        assert.equal((await registrar(c, outro.id, 'COMPARECEU')).status, 200)
        assert.equal(await AppDataSource.getRepository(LogAcao).countBy({ agendamentoId: outro.id, acao: 'PRESENCA' }), 1)

        const trocar = await registrar(c, outro.id, 'FALTOU')
        assert.equal(trocar.status, 409)
    })

    it('fluxo C: só recepção e gestor registram; valor inválido é 400', async () => {
        const c = await montarCenario()
        const agendamento = await agendar(c, 0, '14:00')
        const acs = await criarEquipe(c.ubs.id, PerfilEquipe.ACS)

        assert.equal((await registrar(c, agendamento.id, 'COMPARECEU', authEquipe(acs))).status, 403)
        assert.equal((await registrar(c, agendamento.id, 'CANCELADO_PACIENTE')).status, 400)
    })

    it('fluxo C: a agenda do dia mostra o resultado registrado', async () => {
        const c = await montarCenario()
        const agendamento = await agendar(c, 0, '14:00')
        await registrar(c, agendamento.id, 'COMPARECEU')

        const agenda = await api().get('/equipe/agenda?data=2026-11-16').set('Authorization', c.authRecepcao)

        assert.equal(agenda.body[0].status, 'COMPARECEU')
        assert.ok(agenda.body[0].presencaRegistradaEm)
    })
})
