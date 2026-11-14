import { authApi, type AuthServico } from './auth'

// Registro único dos serviços. As telas e os hooks pedem `servicos.auth`, `servicos.ofertas`…
// e nunca importam uma implementação direto. Quando uma rota da Camada 2 sair no backend, a troca
// do serviço falso pelo real acontece só aqui, numa linha, sem mexer em nenhuma tela.
export type Servicos = {
    auth: AuthServico
}

export const servicos: Servicos = {
    auth: authApi
}
