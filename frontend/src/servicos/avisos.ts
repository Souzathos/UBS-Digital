import { requisitar } from '@/api/cliente'
import type { AvisosDaConsulta, AvisosServico } from './camada2/contratos'

// "Avisos desta consulta" pela API real (GET /agendamentos/:id/avisos, ou a rota da equipe).
// Era um serviço falso até 14/11; a troca foi uma linha em servicos/index.ts.
export const avisosApi: AvisosServico = {
    listar: (agendamento, publico = 'paciente') =>
        requisitar<AvisosDaConsulta>('GET', publico === 'equipe' ? `/equipe/agendamentos/${agendamento.id}/avisos` : `/agendamentos/${agendamento.id}/avisos`)
}
