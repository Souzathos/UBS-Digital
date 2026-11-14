import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { AppDataSource } from "../src/config/dataSource";
import { Configuracao } from "../src/models";
import { ConfiguracaoService } from "../src/services/ConfiguracaoService";
import { CHAVES_CONFIGURACAO } from "../src/services/configuracaoChaves";
import { CONFIGURACAO_PADRAO } from "../src/seeds/dados/configuracao";
import { clearDb, criarUbs, semearConfiguracao, startDb, stopDb } from "./helpers";

describe('ConfiguracaoService (seção 7)', () => {
    before(startDb)
    beforeEach(clearDb)
    after(stopDb)

    it('seção 7: os 15 padrões do seed passam na validação de cada chave', () => {
        assert.equal(Object.keys(CHAVES_CONFIGURACAO).length, 15)
        for(const [chave, valor] of Object.entries(CONFIGURACAO_PADRAO)) {
            assert.ok(CHAVES_CONFIGURACAO[chave as keyof typeof CHAVES_CONFIGURACAO].safeParse(valor).success, chave)
        }
    })

    it('seção 7: lê o valor global quando a UBS não sobrescreve', async () => {
        await semearConfiguracao()
        const ubs = await criarUbs()
        const config = new ConfiguracaoService()

        assert.equal(await config.get('agendamento.cotaAppPercentual', ubs.id), 40)
        assert.deepEqual(await config.get('lembrete.etapasDias'), [14, 7, 3, 0])
        assert.deepEqual(await config.get('oferta.prazoAceite'), { maisDe72h: 24, de24a72h: 4, menosDe24h: 1 })
    })

    it('seção 7: valor da UBS sobrescreve o global só para aquela UBS', async () => {
        await semearConfiguracao()
        const ubsA = await criarUbs('UBS A')
        const ubsB = await criarUbs('UBS B')
        const config = new ConfiguracaoService()

        await config.set('agendamento.cotaAppPercentual', 60, ubsA.id)

        assert.equal(await config.get('agendamento.cotaAppPercentual', ubsA.id), 60)
        assert.equal(await config.get('agendamento.cotaAppPercentual', ubsB.id), 40)
        assert.equal(await config.get('agendamento.cotaAppPercentual'), 40)

        await config.removerSobrescrita('agendamento.cotaAppPercentual', ubsA.id)
        assert.equal(await config.get('agendamento.cotaAppPercentual', ubsA.id), 40)
    })

    it('seção 7: set atualiza o global sem duplicar a linha', async () => {
        await semearConfiguracao()
        const config = new ConfiguracaoService()

        await config.set('lembrete.d0Hora', '06:30')

        assert.equal(await config.get('lembrete.d0Hora'), '06:30')
        assert.equal(await AppDataSource.getRepository(Configuracao).countBy({ chave: 'lembrete.d0Hora' }), 1)
    })

    it('seção 7: chave ausente lança erro (não há padrão fixo no código)', async () => {
        await assert.rejects(new ConfiguracaoService().get('pontos.inicial'), /ausente/)
    })

    it('seção 7: valor malformado no banco lança erro e set recusa formato errado', async () => {
        const repo = AppDataSource.getRepository(Configuracao)
        await repo.save(repo.create({ chave: 'lembrete.d0Hora', valor: '"25:99"', ubsId: null }))
        const config = new ConfiguracaoService()

        await assert.rejects(config.get('lembrete.d0Hora'), /valor inválido/)
        await assert.rejects(config.set('agendamento.cotaAppPercentual', 140), /Valor inválido/)
    })
})
