import { Ubs } from "../models";

export class UbsMapper {
    static toResponse(u: Ubs) {
        return { id: u.id, nome: u.nome, endereco: u.endereco, telefone: u.telefone }
    }
}
