import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { AppDataSource } from "../src/config/dataSource";
import { relogioAjustavel } from "../src/clock";
import { jobRunner } from "../src/jobs";
import { avancarRelogioRodandoJobs } from "../src/jobs/relogioDev";
import { Agendamento, LinkToken, Notificacao, StatusAgendamento } from "../src/models";
import { caixaDeSaida } from "../src/notifications/adapters/MockAdapter";
import { ConfiguracaoService } from "../src/services/ConfiguracaoService";
import { hashToken } from "../src/utils/token";
import { api, authEquipe, clearDb, criarPaciente, criarTipo, montarCenario, startDb, stopDb, zerarRelogio } from "./helpers";

const DIA = 24 * 60 * 60 * 1000

async function agendar(c: Awaited<ReturnType<typeof montarCenario>>, dias: number, dados: { tipoAtendimentoId?: number, pacienteId?: number, hora?: string } = {}) {
    const slot = await c.slot(dias, { tipoAtendimentoId: dados.tipoAtendimentoId ?? c.tipoApp.id }, dados.hora)
    const res = await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId: dados.pacienteId ?? c.paciente.id, slotId: slot.id })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    return res.body
}

async function notificacoesDe(agendamentoId: number) {
    return AppDataSource.getRepository(Notificacao).find({ where: { agendamentoId }, order: { agendadaPara: 'ASC' } })
}

