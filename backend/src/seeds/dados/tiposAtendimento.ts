import { CategoriaAtendimento } from "../../models/enums";

export const TIPOS_ATENDIMENTO = [
    { chave: 'consultaMedica', nome: 'Consulta médica', categoria: CategoriaAtendimento.CONSULTA, duracaoMin: 20, antecedenciaMaximaDias: 60, permiteAgendamentoApp: true, instrucoesPreparo: null },
    { chave: 'consultaOdonto', nome: 'Consulta odontológica', categoria: CategoriaAtendimento.CONSULTA, duracaoMin: 30, antecedenciaMaximaDias: 60, permiteAgendamentoApp: true, instrucoesPreparo: null },
    { chave: 'enfermagem', nome: 'Enfermagem (curativo, vacina)', categoria: CategoriaAtendimento.CONSULTA, duracaoMin: 15, antecedenciaMaximaDias: 30, permiteAgendamentoApp: false, instrucoesPreparo: null },
    // Antecedência de exames: 60 dias até o time definir outro valor (seção 9)
    { chave: 'exameSangue', nome: 'Exame de sangue', categoria: CategoriaAtendimento.EXAME, duracaoMin: 15, antecedenciaMaximaDias: 60, permiteAgendamentoApp: true, instrucoesPreparo: 'Jejum de 8 horas. Leve um documento com foto e o pedido do exame.' }
] as const

export type ChaveTipo = typeof TIPOS_ATENDIMENTO[number]['chave']
