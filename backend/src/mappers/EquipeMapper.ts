import { UsuarioEquipe } from "../models";

export class EquipeMapper {
    static toResponse(u: UsuarioEquipe) {
        return { id: u.id, ubsId: u.ubsId, nome: u.nome, email: u.email, perfil: u.perfil }
    }
}