describe('lembretes D-14, D-7, D-3 e D-0 (RN-10 a RN-13, RN-63, RN-70)', () => {
    before(startDb)
    beforeEach(async () => {
        await clearDb()
        caixaDeSaida.limpar()
    })
    afterEach(zerarRelogio)
    after(stopDb)

    it('RN-10: agendado a 20 dias gera D14, D7, D3 e D0 às 07:00 do dia de cada etapa', async () => {
        const c = await montarCenario()
        const agendamento = await agendar(c, 20)

        const notificacoes = await notificacoesDe(agendamento.id)

        assert.deepEqual(notificacoes.map(n => n.etapa), ['D14', 'D7', 'D3', 'D0'])
        assert.ok(notificacoes.every(n => n.status === 'AGENDADA' && n.canal === 'WHATSAPP'))
        // consulta em 06/12 09:00: D-14 = 22/11, D-0 = 06/12, sempre às 07:00
        assert.equal(notificacoes[0].agendadaPara.toISOString(), new Date('2026-11-22T07:00:00').toISOString())
        assert.equal(notificacoes[3].agendadaPara.toISOString(), new Date('2026-12-06T07:00:00').toISOString())
    })

    it('RN-11: agendado a 5 dias recebe só D3 e D0', async () => {
        const c = await montarCenario()
        const agendamento = await agendar(c, 5)

        assert.deepEqual((await notificacoesDe(agendamento.id)).map(n => n.etapa), ['D3', 'D0'])
    })

    it('RN-11: etapa de hoje com a hora passada sai no próximo tick; etapa depois do horário é pulada', async () => {
        const c = await montarCenario()
        // agora é 16/11 10:00. Consulta em 19/11 09:00: o D-3 é hoje às 07:00, que já passou
        const agendamento = await agendar(c, 3)
        const [d3, d0] = await notificacoesDe(agendamento.id)
        assert.equal(d3.etapa, 'D3')
        assert.equal(d3.agendadaPara.toISOString(), new Date('2026-11-16T10:00:00').toISOString())
        assert.equal(d0.etapa, 'D0')

        // Consulta às 06:30: o D-0 (07:00) cairia depois do horário
        await new ConfiguracaoService().set('lembrete.etapasDias', [0])
        const outro = await criarPaciente(c.ubs.id)
        const cedo = await c.slot(4, {}, '06:30')
        const res = await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId: outro.id, slotId: cedo.id })
        assert.deepEqual(await notificacoesDe(res.body.id), [])
    })

    it('seção 7: etapas e horário vêm da configuração da UBS', async () => {
        const c = await montarCenario()
        await new ConfiguracaoService().set('lembrete.etapasDias', [7, 0], c.ubs.id)
        await new ConfiguracaoService().set('lembrete.d0Hora', '06:15', c.ubs.id)

        const notificacoes = await notificacoesDe((await agendar(c, 20)).id)

        assert.deepEqual(notificacoes.map(n => n.etapa), ['D7', 'D0'])
        assert.equal(notificacoes[0].agendadaPara.getHours(), 6)
        assert.equal(notificacoes[0].agendadaPara.getMinutes(), 15)
    })

    it('RN-90: avançar o relógio 20 dias dispara as 4 etapas na ordem, cada uma no seu dia', async () => {
        const c = await montarCenario()
        const agendamento = await agendar(c, 20)

        await jobRunner.rodar()
        assert.equal(caixaDeSaida.listar().length, 0)

        const resultado = await avancarRelogioRodandoJobs(relogioAjustavel!, jobRunner, 20 * DIA)

        assert.equal(resultado.jobs.lembretes.enviados, 4)
        const envios = caixaDeSaida.listar().reverse()
        assert.deepEqual(envios.map(e => e.etapa), ['D14', 'D7', 'D3', 'D0'])
        assert.deepEqual(envios.map(e => e.enviadaEm.getDate()), [22, 29, 3, 6])
        assert.ok(envios.every(e => e.destino === c.paciente.telefone && e.canal === 'WHATSAPP'))

        const notificacoes = await notificacoesDe(agendamento.id)
        assert.ok(notificacoes.every(n => n.status === 'ENVIADA' && n.tentativa === 1 && n.enviadaEm))
    })

    it('RN-10 / RN-12: PENDENTE pede ação; depois de CONFIRMADO o lembrete é só informativo; D-0 nunca pede ação', async () => {
        const c = await montarCenario()
        const agendamento = await agendar(c, 10)

        await avancarRelogioRodandoJobs(relogioAjustavel!, jobRunner, 3 * DIA) // D-7 em 19/11
        const [d7] = caixaDeSaida.listar()
        assert.equal(d7.etapa, 'D7')
        assert.equal(d7.exigeResposta, true)
        assert.match(d7.texto, /Confirme, cancele ou remarque/)

        await AppDataSource.getRepository(Agendamento).update({ id: agendamento.id }, { status: StatusAgendamento.CONFIRMADO })
        await avancarRelogioRodandoJobs(relogioAjustavel!, jobRunner, 7 * DIA)
        const [d0, d3] = caixaDeSaida.listar()
        assert.equal(d3.etapa, 'D3')
        assert.equal(d3.exigeResposta, false)
        assert.doesNotMatch(d3.texto, /Confirme/)
        assert.match(d3.texto, /está confirmada/)
        assert.equal(d0.etapa, 'D0')
        assert.equal(d0.exigeResposta, false)
        assert.match(d0.texto, /Não precisa responder/)
    })

    it('RN-13: tipo com preparo leva as instruções em todos os lembretes', async () => {
        const c = await montarCenario()
        const exame = await criarTipo(c.ubs.id, { nome: 'Exame de sangue', instrucoesPreparo: 'Jejum de 8 horas.' })
        await agendar(c, 20, { tipoAtendimentoId: exame.id })

        await avancarRelogioRodandoJobs(relogioAjustavel!, jobRunner, 20 * DIA)

        const envios = caixaDeSaida.listar()
        assert.equal(envios.length, 4)
        assert.ok(envios.every(e => e.texto.includes('Preparo: Jejum de 8 horas.')))
    })

    it('RN-63 / RN-70 / RN-73: mensagem traz o nome da UBS e o link; o banco guarda só o hash; o token expira no horário', async () => {
        const c = await montarCenario()
        const agendamento = await agendar(c, 5)

        await avancarRelogioRodandoJobs(relogioAjustavel!, jobRunner, 2 * DIA)

        const [envio] = caixaDeSaida.listar()
        assert.match(envio.texto, /^UBS Teste: olá, Paciente/)
        const token = envio.link.match(/\/l\/([A-Za-z0-9_-]+)$/)![1]
        assert.ok(envio.texto.includes(envio.link))

        const tokens = await AppDataSource.getRepository(LinkToken).find()
        assert.equal(tokens.length, 1)
        assert.equal(tokens[0].tokenHash, hashToken(token))
        assert.ok(!JSON.stringify(tokens).includes(token))
        assert.equal(tokens[0].agendamentoId, agendamento.id)
        assert.equal(tokens[0].destinatarioTipo, 'PACIENTE')
        assert.equal(tokens[0].expiraEm.toISOString(), new Date(agendamento.inicio).toISOString())
    })

    it('RN-60 / RN-80: usa o primeiro canal da ordem com consentimento; sem canal, o mock registra sem destino', async () => {
        const c = await montarCenario()
        const soSms = await criarPaciente(c.ubs.id, { consentimentoCanais: { SMS: { aceito: true, em: '2026-01-01T00:00:00Z' } } })
        const semCelular = await criarPaciente(c.ubs.id, { telefone: null, possuiCelular: false, consentimentoCanais: {} })
        const comApp = await criarPaciente(c.ubs.id, { pushToken: 'token-fcm' })
        for(const [i, p] of [soSms, semCelular, comApp].entries()) await agendar(c, 4, { pacienteId: p.id, hora: `1${i}:00` })

        await avancarRelogioRodandoJobs(relogioAjustavel!, jobRunner, 2 * DIA)

        const porPaciente = new Map(caixaDeSaida.listar().map(e => [e.destinatarioId, e]))
        assert.equal(porPaciente.get(soSms.id)!.canal, 'SMS')
        assert.equal(porPaciente.get(semCelular.id)!.destino, null)
        assert.equal(porPaciente.get(comApp.id)!.canal, 'PUSH')
        assert.equal(porPaciente.get(comApp.id)!.destino, 'token-fcm')
    })

    it('lembrete de agendamento que deixou de estar ativo é cancelado em vez de enviado', async () => {
        const c = await montarCenario()
        const agendamento = await agendar(c, 20)
        await AppDataSource.getRepository(Agendamento).update({ id: agendamento.id }, { status: StatusAgendamento.CANCELADO_PACIENTE })

        const resultado = await avancarRelogioRodandoJobs(relogioAjustavel!, jobRunner, 7 * DIA)

        assert.equal(resultado.jobs.lembretes.enviados, 0)
        assert.equal(resultado.jobs.lembretes.cancelados, 1)
        assert.equal(caixaDeSaida.listar().length, 0)
    })

    it('GET /dev/envios mostra a caixa de saída do mock', async () => {
        const c = await montarCenario()
        await agendar(c, 3)
        await jobRunner.rodar()

        const res = await api().get('/dev/envios').set('Authorization', authEquipe(c.recepcao))

        assert.equal(res.status, 200)
        assert.equal(res.body.length, 1)
        assert.equal(res.body[0].etapa, 'D3')
    })
})
