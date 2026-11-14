import { Paciente } from "../models";

export class PacienteMapper {
    // O que o próprio paciente vê. RN-52: o selo de vulnerável nunca sai aqui; a pontuação também não
    // aparece como número (seção 6).
    static paraPaciente(p: Paciente) {
        return {
            id: p.id,
            ubsId: p.ubsId,
            nome: p.nome,
            cpf: p.cpf,
            cns: p.cns,
            dataNascimento: p.dataNascimento,
            rua: p.rua ? { id: p.rua.id, nome: p.rua.nome } : null,
            numero: p.numero,
            // "Seu médico: Dra. Helena (pela sua rua)"
            medicoReferencia: p.rua?.medicoReferencia ? { id: p.rua.medicoReferencia.id, nome: p.rua.medicoReferencia.nome } : null,
            telefone: p.telefone,
            email: p.email,
            possuiCelular: p.possuiCelular,
            consentimentoCanais: p.consentimentoCanais,
            deveTrocarSenha: p.deveTrocarSenha
        }
    }

    // O que a equipe da UBS vê no painel: inclui selo e pontuação (RN-52)
    static paraEquipe(p: Paciente) {
        return {
            ...PacienteMapper.paraPaciente(p),
            pontuacao: p.pontuacao,
            vulneravel: p.vulneravel,
            vulneravelEm: p.vulneravelEm
        }
    }
}
