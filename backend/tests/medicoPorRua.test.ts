import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { AppDataSource } from "../src/config/dataSource";
import { relogioAjustavel } from "../src/clock";
import { jobRunner } from "../src/jobs";
import { avancarRelogioRodandoJobs } from "../src/jobs/relogioDev";
import { CategoriaAtendimento, OrigemSlot, PerfilEquipe } from "../src/models";
import { caixaDeSaida } from "../src/notifications/adapters/MockAdapter";
import { cpfComDigitos } from "../src/utils/cpf";
import { api, authEquipe, authPaciente, clearDb, criarEquipe, criarPaciente, criarProfissional, criarRua, criarSlot, criarTipo, emDias, montarCenario, startDb, stopDb, zerarRelogio } from "./helpers";

const DIA = 24 * 60 * 60 * 1000

// Cenário-base + um segundo médico (de outra área) com horários da mesma consulta e uma enfermeira
async function cenarioComDuasAreas() {
    const c = await montarCenario()
    const outroMedico = await criarProfissional(c.ubs.id, { nome: 'Dr. Oliveira' })
    const ruaDoOutro = await criarRua(c.ubs.id, outroMedico.id, 'Rua do Comércio')
    const enfermeira = await criarProfissional(c.ubs.id, { nome: 'Enf. Paula', funcao: 'enfermeiro', categoria: CategoriaAtendimento.PROCEDIMENTO })
    const coleta = await criarTipo(c.ubs.id, { nome: 'Coleta de exames', categoria: CategoriaAtendimento.PROCEDIMENTO, instrucoesPreparo: 'Jejum de 8 horas.' })
    return {
        ...c, outroMedico, ruaDoOutro, enfermeira, coleta,
        slotDoMeuMedico: (dias: number, hora = '09:00') => c.slot(dias, {}, hora),
        slotDoOutroMedico: (dias: number, hora = '09:00') => criarSlot(outroMedico.id, c.tipoApp.id, emDias(dias, hora)),
        slotDeColeta: (dias: number, hora = '07:00') => criarSlot(enfermeira.id, coleta.id, emDias(dias, hora))
    }
}

