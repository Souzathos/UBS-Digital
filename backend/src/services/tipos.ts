import { Canal, TipoAutor } from "../models/enums";

// De onde veio a ação: app (paciente/contato), painel da UBS, página do link ou o próprio sistema (jobs)
export type Via = 'APP' | 'PAINEL' | 'LINK' | 'SISTEMA'

// RN-82: quem fez a ação. `canal` só existe quando a ação veio de uma mensagem (Camada 3).
export interface Autor {
    tipo: TipoAutor
    id: number | null
    via: Via
    canal?: Canal | null
}
