import { Canal } from "../../models/enums";
import { cpfComDigitos } from "../../utils/cpf";
import { ChaveTipo } from "./tiposAtendimento";

const { WHATSAPP, SMS } = Canal

// `rua` define o médico de referência (ver profissionais.ts)
export const PACIENTES = [
    // O paciente das telas: Rua das Flores → Dra. Helena. CPF 123.456.789-09
    { nome: 'Osvaldo Menezes', cpf: cpfComDigitos('123456789'), dataNascimento: '1952-05-03', rua: 'Rua das Flores', numero: '210', telefone: '51935921180', email: null, possuiCelular: true, deveTrocarSenha: false, consentimentos: [WHATSAPP, SMS] },
    { nome: 'Maria da Silva', cpf: cpfComDigitos('111222333'), dataNascimento: '1958-03-12', rua: 'Rua Boa Vista', numero: '45', telefone: '51999990001', email: 'maria@exemplo.com', possuiCelular: true, deveTrocarSenha: false, consentimentos: [WHATSAPP, SMS] },
    { nome: 'José Pereira', cpf: cpfComDigitos('222333444'), dataNascimento: '1972-07-30', rua: 'Rua Nova', numero: '1020', telefone: '51999990002', email: null, possuiCelular: true, deveTrocarSenha: false, consentimentos: [SMS] },
    // Sem celular: na Camada 2 será alcançada pelo contato vinculado ou pela equipe
    { nome: 'Antônia Souza', cpf: cpfComDigitos('333444555'), dataNascimento: '1945-11-02', rua: 'Rua do Comércio', numero: '8', telefone: null, email: null, possuiCelular: false, deveTrocarSenha: false, consentimentos: [] },
    { nome: 'Carlos Henrique Oliveira', cpf: cpfComDigitos('444555666'), dataNascimento: '1990-01-15', rua: 'Rua Esperança', numero: '300', telefone: '51999990004', email: 'carlos@exemplo.com', possuiCelular: true, deveTrocarSenha: false, consentimentos: [WHATSAPP, SMS] },
    // Cadastrada hoje pela recepção: ainda com a senha provisória
    { nome: 'Fernanda Rocha', cpf: cpfComDigitos('555666777'), dataNascimento: '1985-09-21', rua: 'Av. Central (ímpar)', numero: '77', telefone: '51999990005', email: null, possuiCelular: true, deveTrocarSenha: true, consentimentos: [WHATSAPP] },
    // Cadastro antigo, sem rua: não agenda consulta médica até a recepção completar o endereço
    { nome: 'Rita Lima', cpf: cpfComDigitos('666777888'), dataNascimento: '1968-04-09', rua: null, numero: null, telefone: '51999990006', email: null, possuiCelular: true, deveTrocarSenha: false, consentimentos: [SMS] }
]

// Índice em PACIENTES, tipo e a partir de quantos dias o seed procura o primeiro horário livre
// (consultas médicas sempre com o médico da rua do paciente)
export const AGENDAMENTOS_DEMO: { paciente: number, tipo: ChaveTipo, emDias: number }[] = [
    { paciente: 0, tipo: 'clinicaGeral', emDias: 15 },  // Osvaldo com a Dra. Helena: recebe D-14, D-7, D-3 e D-0
    { paciente: 2, tipo: 'hiperdia', emDias: 6 },       // José com a Dra. Santos: D-7 já passou, recebe D-3 e D-0 (RN-11)
    { paciente: 4, tipo: 'coleta', emDias: 2 }          // Carlos, coleta de exames: menos de 3 dias, nasce CONFIRMADO (RN-05)
]
