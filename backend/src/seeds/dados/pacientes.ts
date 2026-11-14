import { Canal } from "../../models/enums";
import { cpfComDigitos } from "../../utils/cpf";
import { ChaveTipo } from "./tiposAtendimento";

export const PACIENTES = [
    { nome: 'Maria da Silva', cpf: cpfComDigitos('111222333'), dataNascimento: '1958-03-12', telefone: '51999990001', email: 'maria@exemplo.com', possuiCelular: true, deveTrocarSenha: false, consentimentos: [Canal.WHATSAPP, Canal.SMS] },
    { nome: 'José Pereira', cpf: cpfComDigitos('222333444'), dataNascimento: '1972-07-30', telefone: '51999990002', email: null, possuiCelular: true, deveTrocarSenha: false, consentimentos: [Canal.SMS] },
    // Sem celular: na Camada 2 será alcançada pelo contato vinculado ou pela equipe
    { nome: 'Antônia Souza', cpf: cpfComDigitos('333444555'), dataNascimento: '1945-11-02', telefone: null, email: null, possuiCelular: false, deveTrocarSenha: false, consentimentos: [] },
    { nome: 'Carlos Henrique Oliveira', cpf: cpfComDigitos('444555666'), dataNascimento: '1990-01-15', telefone: '51999990004', email: 'carlos@exemplo.com', possuiCelular: true, deveTrocarSenha: false, consentimentos: [Canal.WHATSAPP, Canal.SMS] },
    // Cadastrada hoje pela recepção: ainda com a senha provisória
    { nome: 'Fernanda Rocha', cpf: cpfComDigitos('555666777'), dataNascimento: '1985-09-21', telefone: '51999990005', email: null, possuiCelular: true, deveTrocarSenha: true, consentimentos: [Canal.WHATSAPP] }
]

// Índice em PACIENTES, tipo e a partir de quantos dias o seed procura o primeiro horário livre
export const AGENDAMENTOS_DEMO: { paciente: number, tipo: ChaveTipo, emDias: number }[] = [
    { paciente: 0, tipo: 'consultaMedica', emDias: 15 },  // recebe D-14, D-7, D-3 e D-0
    { paciente: 1, tipo: 'consultaOdonto', emDias: 6 },   // D-7 já passou: recebe D-3 e D-0 (RN-11)
    { paciente: 3, tipo: 'exameSangue', emDias: 2 }       // menos de 3 dias: nasce CONFIRMADO (RN-05)
]
