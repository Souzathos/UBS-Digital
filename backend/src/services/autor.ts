import { TipoAutor } from "../models/enums";
import { SessaoEquipe, SessaoPaciente } from "../utils/jwt";
import { Autor } from "./tipos";

// Monta o autor (RN-82) a partir de quem está logado
export function autorPaciente(sessao: SessaoPaciente): Autor {
    return { tipo: TipoAutor.PACIENTE, id: sessao.id, via: 'APP' }
}

export function autorEquipe(sessao: SessaoEquipe): Autor {
    return { tipo: TipoAutor.EQUIPE, id: sessao.id, via: 'PAINEL' }
}
