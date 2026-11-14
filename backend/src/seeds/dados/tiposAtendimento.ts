import { CategoriaAtendimento } from "../../models/enums";

const { CONSULTA, PROCEDIMENTO } = CategoriaAtendimento

// Médico atende consultas (CONSULTA); enfermagem faz procedimentos (PROCEDIMENTO).
// Quais ficam liberados no app é premissa do seed: o gestor ajusta por tipo.
export const TIPOS_ATENDIMENTO = [
    // Consultas médicas: sempre com o médico da rua do paciente
    { chave: 'clinicaGeral', nome: 'Consulta clínica geral', categoria: CONSULTA, duracaoMin: 20, antecedenciaMaximaDias: 60, permiteAgendamentoApp: true, instrucoesPreparo: null },
    { chave: 'puericulturaMed', nome: 'Puericultura', categoria: CONSULTA, duracaoMin: 20, antecedenciaMaximaDias: 60, permiteAgendamentoApp: true, instrucoesPreparo: null },
    { chave: 'preNatalMed', nome: 'Pré-natal', categoria: CONSULTA, duracaoMin: 20, antecedenciaMaximaDias: 60, permiteAgendamentoApp: true, instrucoesPreparo: null },
    { chave: 'retorno', nome: 'Retorno / acompanhamento', categoria: CONSULTA, duracaoMin: 20, antecedenciaMaximaDias: 60, permiteAgendamentoApp: true, instrucoesPreparo: null },
    { chave: 'receita', nome: 'Renovação de receita', categoria: CONSULTA, duracaoMin: 20, antecedenciaMaximaDias: 60, permiteAgendamentoApp: true, instrucoesPreparo: 'Leve as receitas e os remédios que você usa.' },
    { chave: 'hiperdia', nome: 'Hiperdia', categoria: CONSULTA, duracaoMin: 20, antecedenciaMaximaDias: 60, permiteAgendamentoApp: true, instrucoesPreparo: null },
    // Procedimentos de enfermagem: não dependem da rua
    { chave: 'curativo', nome: 'Curativo', categoria: PROCEDIMENTO, duracaoMin: 20, antecedenciaMaximaDias: 30, permiteAgendamentoApp: false, instrucoesPreparo: null },
    { chave: 'medicacao', nome: 'Administração de medicação', categoria: PROCEDIMENTO, duracaoMin: 20, antecedenciaMaximaDias: 30, permiteAgendamentoApp: false, instrucoesPreparo: 'Leve a receita e o remédio.' },
    { chave: 'afericao', nome: 'Aferição de pressão e glicemia', categoria: PROCEDIMENTO, duracaoMin: 20, antecedenciaMaximaDias: 30, permiteAgendamentoApp: true, instrucoesPreparo: null },
    { chave: 'coleta', nome: 'Coleta de exames', categoria: PROCEDIMENTO, duracaoMin: 20, antecedenciaMaximaDias: 60, permiteAgendamentoApp: true, instrucoesPreparo: 'Jejum de 8 horas. Leve um documento com foto e o pedido do exame.' },
    { chave: 'vacinacao', nome: 'Vacinação', categoria: PROCEDIMENTO, duracaoMin: 20, antecedenciaMaximaDias: 30, permiteAgendamentoApp: true, instrucoesPreparo: 'Leve a carteira de vacinação.' },
    { chave: 'preNatalEnf', nome: 'Pré-natal (enfermagem)', categoria: PROCEDIMENTO, duracaoMin: 20, antecedenciaMaximaDias: 60, permiteAgendamentoApp: false, instrucoesPreparo: null },
    { chave: 'puericulturaEnf', nome: 'Puericultura (enfermagem)', categoria: PROCEDIMENTO, duracaoMin: 20, antecedenciaMaximaDias: 60, permiteAgendamentoApp: false, instrucoesPreparo: null },
    { chave: 'preventivo', nome: 'Preventivo', categoria: PROCEDIMENTO, duracaoMin: 20, antecedenciaMaximaDias: 60, permiteAgendamentoApp: false, instrucoesPreparo: null },
    { chave: 'retiradaPontos', nome: 'Retirada de pontos', categoria: PROCEDIMENTO, duracaoMin: 20, antecedenciaMaximaDias: 30, permiteAgendamentoApp: false, instrucoesPreparo: null }
] as const

export type ChaveTipo = typeof TIPOS_ATENDIMENTO[number]['chave']
