import { Slot } from "../models";

export class SlotMapper {
    static paraPaciente(s: Slot) {
        return {
            id: s.id,
            inicio: s.inicio,
            fim: s.fim,
            profissional: { id: s.profissional.id, nome: s.profissional.nome, funcao: s.profissional.funcao },
            tipoAtendimento: { id: s.tipoAtendimento.id, nome: s.tipoAtendimento.nome }
        }
    }

    // A equipe vê também se o slot é da cota do app (RN-02) e o status
    static paraEquipe(s: Slot) {
        return { ...SlotMapper.paraPaciente(s), origem: s.origem, status: s.status }
    }
}
