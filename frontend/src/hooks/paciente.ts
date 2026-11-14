import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { chaves } from '@/api/consultas'
import type { Agendamento } from '@/api/tipos'
import { servicos } from '@/servicos'
import type { FiltroSlots } from '@/servicos/catalogo'

// Hooks de dados do app do paciente. As telas não chamam serviço direto: pedem o dado aqui, e
// cada ação invalida as listas que ela muda (a lista de atendimentos e os horários livres).

export function useMeusAtendimentos() {
    return useQuery({ queryKey: chaves.meusAtendimentos, queryFn: () => servicos.agendamentos.meus() })
}

// Não existe GET /agendamentos/:id: o detalhe sai da mesma lista (próximos + histórico).
export function useAgendamento(id: number) {
    return useQuery({
        queryKey: chaves.meusAtendimentos,
        queryFn: () => servicos.agendamentos.meus(),
        select: dados => [...dados.proximos, ...dados.historico].find(a => a.id === id) ?? null
    })
}

export function useTipos() {
    return useQuery({ queryKey: chaves.tipos, queryFn: () => servicos.catalogo.tipos(), staleTime: 5 * 60_000 })
}

export function useSlots(filtro: FiltroSlots | null) {
    return useQuery({
        queryKey: chaves.slots(filtro ?? {}),
        queryFn: () => servicos.catalogo.slots(filtro!),
        enabled: !!filtro
    })
}

// Ações do paciente sobre um agendamento. Todas devolvem o agendamento como a API respondeu.
export function useAcoesPaciente() {
    const queryClient = useQueryClient()
    const aoMudar = () => {
        queryClient.invalidateQueries({ queryKey: chaves.meusAtendimentos })
        queryClient.invalidateQueries({ queryKey: chaves.todosSlots })
    }
    const confirmar = useMutation({ mutationFn: (id: number) => servicos.agendamentos.confirmar(id), onSuccess: aoMudar })
    const cancelar = useMutation({ mutationFn: (id: number) => servicos.agendamentos.cancelar(id), onSuccess: aoMudar })
    const remarcar = useMutation({
        mutationFn: ({ id, slotId }: { id: number; slotId: number }) => servicos.agendamentos.remarcar(id, slotId),
        onSuccess: aoMudar
    })
    const criar = useMutation({ mutationFn: (slotId: number) => servicos.agendamentos.criar(slotId), onSuccess: aoMudar })
    return { confirmar, cancelar, remarcar, criar }
}

// Agendamentos ainda de pé (PENDENTE ou CONFIRMADO).
export function estaAtivo(a: Agendamento) {
    return a.status === 'PENDENTE' || a.status === 'CONFIRMADO'
}
