import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { AppDataSource } from "../src/config/dataSource";
import { Agendamento, OrigemAgendamento, StatusAgendamento, TipoAutor } from "../src/models";
import { clearDb, criarPaciente, criarProfissional, criarSlot, criarTipo, criarUbs, startDb, stopDb } from "./helpers";

describe('migrações e restrições do banco (seção 5)', () => {
    before(startDb)
    beforeEach(clearDb)
    after(stopDb)

    it('deixa o banco igual aos modelos', async () => {
        const diff = await AppDataSource.driver.createSchemaBuilder().log()

        assert.deepEqual(diff.upQueries.map(q => q.query), [])
    })

    it('restrição: o banco recusa 2 agendamentos ativos no mesmo slot, mas aceita depois de cancelado', async () => {
        const ubs = await criarUbs()
        const tipo = await criarTipo(ubs.id)
        const profissional = await criarProfissional(ubs.id)
        const slot = await criarSlot(profissional.id, tipo.id, new Date('2026-12-01T09:00:00'))
        const paciente1 = await criarPaciente(ubs.id)
        const paciente2 = await criarPaciente(ubs.id)
        const repo = AppDataSource.getRepository(Agendamento)

        const base = { slotId: slot.id, origem: OrigemAgendamento.RECEPCAO, criadoPorTipo: TipoAutor.EQUIPE, criadoPorId: 1 }
        await repo.save(repo.create({ ...base, pacienteId: paciente1.id, status: StatusAgendamento.PENDENTE }))

        await assert.rejects(
            repo.save(repo.create({ ...base, pacienteId: paciente2.id, status: StatusAgendamento.CONFIRMADO })),
            (error: any) => error.code === '23505' || error.driverError?.code === '23505'
        )

        await repo.update({ pacienteId: paciente1.id }, { status: StatusAgendamento.CANCELADO_PACIENTE })
        await repo.save(repo.create({ ...base, pacienteId: paciente2.id, status: StatusAgendamento.PENDENTE }))

        assert.equal(await repo.countBy({ slotId: slot.id }), 2)
    })

    it('restrição: um profissional não tem dois slots no mesmo horário', async () => {
        const ubs = await criarUbs()
        const tipo = await criarTipo(ubs.id)
        const profissional = await criarProfissional(ubs.id)
        const inicio = new Date('2026-12-01T09:00:00')
        await criarSlot(profissional.id, tipo.id, inicio)

        await assert.rejects(criarSlot(profissional.id, tipo.id, inicio), (error: any) => error.code === '23505' || error.driverError?.code === '23505')
    })
})
