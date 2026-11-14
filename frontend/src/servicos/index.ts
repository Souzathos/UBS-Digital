import { agendamentosApi, type AgendamentosServico } from './agendamentos'
import { authApi, type AuthServico } from './auth'
import { catalogoApi, type CatalogoServico } from './catalogo'
import { devApi, type DevServico } from './dev'
import { agendaEquipeApi, pacientesApi, type AgendaEquipeServico, type PacientesServico } from './equipe'
import type { AlertasServico, AvisosServico, CompromissoServico, FichaCamada2Servico, OfertasEquipeServico, OfertasServico } from './camada2/contratos'
import { alertasFalso, avisosFalso, compromissoFalso, fichaFalsa, ofertasEquipeFalso, ofertasFalso } from './camada2/falsos'

// Registro único dos serviços. As telas e os hooks pedem `servicos.auth`, `servicos.ofertas`…
// e nunca importam uma implementação direto. Quando uma rota da Camada 2 sair no backend, a troca
// do serviço falso pelo real acontece só aqui, numa linha, sem mexer em nenhuma tela.
export type Servicos = {
    auth: AuthServico
    agendamentos: AgendamentosServico
    catalogo: CatalogoServico
    agendaEquipe: AgendaEquipeServico
    pacientes: PacientesServico
    dev: DevServico
    // Camada 2 (dados falsos até as rotas existirem no backend)
    avisos: AvisosServico
    ofertas: OfertasServico
    compromisso: CompromissoServico
    ofertasEquipe: OfertasEquipeServico
    alertas: AlertasServico
    fichaCamada2: FichaCamada2Servico
}

export const servicos: Servicos = {
    auth: authApi,
    agendamentos: agendamentosApi,
    catalogo: catalogoApi,
    agendaEquipe: agendaEquipeApi,
    pacientes: pacientesApi,
    dev: devApi,
    // ↓ Troque cada um pela implementação real quando a rota sair (ex.: ofertas: ofertasApi).
    avisos: avisosFalso,
    ofertas: ofertasFalso,
    compromisso: compromissoFalso,
    ofertasEquipe: ofertasEquipeFalso,
    alertas: alertasFalso,
    fichaCamada2: fichaFalsa
}
