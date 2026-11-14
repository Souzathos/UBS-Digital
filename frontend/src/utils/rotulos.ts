import type { Categoria, StatusAgendamento } from '@/api/tipos'
import type { ChaveStatus } from '@/tema/paletas'

// Textos de domínio que aparecem em várias telas. Nenhuma tela escreve "Médico" ou "Falta
// confirmar" por conta própria: tudo sai daqui, para o vocabulário ficar igual no app inteiro.

// RN-06: CONSULTA mostra "Médico", PROCEDIMENTO mostra "Enfermagem".
export function rotuloCategoria(categoria: Categoria): string {
    return categoria === 'CONSULTA' ? 'Médico' : 'Enfermagem'
}

// RN-06: os itens do Médico são consultas; os da Enfermagem, procedimentos.
export function nomeDoItem(categoria: Categoria, plural = false): string {
    if (categoria === 'CONSULTA') return plural ? 'consultas' : 'consulta'
    return plural ? 'procedimentos' : 'procedimento'
}

export type StatusVisual = { chave: ChaveStatus; texto: string }

// Status sempre escrito (handoff, seção 3): a cor vem da chave, o texto vem junto.
// O paciente lê na segunda pessoa; a equipe lê o estado da vaga.
export function statusParaPaciente(status: StatusAgendamento): StatusVisual {
    switch (status) {
        case 'PENDENTE': return { chave: 'pendente', texto: 'Falta confirmar' }
        case 'CONFIRMADO': return { chave: 'confirmado', texto: 'Confirmado' }
        case 'CANCELADO_PACIENTE': return { chave: 'cancelado', texto: 'Cancelado' }
        case 'CANCELADO_AUTO': return { chave: 'cancelado', texto: 'Cancelado sem resposta' }
        case 'REMARCADO': return { chave: 'remarcado', texto: 'Remarcado' }
        case 'COMPARECEU': return { chave: 'compareceu', texto: 'Compareceu' }
        case 'FALTOU': return { chave: 'faltou', texto: 'Faltou' }
    }
}

export function statusParaEquipe(status: StatusAgendamento): StatusVisual {
    switch (status) {
        case 'PENDENTE': return { chave: 'pendente', texto: 'Pendente' }
        case 'CONFIRMADO': return { chave: 'confirmado', texto: 'Confirmada' }
        case 'CANCELADO_PACIENTE': return { chave: 'cancelado', texto: 'Cancelada' }
        case 'CANCELADO_AUTO': return { chave: 'cancelado', texto: 'Cancelada sem resposta' }
        case 'REMARCADO': return { chave: 'remarcado', texto: 'Remarcada' }
        case 'COMPARECEU': return { chave: 'compareceu', texto: 'Compareceu' }
        case 'FALTOU': return { chave: 'faltou', texto: 'Faltou' }
    }
}
