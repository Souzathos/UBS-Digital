import { requisitar } from '@/api/cliente'
import type { Rua, Slot, TipoAtendimento } from '@/api/tipos'

export type FiltroSlots = {
    tipoAtendimentoId: number
    // Só equipe: horários do médico da rua deste paciente (RN-06).
    pacienteId?: number
    profissionalId?: number
    de?: string
    ate?: string
}

// Catálogo e horários (SPEC, seção 14, "Catálogo e horários").
export interface CatalogoServico {
    // Paciente: só os tipos liberados para o app (RN-01). Equipe: todos.
    tipos(): Promise<TipoAtendimento[]>
    // Paciente: só a cota do app (RN-02) e, em consulta, só o médico da rua (RN-06).
    slots(filtro: FiltroSlots): Promise<Slot[]>
    ruas(): Promise<Rua[]>
}

export const catalogoApi: CatalogoServico = {
    tipos: () => requisitar('GET', '/tipos-atendimento'),
    slots: f => requisitar('GET', '/slots', { query: f }),
    ruas: () => requisitar('GET', '/ruas')
}
