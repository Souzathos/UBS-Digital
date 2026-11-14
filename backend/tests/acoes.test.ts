import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { AppDataSource } from "../src/config/dataSource";
import { relogioAjustavel } from "../src/clock";
import { jobRunner } from "../src/jobs";
import { avancarRelogioRodandoJobs } from "../src/jobs/relogioDev";
import { Agendamento, LogAcao, Notificacao, OrigemSlot, PerfilEquipe, Slot, StatusSlot } from "../src/models";
import { api, authEquipe, authPaciente, clearDb, criarEquipe, criarPaciente, criarUbs, montarCenario, startDb, stopDb, zerarRelogio } from "./helpers";

const DIA = 24 * 60 * 60 * 1000
type Cenario = Awaited<ReturnType<typeof montarCenario>>

async function agendarPeloApp(c: Cenario, dias: number, hora = '09:00') {
    const slot = await c.slot(dias, {}, hora)
    const res = await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: slot.id })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    return { agendamento: res.body, slot }
}

const logs = (agendamentoId: number) => AppDataSource.getRepository(LogAcao).find({ where: { agendamentoId }, order: { id: 'ASC' } })
const statusSlot = async (id: number) => (await AppDataSource.getRepository(Slot).findOneByOrFail({ id })).status
const notificacoes = (agendamentoId: number) => AppDataSource.getRepository(Notificacao).find({ where: { agendamentoId }, order: { agendadaPara: 'ASC' } })

