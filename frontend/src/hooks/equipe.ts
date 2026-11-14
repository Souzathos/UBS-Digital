import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiErro } from '@/api/cliente'
import { chaves } from '@/api/consultas'
import type { AgendamentoEquipe, PerfilEquipe } from '@/api/tipos'
import { servicos } from '@/servicos'
import type { NovoPaciente } from '@/servicos/equipe'
import { useEquipeLogada } from '@/sessao/SessaoProvider'

// Hooks de dados do painel da equipe.

// Recepção e gestor fazem tudo; o ACS só vê (a API responde 403 se ele tentar). Esconder os
// botões é só para não oferecer o que vai dar erro.
export function podeAgir(perfil: PerfilEquipe) {
    return perfil === 'RECEPCAO' || perfil === 'GESTOR'
}

export function usePodeAgir() {
    return podeAgir(useEquipeLogada().perfil)
}

// Relógio da API. Em desenvolvimento ele pode estar adiantado (RN-90); "hoje" na agenda segue
// esse relógio, para a demonstração dos 14 dias funcionar. Fora de dev a rota não existe (404):
// aí vale o relógio do aparelho.
export function useRelogio() {
    return useQuery({
        queryKey: chaves.relogio,
        queryFn: async () => {
            try {
                return await servicos.dev.relogio()
            } catch (e) {
                if (e instanceof ApiErro && (e.status === 404 || e.status === 403)) return null
                throw e
            }
        },
        staleTime: 15_000,
        retry: false
    })
}

export function useAgora(): Date {
    const relogio = useRelogio()
    return relogio.data ? new Date(relogio.data.agora) : new Date()
}

export function useAgendaDoDia(data: string) {
    return useQuery({
        queryKey: chaves.agenda(data),
        queryFn: () => servicos.agendaEquipe.agenda(data),
        placeholderData: keepPreviousData
    })
}

// Um agendamento da agenda de um dia (não existe GET /equipe/agendamentos/:id).
export function useAgendamentoEquipe(data: string, id: number) {
    return useQuery({
        queryKey: chaves.agenda(data),
        queryFn: () => servicos.agendaEquipe.agenda(data),
        select: (lista: AgendamentoEquipe[]) => lista.find(a => a.id === id) ?? null
    })
}

export function useAcoesEquipe() {
    const queryClient = useQueryClient()
    const aoMudar = () => {
        queryClient.invalidateQueries({ queryKey: chaves.todasAgendas })
        queryClient.invalidateQueries({ queryKey: chaves.todosSlots })
        queryClient.invalidateQueries({ queryKey: chaves.todosPacientes })
    }
    return {
        presenca: useMutation({
            mutationFn: ({ id, resultado }: { id: number; resultado: 'COMPARECEU' | 'FALTOU' }) => servicos.agendaEquipe.presenca(id, resultado),
            onSuccess: aoMudar
        }),
        confirmar: useMutation({ mutationFn: (id: number) => servicos.agendaEquipe.confirmar(id), onSuccess: aoMudar }),
        cancelar: useMutation({ mutationFn: (id: number) => servicos.agendaEquipe.cancelar(id), onSuccess: aoMudar }),
        remarcar: useMutation({ mutationFn: ({ id, slotId }: { id: number; slotId: number }) => servicos.agendaEquipe.remarcar(id, slotId), onSuccess: aoMudar }),
        agendar: useMutation({ mutationFn: ({ pacienteId, slotId }: { pacienteId: number; slotId: number }) => servicos.agendaEquipe.agendar(pacienteId, slotId), onSuccess: aoMudar })
    }
}

export function usePacientes(q: string) {
    return useQuery({ queryKey: chaves.pacientes(q), queryFn: () => servicos.pacientes.buscar(q), placeholderData: keepPreviousData })
}

export function usePaciente(id: number) {
    return useQuery({ queryKey: chaves.paciente(id), queryFn: () => servicos.pacientes.obter(id), enabled: id > 0 })
}

export function useRuas() {
    return useQuery({ queryKey: chaves.ruas, queryFn: () => servicos.catalogo.ruas(), staleTime: 10 * 60_000 })
}

export function useAcoesPacientes() {
    const queryClient = useQueryClient()
    const aoMudar = () => queryClient.invalidateQueries({ queryKey: chaves.todosPacientes })
    return {
        cadastrar: useMutation({ mutationFn: (dados: NovoPaciente) => servicos.pacientes.cadastrar(dados), onSuccess: aoMudar }),
        atualizarEndereco: useMutation({
            mutationFn: ({ id, ruaId, numero }: { id: number; ruaId: number; numero: string }) => servicos.pacientes.atualizarEndereco(id, ruaId, numero),
            onSuccess: aoMudar
        }),
        redefinirSenha: useMutation({ mutationFn: (id: number) => servicos.pacientes.redefinirSenha(id), onSuccess: aoMudar })
    }
}
