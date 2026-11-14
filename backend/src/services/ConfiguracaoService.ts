import { EntityManager, IsNull } from "typeorm";
import { AppDataSource } from "../config/dataSource";
import { BadRequestError } from "../errors";
import { Configuracao } from "../models";
import { CHAVES_CONFIGURACAO, ChaveConfiguracao, ValorConfiguracao } from "./configuracaoChaves";

// Seção 7: toda regra numérica vem da tabela Configuracao, com padrão global (ubsId nulo) e
// sobrescrita por UBS. Não há valor padrão no código: chave ausente é erro de instalação (rode o seed).
// Sem cache de propósito: são leituras por chave indexada e assim uma mudança do gestor vale na hora.
export class ConfiguracaoService {
    constructor(private readonly manager: EntityManager = AppDataSource.manager) {}

    async get<K extends ChaveConfiguracao>(chave: K, ubsId?: number | null): Promise<ValorConfiguracao<K>> {
        const repo = this.manager.getRepository(Configuracao)

        const linha = (ubsId ? await repo.findOneBy({ chave, ubsId }) : null)
            ?? await repo.findOneBy({ chave, ubsId: IsNull() })

        if(!linha) throw new Error(`Configuração "${chave}" ausente na tabela Configuracao (rode o seed)`)

        let bruto: unknown
        try {
            bruto = JSON.parse(linha.valor)
        } catch {
            throw new Error(`Configuração "${chave}" com JSON inválido: ${linha.valor}`)
        }

        const resultado = CHAVES_CONFIGURACAO[chave].safeParse(bruto)
        if(!resultado.success) throw new Error(`Configuração "${chave}" com valor inválido: ${linha.valor}`)

        return resultado.data as ValorConfiguracao<K>
    }

    // Grava o valor global (ubsId nulo) ou a sobrescrita de uma UBS, validando o formato
    async set<K extends ChaveConfiguracao>(chave: K, valor: ValorConfiguracao<K>, ubsId?: number | null) {
        const resultado = CHAVES_CONFIGURACAO[chave].safeParse(valor)
        if(!resultado.success) throw new BadRequestError(`Valor inválido para "${chave}"`)

        const repo = this.manager.getRepository(Configuracao)
        const existente = await repo.findOneBy({ chave, ubsId: ubsId ?? IsNull() })
        const linha = existente ?? repo.create({ chave, ubsId: ubsId ?? null })
        linha.valor = JSON.stringify(resultado.data)

        return repo.save(linha)
    }

    // Remove a sobrescrita da UBS, voltando a valer o global
    async removerSobrescrita(chave: ChaveConfiguracao, ubsId: number) {
        await this.manager.getRepository(Configuracao).delete({ chave, ubsId })
    }
}
