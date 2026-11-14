import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { AppDataSource } from "../src/config/dataSource";
import { Agendamento, Configuracao, Notificacao, OrigemSlot, Paciente, Profissional, Slot } from "../src/models";
import { executarSeed } from "../src/seeds/seed";
import { CONFIGURACAO_PADRAO } from "../src/seeds/dados/configuracao";
import { SlotService } from "../src/services/SlotService";
import { clearDb, startDb, stopDb } from "./helpers";

describe('seed de demonstração (seções 5 e 7)', () => {
    before(startDb)
    beforeEach(clearDb)
    after(stopDb)

    it('seção 7: grava as 15 chaves de configuração como padrão global', async () => {
        await executarSeed(AppDataSource, new Date('2026-11-13T10:00:00'))

        const configuracoes = await AppDataSource.getRepository(Configuracao).find()
        assert.equal(configuracoes.length, 15)
        assert.equal(Object.keys(CONFIGURACAO_PADRAO).length, 15)
        assert.ok(configuracoes.every(c => c.ubsId === null))

        const etapas = configuracoes.find(c => c.chave === 'lembrete.etapasDias')
        assert.deepEqual(JSON.parse(etapas!.valor), [14, 7, 3, 0])
    })

    it('RN-02: cada profissional tem 40% dos slots na cota do app, espalhados pela agenda', async () => {
        await executarSeed(AppDataSource, new Date('2026-11-13T10:00:00'))

        const profissionais = await AppDataSource.getRepository(Profissional).find()
        assert.equal(profissionais.length, 6)

        for(const profissional of profissionais) {
            const slots = await AppDataSource.getRepository(Slot).find({ where: { profissionalId: profissional.id }, order: { inicio: 'ASC' } })
            const app = slots.filter(s => s.origem === OrigemSlot.APP).length
            assert.equal(app, Math.round(slots.length * 0.4), `profissional ${profissional.nome}`)

            // Espalhado: nos 5 primeiros slots já aparecem 2 do app
            assert.equal(slots.slice(0, 5).filter(s => s.origem === OrigemSlot.APP).length, 2)
        }
    })

    it('seed: slots só em dias úteis, a partir do dia seguinte, e pacientes com pontuação inicial', async () => {
        // 13/11/2026 é sexta: o primeiro slot deve cair na segunda 16/11
        await executarSeed(AppDataSource, new Date('2026-11-13T10:00:00'))

        const primeiro = await AppDataSource.getRepository(Slot).findOne({ where: {}, order: { inicio: 'ASC' } })
        assert.equal(primeiro!.inicio.getDay(), 1)
        assert.equal(primeiro!.inicio.getDate(), 16)

        const pacientes = await AppDataSource.getRepository(Paciente).find()
        assert.equal(pacientes.length, 7)
        assert.ok(pacientes.every(p => p.pontuacao === 100))
        assert.equal(pacientes.filter(p => p.deveTrocarSenha).length, 1)
    })

    it('seed: 3 agendamentos de demonstração passam pelas regras e geram os lembretes (RN-05, RN-10, RN-11)', async () => {
        const resumo = await executarSeed(AppDataSource, new Date('2026-11-13T10:00:00'))
        assert.equal(resumo.agendamentosDemo, 3)

        const agendamentos = await AppDataSource.getRepository(Agendamento).find({ relations: { paciente: true }, order: { id: 'ASC' } })
        assert.deepEqual(agendamentos.map(a => a.paciente.nome), ['Osvaldo Menezes', 'José Pereira', 'Carlos Henrique Oliveira'])
        assert.deepEqual(agendamentos.map(a => a.status), ['PENDENTE', 'PENDENTE', 'CONFIRMADO'])

        const etapas = async (id: number) => (await AppDataSource.getRepository(Notificacao).find({ where: { agendamentoId: id }, order: { agendadaPara: 'ASC' } })).map(n => n.etapa)
        assert.deepEqual(await etapas(agendamentos[0].id), ['D14', 'D7', 'D3', 'D0'])
        assert.deepEqual(await etapas(agendamentos[1].id), ['D3', 'D0'])
    })

    it('seed: 9 ruas com médico de referência; Osvaldo mora na Rua das Flores e a consulta dele é com a Dra. Helena', async () => {
        const resumo = await executarSeed(AppDataSource, new Date('2026-11-13T10:00:00'))
        assert.equal(resumo.ruas, 9)
        assert.equal(resumo.tipos, 15)

        const osvaldo = await AppDataSource.getRepository(Paciente).findOneOrFail({ where: { nome: 'Osvaldo Menezes' }, relations: { rua: { medicoReferencia: true } } })
        assert.equal(osvaldo.cpf, '12345678909')
        assert.equal(osvaldo.rua!.nome, 'Rua das Flores')
        assert.equal(osvaldo.rua!.medicoReferencia.nome, 'Dra. Helena')

        const consulta = await AppDataSource.getRepository(Agendamento).findOneOrFail({ where: { pacienteId: osvaldo.id }, relations: { slot: { profissional: true, tipoAtendimento: true } } })
        assert.equal(consulta.slot.profissional.nome, 'Dra. Helena')
        assert.equal(consulta.slot.tipoAtendimento.nome, 'Consulta clínica geral')

        // Médico só tem horários de consultas; enfermagem só de procedimentos
        const misturados = await AppDataSource.query(`SELECT count(*)::int AS n FROM slot s JOIN profissional p ON p.id = s."profissionalId" JOIN tipo_atendimento t ON t.id = s."tipoAtendimentoId" WHERE p.categoria::text <> t.categoria::text`)
        assert.equal(misturados[0].n, 0)
    })

    it('RN-02: marcarCota distribui exatamente o percentual pedido', () => {
        const dez = SlotService.marcarCota(10, 40)
        assert.equal(dez.filter(o => o === OrigemSlot.APP).length, 4)
        assert.deepEqual(dez.map(o => o === OrigemSlot.APP ? 1 : 0), [0, 0, 1, 0, 1, 0, 0, 1, 0, 1])

        assert.equal(SlotService.marcarCota(7, 40).filter(o => o === OrigemSlot.APP).length, 3)
        assert.equal(SlotService.marcarCota(0, 40).length, 0)
        assert.equal(SlotService.marcarCota(5, 0).filter(o => o === OrigemSlot.APP).length, 0)
        assert.equal(SlotService.marcarCota(5, 100).filter(o => o === OrigemSlot.APP).length, 5)
    })
})
