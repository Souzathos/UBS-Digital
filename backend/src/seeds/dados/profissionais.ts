import { CategoriaAtendimento } from "../../models/enums";
import { ChaveTipo } from "./tiposAtendimento";

const { CONSULTA, PROCEDIMENTO } = CategoriaAtendimento

// Cada profissional tem turnos fixos (horário local). Os horários da agenda recebem os tipos em
// rodízio pela lista `tipos` (repetir um tipo na lista dá mais horários para ele).
// Médicos têm um grupo de ruas: são o médico de referência de quem mora nelas.
export const PROFISSIONAIS: { chave: string, nome: string, funcao: string, categoria: CategoriaAtendimento, turnos: [string, string][], tipos: ChaveTipo[], ruas?: string[] }[] = [
    {
        chave: 'helena', nome: 'Dra. Helena', funcao: 'médico', categoria: CONSULTA,
        turnos: [['08:00', '12:00'], ['13:00', '17:00']],
        tipos: ['clinicaGeral', 'clinicaGeral', 'clinicaGeral', 'retorno', 'hiperdia', 'preNatalMed', 'puericulturaMed', 'receita'],
        ruas: ['Rua das Flores', 'Rua Boa Vista', 'Av. Central (par)']
    },
    {
        chave: 'santos', nome: 'Dra. Santos', funcao: 'médico', categoria: CONSULTA,
        turnos: [['08:00', '12:00'], ['13:00', '17:00']],
        tipos: ['clinicaGeral', 'clinicaGeral', 'clinicaGeral', 'retorno', 'hiperdia', 'preNatalMed', 'puericulturaMed', 'receita'],
        ruas: ['Rua São José', 'Rua Nova', 'Av. Central (ímpar)']
    },
    {
        chave: 'oliveira', nome: 'Dr. Oliveira', funcao: 'médico', categoria: CONSULTA,
        turnos: [['08:00', '12:00'], ['13:00', '17:00']],
        tipos: ['clinicaGeral', 'clinicaGeral', 'clinicaGeral', 'retorno', 'hiperdia', 'preNatalMed', 'puericulturaMed', 'receita'],
        ruas: ['Rua do Comércio', 'Rua Esperança', 'Rua Liberdade']
    },
    {
        chave: 'maria', nome: 'Enf. Maria', funcao: 'enfermeiro', categoria: PROCEDIMENTO,
        turnos: [['08:00', '12:00'], ['13:00', '17:00']],
        tipos: ['curativo', 'medicacao', 'afericao', 'retiradaPontos']
    },
    {
        chave: 'ana', nome: 'Enf. Ana', funcao: 'enfermeiro', categoria: PROCEDIMENTO,
        turnos: [['08:00', '12:00'], ['13:00', '17:00']],
        tipos: ['vacinacao', 'vacinacao', 'puericulturaEnf']
    },
    {
        chave: 'paula', nome: 'Enf. Paula', funcao: 'enfermeiro', categoria: PROCEDIMENTO,
        // Coleta de manhã cedo (jejum); preventivo e pré-natal à tarde
        turnos: [['07:00', '10:00'], ['13:00', '17:00']],
        tipos: ['coleta', 'coleta', 'coleta', 'preventivo', 'preNatalEnf']
    }
]

// Quantos dias corridos de agenda o seed gera a partir de amanhã (só dias úteis entram)
export const DIAS_DE_AGENDA = 30