describe('consulta médica com o médico da rua do paciente (decisão de 14/11)', () => {
    before(startDb)
    beforeEach(async () => {
        await clearDb()
        caixaDeSaida.limpar()
    })
    afterEach(zerarRelogio)
    after(stopDb)

    it('consulta médica só com o médico da rua, pelo app e pela recepção', async () => {
        const c = await cenarioComDuasAreas()
        const doOutro = await c.slotDoOutroMedico(10)
        const doMeu = await c.slotDoMeuMedico(10, '10:00')

        const app = await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: doOutro.id })
        assert.equal(app.status, 403)
        assert.match(app.body.message, /médico da sua rua/)

        const recepcao = await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId: c.paciente.id, slotId: doOutro.id })
        assert.equal(recepcao.status, 403)

        const certo = await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: doMeu.id })
        assert.equal(certo.status, 201)
        assert.equal(certo.body.profissional.nome, 'Dra. Helena')
        assert.equal(certo.body.tipoAtendimento.categoria, 'CONSULTA')
    })

    it('paciente sem rua não agenda consulta médica, mas agenda procedimento de enfermagem', async () => {
        const c = await cenarioComDuasAreas()
        const semRua = await criarPaciente(c.ubs.id, { ruaId: null, numero: null })
        const consulta = await c.slotDoMeuMedico(10)
        const coleta = await c.slotDeColeta(10)

        const res = await api().post('/agendamentos').set('Authorization', authPaciente(semRua)).send({ slotId: consulta.id })
        assert.equal(res.status, 400)
        assert.equal(res.body.message, 'Cadastre a rua do paciente na recepção para agendar consulta médica')

        const lista = await api().get(`/slots?tipoAtendimentoId=${c.tipoApp.id}`).set('Authorization', authPaciente(semRua))
        assert.equal(lista.status, 400)

        const procedimento = await api().post('/agendamentos').set('Authorization', authPaciente(semRua)).send({ slotId: coleta.id })
        assert.equal(procedimento.status, 201)
        assert.equal(procedimento.body.tipoAtendimento.categoria, 'PROCEDIMENTO')
        assert.equal(procedimento.body.profissional.nome, 'Enf. Paula')
    })

    it('a lista de horários do paciente mostra só o médico dele; procedimentos mostram todos', async () => {
        const c = await cenarioComDuasAreas()
        const doMeu = await c.slotDoMeuMedico(10)
        await c.slotDoOutroMedico(10)
        const coleta = await c.slotDeColeta(10)

        const consultas = await api().get(`/slots?tipoAtendimentoId=${c.tipoApp.id}`).set('Authorization', c.authPaciente)
        assert.deepEqual(consultas.body.map((s: any) => s.id), [doMeu.id])

        const deOutroMedico = await api().get(`/slots?tipoAtendimentoId=${c.tipoApp.id}&profissionalId=${c.outroMedico.id}`).set('Authorization', c.authPaciente)
        assert.deepEqual(deOutroMedico.body, [])

        const procedimentos = await api().get(`/slots?tipoAtendimentoId=${c.coleta.id}`).set('Authorization', c.authPaciente)
        assert.deepEqual(procedimentos.body.map((s: any) => s.id), [coleta.id])
    })

    it('agendar pela recepção: com o paciente escolhido, só os horários do médico da área (inclusive os de balcão)', async () => {
        const c = await cenarioComDuasAreas()
        const doMeu = await c.slotDoMeuMedico(10)
        const doMeuBalcao = await c.slot(10, { origem: OrigemSlot.RECEPCAO }, '10:00')
        await c.slotDoOutroMedico(10)

        const res = await api().get(`/slots?tipoAtendimentoId=${c.tipoApp.id}&pacienteId=${c.paciente.id}`).set('Authorization', c.authRecepcao)
        assert.deepEqual(res.body.map((s: any) => s.id), [doMeu.id, doMeuBalcao.id])

        const semTipo = await api().get(`/slots?pacienteId=${c.paciente.id}`).set('Authorization', c.authRecepcao)
        assert.equal(semTipo.status, 400)
    })

    it('remarcar consulta médica mantém o médico da área', async () => {
        const c = await cenarioComDuasAreas()
        const atual = await c.slotDoMeuMedico(20)
        const agendado = await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: atual.id })
        const doOutro = await c.slotDoOutroMedico(10)
        const doMeu = await c.slotDoMeuMedico(12)

        const errado = await api().post(`/agendamentos/${agendado.body.id}/remarcar`).set('Authorization', c.authPaciente).send({ slotId: doOutro.id })
        assert.equal(errado.status, 403)

        const certo = await api().post(`/agendamentos/${agendado.body.id}/remarcar`).set('Authorization', c.authPaciente).send({ slotId: doMeu.id })
        assert.equal(certo.status, 200)
    })

    it('lote de horários recusa enfermeira em consulta e médico em procedimento', async () => {
        const c = await cenarioComDuasAreas()
        const lote = { dataInicio: '2026-11-17', dataFim: '2026-11-17', horaInicio: '08:00', horaFim: '09:00' }

        const enfermeiraEmConsulta = await api().post('/slots/lote').set('Authorization', c.authRecepcao).send({ ...lote, profissionalId: c.enfermeira.id, tipoAtendimentoId: c.tipoApp.id })
        assert.equal(enfermeiraEmConsulta.status, 400)
        assert.match(enfermeiraEmConsulta.body.message, /Consultas são feitas por médicos/)

        const medicoEmProcedimento = await api().post('/slots/lote').set('Authorization', c.authRecepcao).send({ ...lote, profissionalId: c.profissional.id, tipoAtendimentoId: c.coleta.id })
        assert.equal(medicoEmProcedimento.status, 400)

        const certo = await api().post('/slots/lote').set('Authorization', c.authRecepcao).send({ ...lote, profissionalId: c.enfermeira.id, tipoAtendimentoId: c.coleta.id })
        assert.equal(certo.status, 201)
    })

    it('cadastro exige rua da própria UBS e devolve o médico de referência', async () => {
        const c = await cenarioComDuasAreas()
        const dados = { nome: 'Lucas Teste', cpf: cpfComDigitos('987654321'), dataNascimento: '1990-01-01', numero: '5', possuiCelular: false }

        const semRua = await api().post('/pacientes').set('Authorization', c.authRecepcao).send(dados)
        assert.equal(semRua.status, 400)

        const ruaInexistente = await api().post('/pacientes').set('Authorization', c.authRecepcao).send({ ...dados, ruaId: 9999 })
        assert.equal(ruaInexistente.status, 400)

        const ok = await api().post('/pacientes').set('Authorization', c.authRecepcao).send({ ...dados, ruaId: c.ruaDoOutro.id })
        assert.equal(ok.status, 201)
        assert.equal(ok.body.paciente.medicoReferencia.nome, 'Dr. Oliveira')
        assert.equal(ok.body.paciente.numero, '5')
    })

    it('GET /ruas lista as ruas com o médico de referência (só equipe)', async () => {
        const c = await cenarioComDuasAreas()

        const res = await api().get('/ruas').set('Authorization', c.authRecepcao)
        assert.deepEqual(res.body.map((r: any) => [r.nome, r.medicoReferencia.nome]), [['Rua das Flores', 'Dra. Helena'], ['Rua do Comércio', 'Dr. Oliveira']])

        assert.equal((await api().get('/ruas').set('Authorization', c.authPaciente)).status, 403)
    })

    it('mudança de endereço troca o médico de referência das próximas consultas', async () => {
        const c = await cenarioComDuasAreas()
        const acs = await criarEquipe(c.ubs.id, PerfilEquipe.ACS)

        assert.equal((await api().patch(`/pacientes/${c.paciente.id}/endereco`).set('Authorization', authEquipe(acs)).send({ ruaId: c.ruaDoOutro.id, numero: '8' })).status, 403)

        const res = await api().patch(`/pacientes/${c.paciente.id}/endereco`).set('Authorization', c.authRecepcao).send({ ruaId: c.ruaDoOutro.id, numero: '8' })
        assert.equal(res.status, 200)
        assert.equal(res.body.medicoReferencia.nome, 'Dr. Oliveira')

        const doOutro = await c.slotDoOutroMedico(10)
        const agora = await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: doOutro.id })
        assert.equal(agora.status, 201)

        const eu = await api().get('/auth/eu').set('Authorization', c.authPaciente)
        assert.deepEqual(eu.body.paciente.medicoReferencia, { id: c.outroMedico.id, nome: 'Dr. Oliveira' })
    })

    it('agenda do dia filtra por Médico (CONSULTA) ou Enfermagem (PROCEDIMENTO)', async () => {
        const c = await cenarioComDuasAreas()
        const consulta = await c.slotDoMeuMedico(1, '09:00')
        const coleta = await c.slotDeColeta(1, '07:00')
        for(const slot of [consulta, coleta]) {
            const pacienteId = (await criarPaciente(c.ubs.id)).id
            await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId, slotId: slot.id })
        }

        const medico = await api().get('/equipe/agenda?data=2026-11-17&categoria=CONSULTA').set('Authorization', c.authRecepcao)
        const enfermagem = await api().get('/equipe/agenda?data=2026-11-17&categoria=PROCEDIMENTO').set('Authorization', c.authRecepcao)
        const todos = await api().get('/equipe/agenda?data=2026-11-17').set('Authorization', c.authRecepcao)

        assert.deepEqual(medico.body.map((a: any) => a.slotId), [consulta.id])
        assert.deepEqual(enfermagem.body.map((a: any) => a.slotId), [coleta.id])
        assert.equal(todos.body.length, 2)
    })
})

