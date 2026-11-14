import { agendamentosApi, type AgendamentosServico } from './agendamentos'
import { authApi, type AuthServico } from './auth'
import { catalogoApi, type CatalogoServico } from './catalogo'

// Registro único dos serviços. As telas e os hooks pedem `servicos.auth`, `servicos.ofertas`…
// e nunca importam uma implementação direto. Quando uma rota da Camada 2 sair no backend, a troca
// do serviço falso pelo real acontece só aqui, numa linha, sem mexer em nenhuma tela.
export type Servicos = {
    auth: AuthServico
    agendamentos: AgendamentosServico
    catalogo: CatalogoServico
}

export const servicos: Servicos = {
    auth: authApi,
    agendamentos: agendamentosApi,
    catalogo: catalogoApi
}
