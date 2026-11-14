import { Agendamento } from "./Agendamento";
import { AlertaEquipe } from "./AlertaEquipe";
import { Configuracao } from "./Configuracao";
import { ContatoVinculado } from "./ContatoVinculado";
import { EventoPontuacao } from "./EventoPontuacao";
import { LinkToken } from "./LinkToken";
import { LogAcao } from "./LogAcao";
import { Notificacao } from "./Notificacao";
import { OfertaAdiantamento } from "./OfertaAdiantamento";
import { Paciente } from "./Paciente";
import { Profissional } from "./Profissional";
import { Rua } from "./Rua";
import { Slot } from "./Slot";
import { Suplente } from "./Suplente";
import { TipoAtendimento } from "./TipoAtendimento";
import { Ubs } from "./Ubs";
import { UsuarioEquipe } from "./UsuarioEquipe";

// As 16 entidades da seção 5 + Rua (14/11), registradas no DataSource
export const entidades = [
    Ubs, UsuarioEquipe, Profissional, TipoAtendimento, Slot, Paciente, ContatoVinculado,
    Agendamento, Notificacao, LinkToken, OfertaAdiantamento, Suplente, EventoPontuacao,
    AlertaEquipe, LogAcao, Configuracao, Rua
]

export {
    Ubs, UsuarioEquipe, Profissional, TipoAtendimento, Slot, Paciente, ContatoVinculado,
    Agendamento, Notificacao, LinkToken, OfertaAdiantamento, Suplente, EventoPontuacao,
    AlertaEquipe, LogAcao, Configuracao, Rua
}
export * from './enums'
