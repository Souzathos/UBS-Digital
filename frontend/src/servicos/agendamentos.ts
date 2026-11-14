import { requisitar } from '@/api/cliente'
import type { Agendamento } from '@/api/tipos'

// Agendamentos do app do paciente (SPEC, seção 14, "Agendamentos (app do paciente)").
export interface AgendamentosServico {
    meus(): Promise<{ proximos: Agendamento[]; historico: Agendamento[] }>
    criar(slotId: number): Promise<Agendamento>
    confirmar(id: number): Promise<Agendamento>
    cancelar(id: number): Promise<Agendamento>
    // Devolve o agendamento NOVO (RN-22); o antigo vira REMARCADO.
    remarcar(id: number, slotId: number): Promise<Agendamento>
}

export const agendamentosApi: AgendamentosServico = {
    meus: () => requisitar('GET', '/agendamentos/meus'),
    criar: slotId => requisitar('POST', '/agendamentos', { corpo: { slotId } }),
    confirmar: id => requisitar('POST', `/agendamentos/${id}/confirmar`),
    cancelar: id => requisitar('POST', `/agendamentos/${id}/cancelar`),
    remarcar: (id, slotId) => requisitar('POST', `/agendamentos/${id}/remarcar`, { corpo: { slotId } })
}
