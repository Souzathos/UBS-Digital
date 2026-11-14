import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { AppDataSource } from "../src/config/dataSource";
import { Agendamento, LogAcao, OrigemSlot, Slot, StatusAgendamento, StatusSlot } from "../src/models";
import { ConfiguracaoService } from "../src/services/ConfiguracaoService";
import { api, authEquipe, authPaciente, clearDb, criarEquipe, criarPaciente, criarUbs, montarCenario, startDb, stopDb, zerarRelogio } from "./helpers";
import { PerfilEquipe } from "../src/models";

describe('agendamento pela recepção e pelo app (RN-01 a RN-05, RN-82)', () => {
    before(startDb)
    beforeEach(clearDb)
    afterEach(zerarRelogio)
    after(stopDb)

    it('RN-01: o app recusa tipo não liberado; a recepção agenda qualquer tipo', async () => {
        const c = await montarCenario()
        const slot = await c.slot(10, { tipoAtendimentoId: c.tipoBalcao.id })

        const peloApp = await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: slot.id })
        assert.equal(peloApp.status, 403)
        assert.match(peloApp.body.message, /recepção/)

        const pelaRecepcao = await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId: c.paciente.id, slotId: slot.id })
        assert.equal(pelaRecepcao.status, 201)
        assert.equal(pelaRecepcao.body.origem, 'RECEPCAO')
        assert.equal(pelaRecepcao.body.status, 'PENDENTE')
    })

    it('RN-01: o paciente só vê os tipos liberados para o app; a equipe vê todos', async () => {
        const c = await montarCenario()

        const doPaciente = await api().get('/tipos-atendimento').set('Authorization', c.authPaciente)
        const daEquipe = await api().get('/tipos-atendimento').set('Authorization', c.authRecepcao)

        assert.deepEqual(doPaciente.body.map((t: any) => t.nome), ['Consulta clínica geral'])
        assert.deepEqual(daEquipe.body.map((t: any) => t.nome).sort(), ['Consulta clínica geral', 'Renovação de receita'])

        const slotsBalcao = await api().get(`/slots?tipoAtendimentoId=${c.tipoBalcao.id}`).set('Authorization', c.authPaciente)
        assert.equal(slotsBalcao.status, 403)
    })

    it('RN-02: o app só vê e usa slots da cota; a recepção vê e usa todos', async () => {
        const c = await montarCenario()
        const slotApp = await c.slot(10, { origem: OrigemSlot.APP }, '09:00')
        const slotRecepcao = await c.slot(10, { origem: OrigemSlot.RECEPCAO }, '09:20')

        const listaPaciente = await api().get(`/slots?tipoAtendimentoId=${c.tipoApp.id}`).set('Authorization', c.authPaciente)
        assert.deepEqual(listaPaciente.body.map((s: any) => s.id), [slotApp.id])
        assert.equal(listaPaciente.body[0].origem, undefined)

        const listaEquipe = await api().get(`/slots?tipoAtendimentoId=${c.tipoApp.id}`).set('Authorization', c.authRecepcao)
        assert.deepEqual(listaEquipe.body.map((s: any) => s.id), [slotApp.id, slotRecepcao.id])

        const pacienteNoBalcao = await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: slotRecepcao.id })
        assert.equal(pacienteNoBalcao.status, 403)

        const pacienteNaCota = await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: slotApp.id })
        assert.equal(pacienteNaCota.status, 201)
        assert.equal(pacienteNaCota.body.origem, 'APP')
    })

    it('RN-02: lote de 10 slots com cota de 40% marca 4 para o app e ignora horários repetidos', async () => {
        const c = await montarCenario()
        const lote = { profissionalId: c.profissional.id, tipoAtendimentoId: c.tipoApp.id, dataInicio: '2026-11-17', dataFim: '2026-11-17', horaInicio: '08:00', horaFim: '11:20' }

        const primeiro = await api().post('/slots/lote').set('Authorization', c.authRecepcao).send(lote)
        assert.equal(primeiro.status, 201)
        assert.deepEqual(primeiro.body, { criados: 10, ignorados: 0, cotaApp: 4, cotaAppPercentual: 40 })

        const repetido = await api().post('/slots/lote').set('Authorization', c.authRecepcao).send(lote)
        assert.deepEqual(repetido.body, { criados: 0, ignorados: 10, cotaApp: 0, cotaAppPercentual: 40 })

        // Seção 7: a UBS pode mudar a cota
        await new ConfiguracaoService().set('agendamento.cotaAppPercentual', 50, c.ubs.id)
        const outroDia = await api().post('/slots/lote').set('Authorization', c.authRecepcao).send({ ...lote, dataInicio: '2026-11-18', dataFim: '2026-11-18' })
        assert.equal(outroDia.body.cotaApp, 5)
    })

    it('RN-02: lote pula fim de semana e recusa dias passados; ACS não cria slots', async () => {
        const c = await montarCenario()
        const acs = await criarEquipe(c.ubs.id, PerfilEquipe.ACS)
        // sexta 20/11 a segunda 23/11: só sexta e segunda entram
        const lote = { profissionalId: c.profissional.id, tipoAtendimentoId: c.tipoApp.id, dataInicio: '2026-11-20', dataFim: '2026-11-23', horaInicio: '08:00', horaFim: '09:00' }

        const res = await api().post('/slots/lote').set('Authorization', c.authRecepcao).send(lote)
        assert.equal(res.body.criados, 6)

        const passado = await api().post('/slots/lote').set('Authorization', c.authRecepcao).send({ ...lote, dataInicio: '2026-11-13', dataFim: '2026-11-13' })
        assert.equal(passado.status, 400)

        assert.equal((await api().post('/slots/lote').set('Authorization', authEquipe(acs)).send(lote)).status, 403)
    })

    it('RN-03: recusa slot além da antecedência máxima do tipo, para app e recepção', async () => {
        const c = await montarCenario()
        const dentro = await c.slot(59)
        const fora = await c.slot(61)

        const lista = await api().get(`/slots?tipoAtendimentoId=${c.tipoApp.id}`).set('Authorization', c.authPaciente)
        assert.deepEqual(lista.body.map((s: any) => s.id), [dentro.id])

        const app = await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: fora.id })
        assert.equal(app.status, 400)
        assert.match(app.body.message, /60 dias/)

        const recepcao = await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId: c.paciente.id, slotId: fora.id })
        assert.equal(recepcao.status, 400)

        assert.equal((await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: dentro.id })).status, 201)
    })

    it('RN-04: recusa o 2º agendamento ativo do mesmo tipo; permite de tipo diferente e após encerrar', async () => {
        const c = await montarCenario()
        const primeiro = await c.slot(10, {}, '09:00')
        const segundo = await c.slot(12, {}, '09:00')
        const deOutroTipo = await c.slot(10, { tipoAtendimentoId: c.tipoBalcao.id }, '10:00')

        const a = await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: primeiro.id })
        assert.equal(a.status, 201)

        const repetido = await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: segundo.id })
        assert.equal(repetido.status, 409)
        assert.match(repetido.body.message, /agendamento ativo deste tipo/)

        const pelaRecepcao = await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId: c.paciente.id, slotId: segundo.id })
        assert.equal(pelaRecepcao.status, 409)

        const outroTipo = await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId: c.paciente.id, slotId: deOutroTipo.id })
        assert.equal(outroTipo.status, 201)

        await AppDataSource.getRepository(Agendamento).update({ id: a.body.id }, { status: StatusAgendamento.COMPARECEU })
        assert.equal((await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: segundo.id })).status, 201)
    })

    it('RN-05: criado com menos de 3 dias nasce CONFIRMADO; com 3 dias ou mais nasce PENDENTE', async () => {
        const c = await montarCenario()
        const outro = await criarPaciente(c.ubs.id)
        const terceiro = await criarPaciente(c.ubs.id)
        const emDoisDias = await c.slot(2, {}, '09:00')             // 47h
        const exatamenteTres = await c.slot(3, {}, '10:00')         // 72h
        const emCinco = await c.slot(5, {}, '09:00')

        const a = await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: emDoisDias.id })
        assert.equal(a.body.status, 'CONFIRMADO')
        assert.equal(new Date(a.body.confirmadoEm).toISOString(), new Date('2026-11-16T10:00:00').toISOString())

        const b = await api().post('/agendamentos').set('Authorization', authPaciente(outro)).send({ slotId: exatamenteTres.id })
        assert.equal(b.body.status, 'PENDENTE')

        const d = await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId: terceiro.id, slotId: emCinco.id })
        assert.equal(d.body.status, 'PENDENTE')
        assert.equal(d.body.confirmadoEm, null)

        // Seção 7: o prazo é configurável
        await new ConfiguracaoService().set('agendamento.confirmadoAutomaticoDias', 6, c.ubs.id)
        const quarto = await criarPaciente(c.ubs.id)
        const emCincoDeNovo = await c.slot(5, {}, '10:00')
        const e = await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId: quarto.id, slotId: emCincoDeNovo.id })
        assert.equal(e.body.status, 'CONFIRMADO')
    })

    it('RN-82: criar gera LogAcao com autor, via e horário do Clock; o slot fica OCUPADO', async () => {
        const c = await montarCenario()
        const slot = await c.slot(10)

        const res = await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: slot.id })

        const logs = await AppDataSource.getRepository(LogAcao).findBy({ agendamentoId: res.body.id })
        assert.equal(logs.length, 1)
        assert.equal(logs[0].acao, 'CRIADO')
        assert.equal(logs[0].autorTipo, 'PACIENTE')
        assert.equal(logs[0].autorId, c.paciente.id)
        assert.equal(logs[0].detalhes.via, 'APP')
        assert.equal(logs[0].criadoEm.toISOString(), new Date('2026-11-16T10:00:00').toISOString())

        const agendamento = await AppDataSource.getRepository(Agendamento).findOneByOrFail({ id: res.body.id })
        assert.equal(agendamento.criadoEm.toISOString(), new Date('2026-11-16T10:00:00').toISOString())
        assert.equal((await AppDataSource.getRepository(Slot).findOneByOrFail({ id: slot.id })).status, StatusSlot.OCUPADO)
    })

    it('restrição: dois pacientes no mesmo slot ao mesmo tempo, só um leva; o outro recebe 409', async () => {
        const c = await montarCenario()
        const outro = await criarPaciente(c.ubs.id)
        const slot = await c.slot(10)

        const respostas = await Promise.all([
            api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: slot.id }),
            api().post('/agendamentos').set('Authorization', authPaciente(outro)).send({ slotId: slot.id })
        ])

        assert.deepEqual(respostas.map(r => r.status).sort(), [201, 409])
        assert.equal(await AppDataSource.getRepository(Agendamento).countBy({ slotId: slot.id }), 1)
    })

    it('recusa horário que já passou e slot ou paciente de outra UBS', async () => {
        const c = await montarCenario()
        const passado = await c.slot(0, {}, '09:00')
        const outraUbs = await criarUbs('Outra')
        const pacienteDeFora = await criarPaciente(outraUbs.id)
        const slot = await c.slot(10)

        assert.equal((await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: passado.id })).status, 400)
        assert.equal((await api().post('/agendamentos').set('Authorization', authPaciente(pacienteDeFora)).send({ slotId: slot.id })).status, 404)
        assert.equal((await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId: pacienteDeFora.id, slotId: slot.id })).status, 404)
    })

    it('minhas consultas: próximas com ações e histórico, sem dados de selo', async () => {
        const c = await montarCenario()
        const slotFuturo = await c.slot(10)
        const slotOutroTipo = await c.slot(4, { tipoAtendimentoId: c.tipoBalcao.id })
        await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: slotFuturo.id })
        const balcao = await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId: c.paciente.id, slotId: slotOutroTipo.id })
        await AppDataSource.getRepository(Agendamento).update({ id: balcao.body.id }, { status: StatusAgendamento.CANCELADO_PACIENTE })

        const res = await api().get('/agendamentos/meus').set('Authorization', c.authPaciente)

        assert.equal(res.status, 200)
        assert.equal(res.body.proximos.length, 1)
        assert.deepEqual(res.body.proximos[0].acoes, { confirmar: true, cancelar: true, remarcar: true })
        assert.equal(res.body.proximos[0].ubs.nome, 'UBS Teste')
        assert.equal(res.body.historico.length, 1)
        assert.deepEqual(res.body.historico[0].acoes, { confirmar: false, cancelar: false, remarcar: false })
        assert.doesNotMatch(JSON.stringify(res.body), /vulneravel|pontuacao/)
    })

    it('agenda do dia: a equipe vê os agendamentos do dia com o paciente e o selo (RN-52)', async () => {
        const c = await montarCenario()
        const vulneravel = await criarPaciente(c.ubs.id, { vulneravel: true })
        const s1 = await c.slot(1, {}, '08:00')
        const s2 = await c.slot(1, {}, '09:00')
        const outroDia = await c.slot(2, {}, '09:00')
        for(const [pacienteId, slotId] of [[vulneravel.id, s2.id], [c.paciente.id, s1.id]]) {
            await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId, slotId })
        }
        await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId: (await criarPaciente(c.ubs.id)).id, slotId: outroDia.id })
        const acs = await criarEquipe(c.ubs.id, PerfilEquipe.ACS)

        const res = await api().get('/equipe/agenda?data=2026-11-17').set('Authorization', authEquipe(acs))

        assert.equal(res.status, 200)
        assert.deepEqual(res.body.map((a: any) => a.slotId), [s1.id, s2.id])
        assert.equal(res.body[1].paciente.vulneravel, true)
        assert.equal(res.body[0].status, 'CONFIRMADO')
    })
})
