import { cpfComDigitos } from "../../utils/cpf";

export const PACIENTES = [
    { nome: 'Maria da Silva', cpf: cpfComDigitos('111222333'), dataNascimento: '1958-03-12', telefone: '51999990001', email: 'maria@exemplo.com', possuiCelular: true, deveTrocarSenha: false },
    { nome: 'José Pereira', cpf: cpfComDigitos('222333444'), dataNascimento: '1972-07-30', telefone: '51999990002', email: null, possuiCelular: true, deveTrocarSenha: false },
    { nome: 'Antônia Souza', cpf: cpfComDigitos('333444555'), dataNascimento: '1945-11-02', telefone: null, email: null, possuiCelular: false, deveTrocarSenha: false },
    { nome: 'Carlos Henrique Oliveira', cpf: cpfComDigitos('444555666'), dataNascimento: '1990-01-15', telefone: '51999990004', email: 'carlos@exemplo.com', possuiCelular: true, deveTrocarSenha: false },
    // Cadastrada hoje pela recepção: ainda com a senha provisória
    { nome: 'Fernanda Rocha', cpf: cpfComDigitos('555666777'), dataNascimento: '1985-09-21', telefone: '51999990005', email: null, possuiCelular: true, deveTrocarSenha: true }
]
