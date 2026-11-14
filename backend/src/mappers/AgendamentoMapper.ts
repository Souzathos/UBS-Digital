import { Agendamento } from "../models";
import { AcoesDisponiveis } from "../services/AgendamentoService";

export class AgendamentoMapper {
    // O que o paciente vê no app. RN-52: nada de selo nem pontuação.
    static paraPaciente(a: Agendamento, acoes: AcoesDisponiveis) {
        return {
            id: a.id,
            status: a.status,
            origem: a.origem,
            inicio: a.slot.inicio,
            fim: a.slot.fim,
            remarcadoDeId: a.remarcadoDeId,
            confirmadoEm: a.confirmadoEm,
            canceladoEm: a.canceladoEm,
            criadoEm: a.criadoEm,
            tipoAtendimento: {
                id: a.slot.tipoAtendimento.id,
                nome: a.slot.tipoAtendimento.nome,
                categoria: a.slot.tipoAtendimento.categoria,
                instrucoesPreparo: a.slot.tipoAtendimento.instrucoesPreparo
            },
            profissional: { id: a.slot.profissional.id, nome: a.slot.profissional.nome, funcao: a.slot.profissional.funcao },
            ubs: { nome: a.paciente.ubs.nome, endereco: a.paciente.ubs.endereco, telefone: a.paciente.ubs.telefone },
            acoes
        }
    }

    // Painel da UBS: inclui o paciente (com o selo, RN-52) e a trilha de quem criou/cancelou
    static paraEquipe(a: Agendamento, acoes: AcoesDisponiveis) {
        return {
            ...AgendamentoMapper.paraPaciente(a, acoes),
            slotId: a.slotId,
            criadoPorTipo: a.criadoPorTipo,
            canceladoPorTipo: a.canceladoPorTipo,
            presencaRegistradaEm: a.presencaRegistradaEm,
            paciente: { id: a.paciente.id, nome: a.paciente.nome, cpf: a.paciente.cpf, telefone: a.paciente.telefone, vulneravel: a.paciente.vulneravel }
        }
    }
}
