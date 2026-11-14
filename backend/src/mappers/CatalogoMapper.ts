import { Profissional, TipoAtendimento } from "../models";

export class CatalogoMapper {
    static tipo(t: TipoAtendimento) {
        return {
            id: t.id,
            nome: t.nome,
            categoria: t.categoria,
            duracaoMin: t.duracaoMin,
            antecedenciaMaximaDias: t.antecedenciaMaximaDias,
            permiteAgendamentoApp: t.permiteAgendamentoApp,
            instrucoesPreparo: t.instrucoesPreparo
        }
    }

    static profissional(p: Profissional) {
        return { id: p.id, nome: p.nome, funcao: p.funcao }
    }
}
