import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { AppDataSource } from "../src/config/dataSource";
import { relogioAjustavel } from "../src/clock";
import { Agendamento, LinkToken, LogAcao, OrigemSlot, TipoAutor, Ubs } from "../src/models";
import { LinkTokenService } from "../src/services/LinkTokenService";
import { api, clearDb, criarPaciente, montarCenario, startDb, stopDb, zerarRelogio } from "./helpers";

type Cenario = Awaited<ReturnType<typeof montarCenario>>

async function agendarComLink(c: Cenario, dias = 10, pacienteId = c.paciente.id) {
    const slot = await c.slot(dias)
    const res = await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId, slotId: slot.id })
    const { token } = await new LinkTokenService().criar(AppDataSource.manager, {
        agendamentoId: res.body.id, destinatarioTipo: TipoAutor.PACIENTE, destinatarioId: pacienteId, expiraEm: slot.inicio
    })
    return { agendamento: res.body, slot, token, base: `/l/${token}` }
}

const logsLink = async (agendamentoId: number) =>
    (await AppDataSource.getRepository(LogAcao).find({ where: { agendamentoId }, order: { id: 'ASC' } })).filter(l => l.detalhes.via === 'LINK')

describe('página do link de ação (RN-70 a RN-73)', () => {
    before(startDb)
    beforeEach(clearDb)
    afterEach(zerarRelogio)
    after(stopDb)

    it('RN-73: a página mostra o nome da UBS, data, hora e, para o paciente, o tipo e o preparo', async () => {
        const c = await montarCenario()
        await AppDataSource.getRepository(Ubs).update({ id: c.ubs.id }, { nome: 'UBS Vila Nova' })
        const { base } = await agendarComLink(c)

        const res = await api().get(base)

        assert.equal(res.status, 200)
        assert.match(res.headers['content-type'], /text\/html/)
        assert.match(res.text, /<p class="ubs">UBS Vila Nova<\/p>/)
        assert.match(res.text, /às 09:00/)
        assert.match(res.text, /Consulta clínica geral/)
        assert.match(res.text, /Confirmar presença/)
        assert.match(res.text, /noindex/)
        assert.doesNotMatch(res.text, /<script/)
    })

    it('RN-70: token desconhecido mostra "link inválido" (404); depois do horário da consulta, "expirou" (410)', async () => {
        const c = await montarCenario()
        const { base } = await agendarComLink(c, 1)

        const invalido = await api().get('/l/abcdefghijklmnopqrstuvwxyz')
        assert.equal(invalido.status, 404)
        assert.match(invalido.text, /Link inválido ou expirado/)

        relogioAjustavel!.avancar(2 * 24 * 60 * 60 * 1000)
        const expirado = await api().get(base)
        assert.equal(expirado.status, 410)
        assert.match(expirado.text, /Este link expirou/)

        const acao = await api().post(`${base}/confirmar`)
        assert.equal(acao.status, 410)
    })

    it('RN-71: confirmar pelo link redireciona (PRG), registra o autor e clicar duas vezes não duplica nada', async () => {
        const c = await montarCenario()
        const { agendamento, base, token } = await agendarComLink(c)

        const primeira = await api().post(`${base}/confirmar`)
        assert.equal(primeira.status, 303)
        assert.equal(primeira.headers.location, `${base}?ok=confirmado`)
        const segunda = await api().post(`${base}/confirmar`)
        assert.equal(segunda.status, 303)

        const pagina = await api().get(`${base}?ok=confirmado`)
        assert.match(pagina.text, /Sua presença está confirmada/)
        assert.match(pagina.text, /Presença confirmada/)
        assert.doesNotMatch(pagina.text, /Confirmar presença/)

        const logs = await logsLink(agendamento.id)
        assert.equal(logs.length, 1)
        assert.equal(logs[0].acao, 'CONFIRMADO')
        assert.equal(logs[0].autorTipo, 'PACIENTE')
        assert.equal(logs[0].autorId, c.paciente.id)

        const link = await AppDataSource.getRepository(LinkToken).findOneByOrFail({ agendamentoId: agendamento.id })
        assert.ok(link.usadoEm)
        assert.ok(!token.includes(link.tokenHash))
    })

    it('RN-21 / RN-71: cancelar pede confirmação; depois a página mostra "já foi cancelada" sem botões', async () => {
        const c = await montarCenario()
        const { agendamento, base } = await agendarComLink(c)

        const tela = await api().get(`${base}/cancelar`)
        assert.match(tela.text, /Cancelar a consulta\?/)
        assert.equal((await AppDataSource.getRepository(Agendamento).findOneByOrFail({ id: agendamento.id })).status, 'PENDENTE')

        const cancelar = await api().post(`${base}/cancelar`)
        assert.equal(cancelar.status, 303)

        const pagina = await api().get(base)
        assert.match(pagina.text, /Esta consulta já foi cancelada/)
        assert.doesNotMatch(pagina.text, /<form/)

        const deNovo = await api().post(`${base}/cancelar`)
        assert.equal(deNovo.status, 303)
        assert.equal((await logsLink(agendamento.id)).length, 1)

        const confirmarDepois = await api().post(`${base}/confirmar`)
        assert.equal(confirmarDepois.status, 409)
        assert.match(confirmarDepois.text, /Esta consulta já foi cancelada/)
    })

    it('RN-22: remarcar pelo link lista só horários do mesmo tipo na cota do app e mostra o novo horário', async () => {
        const c = await montarCenario()
        const { agendamento, base } = await agendarComLink(c, 20)
        const livre = await c.slot(12, {}, '14:00')
        const daRecepcao = await c.slot(12, { origem: OrigemSlot.RECEPCAO }, '15:00')
        const outroTipo = await c.slot(12, { tipoAtendimentoId: c.tipoBalcao.id }, '16:00')

        const tela = await api().get(`${base}/remarcar`)
        assert.match(tela.text, new RegExp(`name="slotId" value="${livre.id}"`))
        for(const s of [daRecepcao, outroTipo]) assert.doesNotMatch(tela.text, new RegExp(`name="slotId" value="${s.id}"`))

        const res = await api().post(`${base}/remarcar`).type('form').send({ slotId: String(livre.id) })
        assert.equal(res.status, 303)

        const pagina = await api().get(`${base}?ok=remarcado`)
        assert.match(pagina.text, /Esta consulta foi remarcada para .* às 14:00/)
        const novo = await AppDataSource.getRepository(Agendamento).findOneByOrFail({ remarcadoDeId: agendamento.id })
        assert.equal(novo.status, 'CONFIRMADO')
        assert.equal(novo.criadoPorTipo, 'PACIENTE')
    })

    it('RN-22: horário que ficou ocupado mostra o erro na própria página (409)', async () => {
        const c = await montarCenario()
        const { base } = await agendarComLink(c, 20)
        const disputado = await c.slot(12, {}, '14:00')
        await api().post('/equipe/agendamentos').set('Authorization', c.authRecepcao).send({ pacienteId: (await criarPaciente(c.ubs.id)).id, slotId: disputado.id })

        const res = await api().post(`${base}/remarcar`).type('form').send({ slotId: String(disputado.id) })

        assert.equal(res.status, 409)
        assert.match(res.text, /Este horário não está mais disponível/)
    })

    it('RN-52 e escape: a página nunca mostra o selo e escapa o HTML dos nomes', async () => {
        const c = await montarCenario()
        const vulneravel = await criarPaciente(c.ubs.id, { vulneravel: true })
        await AppDataSource.getRepository(Ubs).update({ id: c.ubs.id }, { nome: '<script>alert(1)</script>' })
        const { base } = await agendarComLink(c, 10, vulneravel.id)

        const res = await api().get(base)

        assert.doesNotMatch(res.text, /vulner/i)
        assert.doesNotMatch(res.text, /<script>alert/)
        assert.match(res.text, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
    })

    it('aviso só aparece para os códigos conhecidos (nada de texto arbitrário vindo da URL)', async () => {
        const c = await montarCenario()
        const { base } = await agendarComLink(c)

        const res = await api().get(`${base}?ok=${encodeURIComponent('Ligue para 0800 e informe seus dados')}`)

        assert.doesNotMatch(res.text, /0800/)
    })
})
