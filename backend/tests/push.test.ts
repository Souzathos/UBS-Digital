import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { AppDataSource } from "../src/config/dataSource";
import { relogioAjustavel } from "../src/clock";
import { jobRunner } from "../src/jobs";
import { avancarRelogioRodandoJobs } from "../src/jobs/relogioDev";
import { Canal, EtapaNotificacao, Paciente, TipoAutor } from "../src/models";
import { ExpoPushAdapter } from "../src/notifications/adapters/ExpoPushAdapter";
import { CaixaDeSaida, caixaDeSaida } from "../src/notifications/adapters/MockAdapter";
import { api, authPaciente, clearDb, criarPaciente, montarCenario, startDb, stopDb, zerarRelogio } from "./helpers";

const DIA = 24 * 60 * 60 * 1000
const TOKEN = 'ExponentPushToken[abc123]'
const pushToken = async (id: number) => (await AppDataSource.getRepository(Paciente).findOneByOrFail({ id })).pushToken

describe('push pelo serviço do Expo (RN-60, RN-80)', () => {
    before(startDb)
    beforeEach(clearDb)
    afterEach(zerarRelogio)
    after(stopDb)

    it('RN-60: o app registra o token do aparelho; null apaga', async () => {
        const c = await montarCenario()

        const res = await api().patch('/auth/paciente/push-token').set('Authorization', c.authPaciente).send({ token: TOKEN })
        assert.equal(res.status, 204)
        assert.equal(await pushToken(c.paciente.id), TOKEN)

        await api().patch('/auth/paciente/push-token').set('Authorization', c.authPaciente).send({ token: null })
        assert.equal(await pushToken(c.paciente.id), null)
    })

    it('token inválido é recusado com mensagem', async () => {
        const c = await montarCenario()
        const res = await api().patch('/auth/paciente/push-token').set('Authorization', c.authPaciente).send({ token: 'qualquer-coisa' })
        assert.equal(res.status, 400)
        assert.equal(res.body.errors[0].mensagem, 'Token de push inválido')
    })

    it('RN-60: no mesmo celular, o token fica só com quem entrou por último', async () => {
        const c = await montarCenario()
        const outro = await criarPaciente(c.ubs.id)
        await api().patch('/auth/paciente/push-token').set('Authorization', c.authPaciente).send({ token: TOKEN })
        await api().patch('/auth/paciente/push-token').set('Authorization', authPaciente(outro)).send({ token: TOKEN })

        assert.equal(await pushToken(c.paciente.id), null)
        assert.equal(await pushToken(outro.id), TOKEN)
    })

    it('RN-60: com token, o lembrete sai por push com título da UBS e texto curto', async () => {
        const c = await montarCenario()
        await api().patch('/auth/paciente/push-token').set('Authorization', c.authPaciente).send({ token: TOKEN })
        const slot = await c.slot(20)
        const ag = await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: slot.id })
        caixaDeSaida.limpar()

        await avancarRelogioRodandoJobs(relogioAjustavel!, jobRunner, 7 * DIA)

        const [envio] = caixaDeSaida.listar()
        assert.equal(envio.canal, Canal.PUSH)
        assert.equal(envio.destino, TOKEN)
        assert.equal(envio.titulo, c.ubs.nome)
        assert.equal(envio.agendamentoId, ag.body.id)
        assert.match(envio.textoCurto!, /^Lembrete: Consulta clínica geral com Dra\. Helena .* Toque para confirmar/)
        assert.ok(!envio.textoCurto!.includes('http'))
    })

    it('RN-80: push desligado no Perfil não é usado, mesmo com token', async () => {
        const c = await montarCenario()
        await api().patch('/auth/paciente/push-token').set('Authorization', c.authPaciente).send({ token: TOKEN })
        await api().patch('/auth/paciente/canais').set('Authorization', c.authPaciente).send({ canais: ['SMS'] })
        const slot = await c.slot(20)
        await api().post('/agendamentos').set('Authorization', c.authPaciente).send({ slotId: slot.id })
        caixaDeSaida.limpar()

        await avancarRelogioRodandoJobs(relogioAjustavel!, jobRunner, 7 * DIA)

        assert.notEqual(caixaDeSaida.listar()[0].canal, Canal.PUSH)
    })

    it('ExpoPushAdapter manda para o serviço do Expo e entende a resposta', async () => {
        const chamadas: { url: string, corpo: Record<string, unknown> }[] = []
        const resposta = (status: number, corpo: unknown) => ({ ok: status < 400, status, json: async () => corpo }) as Response
        const caixa = new CaixaDeSaida()
        const mensagem = {
            notificacaoId: 1, canal: Canal.PUSH, destinatarioTipo: TipoAutor.PACIENTE, destinatarioId: 1, destinatarioNome: 'Osvaldo',
            destino: TOKEN, etapa: EtapaNotificacao.D14, texto: 'longo com link', titulo: 'UBS Feitoria', textoCurto: 'curto',
            agendamentoId: 7, link: 'http://x/l/abc', exigeResposta: true, enviadaEm: new Date()
        }

        const ok = new ExpoPushAdapter(async (url, init) => {
            chamadas.push({ url, corpo: JSON.parse(String(init.body)) })
            return resposta(200, { data: { status: 'ok', id: 'recibo-1' } })
        }, caixa)
        assert.deepEqual(await ok.enviar(mensagem), { ok: true, idExterno: 'recibo-1' })
        assert.equal(chamadas[0].url, 'https://exp.host/--/api/v2/push/send')
        assert.deepEqual(chamadas[0].corpo, { to: TOKEN, title: 'UBS Feitoria', body: 'curto', sound: 'default', data: { agendamentoId: 7, etapa: 'D14', link: 'http://x/l/abc' } })
        assert.equal(caixa.listar().length, 1)

        const recusado = new ExpoPushAdapter(async () => resposta(200, { data: { status: 'error', message: 'DeviceNotRegistered' } }), caixa)
        assert.deepEqual(await recusado.enviar(mensagem), { ok: false, erro: 'DeviceNotRegistered' })
    })
})