describe('canais de aviso no Perfil do paciente (RN-80)', () => {
    before(startDb)
    beforeEach(async () => {
        await clearDb()
        caixaDeSaida.limpar()
    })
    afterEach(zerarRelogio)
    after(stopDb)

    it('RN-80: liga e desliga canais, registrando a data; canal desligado não é mais usado', async () => {
        const c = await montarCenario()
        const slot = await c.slot(5)
        await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: slot.id })

        const res = await api().patch('/auth/paciente/canais').set('Authorization', c.authPaciente).send({ canais: ['SMS'] })

        assert.equal(res.status, 200)
        assert.equal(res.body.consentimentoCanais.SMS.aceito, true)
        assert.equal(res.body.consentimentoCanais.SMS.em, '2026-01-01T00:00:00.000Z')
        assert.deepEqual(res.body.consentimentoCanais.WHATSAPP, { aceito: false, em: new Date('2026-11-16T10:00:00').toISOString() })

        await avancarRelogioRodandoJobs(relogioAjustavel!, jobRunner, 2 * DIA)
        const [envio] = caixaDeSaida.listar()
        assert.equal(envio.canal, 'SMS')

        const invalido = await api().patch('/auth/paciente/canais').set('Authorization', c.authPaciente).send({ canais: ['FAX'] })
        assert.equal(invalido.status, 400)
        assert.equal((await api().patch('/auth/paciente/canais').set('Authorization', c.authRecepcao).send({ canais: [] })).status, 403)
    })

    it('RN-80: push desligado não é usado mesmo com o app instalado', async () => {
        const c = await montarCenario()
        await AppDataSource.query(`UPDATE paciente SET "pushToken" = 'token-fcm' WHERE id = $1`, [c.paciente.id])
        const slot = await c.slot(5)
        await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: slot.id })
        await api().patch('/auth/paciente/canais').set('Authorization', c.authPaciente).send({ canais: ['WHATSAPP'] })

        await avancarRelogioRodandoJobs(relogioAjustavel!, jobRunner, 2 * DIA)

        assert.equal(caixaDeSaida.listar()[0].canal, 'WHATSAPP')
    })
})