describe('confirmar, cancelar e remarcar (RN-20 a RN-22, RN-71, RN-82)', () => {
    before(startDb)
    beforeEach(clearDb)
    afterEach(zerarRelogio)
    after(stopDb)

    it('RN-20: confirmar muda para CONFIRMADO, registra o log e encerra a etapa enviada (RN-62)', async () => {
        const c = await montarCenario()
        const { agendamento } = await agendarPeloApp(c, 10)
        await avancarRelogioRodandoJobs(relogioAjustavel!, jobRunner, 3 * DIA) // D-7 enviado

        const res = await api().post(`/agendamentos/${agendamento.id}/confirmar`).set('Authorization', c.authPaciente)

        assert.equal(res.status, 200)
        assert.equal(res.body.status, 'CONFIRMADO')
        assert.ok(res.body.confirmadoEm)
        assert.deepEqual(res.body.acoes, { confirmar: false, cancelar: true, remarcar: true })
        assert.deepEqual((await logs(agendamento.id)).map(l => l.acao), ['CRIADO', 'CONFIRMADO'])

        const etapas = await notificacoes(agendamento.id)
        assert.deepEqual(etapas.map(n => [n.etapa, n.status]), [['D7', 'RESPONDIDA'], ['D3', 'AGENDADA'], ['D0', 'AGENDADA']])
    })

    it('RN-71: confirmar duas vezes não duplica nada', async () => {
        const c = await montarCenario()
        const { agendamento } = await agendarPeloApp(c, 10)

        const primeira = await api().post(`/agendamentos/${agendamento.id}/confirmar`).set('Authorization', c.authPaciente)
        const segunda = await api().post(`/agendamentos/${agendamento.id}/confirmar`).set('Authorization', c.authPaciente)

        assert.equal(segunda.status, 200)
        assert.equal(segunda.body.confirmadoEm, primeira.body.confirmadoEm)
        assert.equal((await logs(agendamento.id)).filter(l => l.acao === 'CONFIRMADO').length, 1)
    })

    it('RN-21: cancelar depois de confirmar libera o slot, cancela os lembretes e outro paciente pode usar a vaga', async () => {
        const c = await montarCenario()
        const { agendamento, slot } = await agendarPeloApp(c, 10)
        await api().post(`/agendamentos/${agendamento.id}/confirmar`).set('Authorization', c.authPaciente)

        const res = await api().post(`/agendamentos/${agendamento.id}/cancelar`).set('Authorization', c.authPaciente)

        assert.equal(res.status, 200)
        assert.equal(res.body.status, 'CANCELADO_PACIENTE')
        assert.ok(res.body.canceladoEm)
        assert.equal(await statusSlot(slot.id), StatusSlot.LIVRE)
        assert.ok((await notificacoes(agendamento.id)).every(n => n.status === 'CANCELADA'))
        const salvo = await AppDataSource.getRepository(Agendamento).findOneByOrFail({ id: agendamento.id })
        assert.equal(salvo.canceladoPorTipo, 'PACIENTE')
        assert.deepEqual((await logs(agendamento.id)).map(l => l.acao), ['CRIADO', 'CONFIRMADO', 'CANCELADO'])

        const outro = await criarPaciente(c.ubs.id)
        const reaproveitado = await api().post('/agendamentos').set('Authorization', authPaciente(outro)).send({ slotId: slot.id })
        assert.equal(reaproveitado.status, 201)
    })

    it('RN-21 / RN-71: cancelar duas vezes responde igual e não duplica o log', async () => {
        const c = await montarCenario()
        const { agendamento } = await agendarPeloApp(c, 10)

        await api().post(`/agendamentos/${agendamento.id}/cancelar`).set('Authorization', c.authPaciente)
        const segunda = await api().post(`/agendamentos/${agendamento.id}/cancelar`).set('Authorization', c.authPaciente)

        assert.equal(segunda.status, 200)
        assert.equal((await logs(agendamento.id)).filter(l => l.acao === 'CANCELADO').length, 1)
    })

    it('RN-21: não cancela depois do horário da consulta', async () => {
        const c = await montarCenario()
        const { agendamento } = await agendarPeloApp(c, 1, '08:00')
        relogioAjustavel!.avancar(DIA)

        const res = await api().post(`/agendamentos/${agendamento.id}/cancelar`).set('Authorization', c.authPaciente)

        assert.equal(res.status, 409)
        assert.match(res.body.message, /antes do horário/)
    })

    it('RN-21: a recepção cancela em nome do paciente e o autor fica registrado (RN-82)', async () => {
        const c = await montarCenario()
        const { agendamento } = await agendarPeloApp(c, 10)

        const res = await api().post(`/equipe/agendamentos/${agendamento.id}/cancelar`).set('Authorization', c.authRecepcao)

        assert.equal(res.status, 200)
        assert.equal(res.body.canceladoPorTipo, 'EQUIPE')
        const ultimo = (await logs(agendamento.id)).at(-1)!
        assert.equal(ultimo.autorTipo, 'EQUIPE')
        assert.equal(ultimo.autorId, c.recepcao.id)
        assert.equal(ultimo.detalhes.via, 'PAINEL')
    })

    it('RN-22: remarcar cria um novo CONFIRMADO com remarcadoDeId, marca o antigo REMARCADO e libera a vaga antiga', async () => {
        const c = await montarCenario()
        const { agendamento, slot: slotAntigo } = await agendarPeloApp(c, 20)
        const slotNovo = await c.slot(10, {}, '14:00')

        const res = await api().post(`/agendamentos/${agendamento.id}/remarcar`).set('Authorization', c.authPaciente).send({ slotId: slotNovo.id })

        assert.equal(res.status, 200)
        assert.notEqual(res.body.id, agendamento.id)
        assert.equal(res.body.status, 'CONFIRMADO')
        assert.equal(res.body.origem, 'REMARCACAO')
        assert.equal(res.body.remarcadoDeId, agendamento.id)

        const antigo = await AppDataSource.getRepository(Agendamento).findOneByOrFail({ id: agendamento.id })
        assert.equal(antigo.status, 'REMARCADO')
        assert.equal(await statusSlot(slotAntigo.id), StatusSlot.LIVRE)
        assert.equal(await statusSlot(slotNovo.id), StatusSlot.OCUPADO)

        // Lembretes: os do antigo saem do ar; o novo ganha os seus (D-7, D-3, D-0)
        assert.ok((await notificacoes(agendamento.id)).every(n => n.status === 'CANCELADA'))
        assert.deepEqual((await notificacoes(res.body.id)).map(n => n.etapa), ['D7', 'D3', 'D0'])

        assert.deepEqual((await logs(agendamento.id)).map(l => l.acao), ['CRIADO', 'REMARCADO'])
        assert.deepEqual((await logs(res.body.id)).map(l => l.acao), ['CRIADO'])
    })

    it('RN-71: remarcar duas vezes para o mesmo horário devolve o mesmo agendamento novo', async () => {
        const c = await montarCenario()
        const { agendamento } = await agendarPeloApp(c, 20)
        const slotNovo = await c.slot(10, {}, '14:00')

        const primeira = await api().post(`/agendamentos/${agendamento.id}/remarcar`).set('Authorization', c.authPaciente).send({ slotId: slotNovo.id })
        const segunda = await api().post(`/agendamentos/${agendamento.id}/remarcar`).set('Authorization', c.authPaciente).send({ slotId: slotNovo.id })

        assert.equal(segunda.status, 200)
        assert.equal(segunda.body.id, primeira.body.id)
        assert.equal(await AppDataSource.getRepository(Agendamento).countBy({ remarcadoDeId: agendamento.id }), 1)

        const outroHorario = await c.slot(11, {}, '14:00')
        const terceira = await api().post(`/agendamentos/${agendamento.id}/remarcar`).set('Authorization', c.authPaciente).send({ slotId: outroHorario.id })
        assert.equal(terceira.status, 409)
        assert.match(terceira.body.message, /já foi remarcada/)
    })

    it('RN-22: recusa slot de outro tipo, ocupado, fora da cota do app, além da antecedência ou o mesmo horário', async () => {
        const c = await montarCenario()
        const { agendamento, slot: atual } = await agendarPeloApp(c, 20)
        const outroTipo = await c.slot(10, { tipoAtendimentoId: c.tipoBalcao.id }, '10:00')
        const daRecepcao = await c.slot(10, { origem: OrigemSlot.RECEPCAO }, '11:00')
        const longe = await c.slot(61, {}, '09:00')
        const ocupado = await c.slot(10, {}, '15:00')
        await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId: (await criarPaciente(c.ubs.id)).id, slotId: ocupado.id })
        const remarcar = (slotId: number, auth = c.authPaciente, rota = `/agendamentos/${agendamento.id}/remarcar`) =>
            api().post(rota).set('Authorization', auth).send({ slotId })

        assert.equal((await remarcar(outroTipo.id)).status, 400)
        assert.equal((await remarcar(daRecepcao.id)).status, 403)
        assert.equal((await remarcar(longe.id)).status, 400)
        assert.equal((await remarcar(ocupado.id)).status, 409)
        assert.equal((await remarcar(atual.id)).status, 400)

        // RN-02: a recepção pode usar o slot que não é da cota
        const pelaRecepcao = await remarcar(daRecepcao.id, c.authRecepcao, `/equipe/agendamentos/${agendamento.id}/remarcar`)
        assert.equal(pelaRecepcao.status, 200)
        assert.equal(pelaRecepcao.body.criadoPorTipo, 'EQUIPE')
    })

    it('estados finais: não confirma nem remarca consulta cancelada (409)', async () => {
        const c = await montarCenario()
        const { agendamento } = await agendarPeloApp(c, 10)
        await api().post(`/agendamentos/${agendamento.id}/cancelar`).set('Authorization', c.authPaciente)
        const outro = await c.slot(12, {}, '09:00')

        const confirmar = await api().post(`/agendamentos/${agendamento.id}/confirmar`).set('Authorization', c.authPaciente)
        const remarcar = await api().post(`/agendamentos/${agendamento.id}/remarcar`).set('Authorization', c.authPaciente).send({ slotId: outro.id })

        assert.equal(confirmar.status, 409)
        assert.equal(confirmar.body.message, 'Esta consulta já foi cancelada')
        assert.equal(remarcar.status, 409)
    })

    it('autor: paciente não mexe em agendamento de outro; equipe de outra UBS também não; ACS não cancela', async () => {
        const c = await montarCenario()
        const { agendamento } = await agendarPeloApp(c, 10)
        const intruso = await criarPaciente(c.ubs.id)
        const outraUbs = await criarUbs('Outra')
        const recepcaoDeFora = await criarEquipe(outraUbs.id, PerfilEquipe.RECEPCAO)
        const acs = await criarEquipe(c.ubs.id, PerfilEquipe.ACS)

        assert.equal((await api().post(`/agendamentos/${agendamento.id}/cancelar`).set('Authorization', authPaciente(intruso))).status, 404)
        assert.equal((await api().post(`/equipe/agendamentos/${agendamento.id}/cancelar`).set('Authorization', authEquipe(recepcaoDeFora))).status, 404)
        assert.equal((await api().post(`/equipe/agendamentos/${agendamento.id}/cancelar`).set('Authorization', authEquipe(acs))).status, 403)
        assert.equal((await AppDataSource.getRepository(Agendamento).findOneByOrFail({ id: agendamento.id })).status, 'PENDENTE')
    })
})
