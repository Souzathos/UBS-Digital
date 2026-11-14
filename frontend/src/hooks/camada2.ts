import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { chaves } from '@/api/consultas'
import type { Agendamento, Canal } from '@/api/tipos'
import { servicos } from '@/servicos'

// Hooks das telas da Camada 2. Usam os serviços do registro (hoje falsos, amanhã reais) com a
// mesma cara dos outros hooks: a tela não sabe de onde o dado vem.

const k = (...partes: (string | number)[]) => [...chaves.camada2, ...partes]

// Avisos de um agendamento: rota real (não é mais Camada 2), mesma interface de antes.
export function useAvisos(a: Agendamento | null | undefined, publico: 'paciente' | 'equipe' = 'paciente') {
    return useQuery({
        queryKey: ['avisos', publico, a?.id ?? 0, a?.status ?? ''],
        queryFn: () => servicos.avisos.listar(a!, publico),
        enabled: !!a
    })
}

export function useOfertas() {
    return useQuery({ queryKey: k('ofertas'), queryFn: () => servicos.ofertas.minhas() })
}

export function useAcoesOferta() {
    const queryClient = useQueryClient()
    const aoMudar = () => {
        queryClient.invalidateQueries({ queryKey: k('ofertas') })
        queryClient.invalidateQueries({ queryKey: chaves.meusAtendimentos })
    }
    return {
        aceitar: useMutation({ mutationFn: (id: number) => servicos.ofertas.aceitar(id), onSuccess: aoMudar }),
        manter: useMutation({ mutationFn: (id: number) => servicos.ofertas.manter(id), onSuccess: aoMudar })
    }
}

export function useCompromisso() {
    return useQuery({ queryKey: k('compromisso'), queryFn: () => servicos.compromisso.situacao() })
}

export function useSuplencias() {
    return useQuery({ queryKey: k('suplencias'), queryFn: () => servicos.compromisso.suplencias() })
}

export function useAlternarSuplencia() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, entrar }: { id: number; entrar: boolean }) => (entrar ? servicos.compromisso.entrarNaLista(id) : servicos.compromisso.sairDaLista(id)),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: k('suplencias') })
    })
}

export function useOfertasEmAndamento() {
    return useQuery({ queryKey: k('ofertasEquipe'), queryFn: () => servicos.ofertasEquipe.emAndamento() })
}

export function useReaproveitadas(data: string) {
    return useQuery({ queryKey: k('reaproveitadas', data), queryFn: () => servicos.ofertasEquipe.reaproveitadas(data) })
}

export function useAlertas() {
    return useQuery({ queryKey: k('alertas'), queryFn: () => servicos.alertas.listar() })
}

export function useAcoesAlerta() {
    const queryClient = useQueryClient()
    const aoMudar = () => queryClient.invalidateQueries({ queryKey: k('alertas') })
    return {
        atribuir: useMutation({ mutationFn: (id: number) => servicos.alertas.atribuirAoAcs(id), onSuccess: aoMudar }),
        resolver: useMutation({ mutationFn: (id: number) => servicos.alertas.resolver(id), onSuccess: aoMudar })
    }
}

export function useContatos(pacienteId: number) {
    return useQuery({ queryKey: k('contatos', pacienteId), queryFn: () => servicos.fichaCamada2.contatos(pacienteId) })
}

export function useSelo(pacienteId: number, atual: boolean | undefined) {
    return useQuery({ queryKey: k('selo', pacienteId), queryFn: () => servicos.fichaCamada2.selo(pacienteId, atual!), enabled: atual !== undefined })
}

export function useAcoesFicha(pacienteId: number) {
    const queryClient = useQueryClient()
    return {
        alternarCanal: useMutation({
            mutationFn: ({ contatoId, canal }: { contatoId: number; canal: Canal }) => servicos.fichaCamada2.alternarCanalContato(contatoId, canal),
            onSuccess: () => queryClient.invalidateQueries({ queryKey: k('contatos', pacienteId) })
        }),
        alternarConsentimento: useMutation({
            mutationFn: (contatoId: number) => servicos.fichaCamada2.alternarConsentimento(contatoId),
            onSuccess: () => queryClient.invalidateQueries({ queryKey: k('contatos', pacienteId) })
        }),
        definirSelo: useMutation({
            mutationFn: ({ vulneravel, quem }: { vulneravel: boolean; quem: string }) => servicos.fichaCamada2.definirSelo(pacienteId, vulneravel, quem),
            onSuccess: () => queryClient.invalidateQueries({ queryKey: k('selo', pacienteId) })
        })
    }
}
