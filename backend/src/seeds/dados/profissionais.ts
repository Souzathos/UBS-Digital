import { ChaveTipo } from "./tiposAtendimento";

// Cada profissional atende um tipo, em turnos fixos (horário local)
export const PROFISSIONAIS: { nome: string, funcao: string, tipo: ChaveTipo, turnos: [string, string][] }[] = [
    { nome: 'Dra. Ana Lima', funcao: 'médico', tipo: 'consultaMedica', turnos: [['08:00', '12:00'], ['13:00', '17:00']] },
    { nome: 'Dr. Bruno Costa', funcao: 'dentista', tipo: 'consultaOdonto', turnos: [['08:00', '12:00'], ['13:00', '17:00']] },
    { nome: 'Carlos Enfermeiro', funcao: 'enfermeiro', tipo: 'enfermagem', turnos: [['08:00', '12:00'], ['13:00', '17:00']] },
    { nome: 'Lúcia Técnica', funcao: 'técnico', tipo: 'exameSangue', turnos: [['07:00', '10:00']] }
]

// Quantos dias corridos de agenda o seed gera a partir de amanhã (só dias úteis entram)
export const DIAS_DE_AGENDA = 30
