import type { StatusAgendamento } from '@/api/tipos'
import { nomeDoItem, rotuloCategoria, statusParaEquipe, statusParaPaciente } from '../rotulos'

const TODOS: StatusAgendamento[] = ['PENDENTE', 'CONFIRMADO', 'CANCELADO_PACIENTE', 'CANCELADO_AUTO', 'REMARCADO', 'COMPARECEU', 'FALTOU']

describe('RN-06: Médico × Enfermagem', () => {
    it('CONSULTA é "Médico" e seus itens são consultas', () => {
        expect(rotuloCategoria('CONSULTA')).toBe('Médico')
        expect(nomeDoItem('CONSULTA')).toBe('consulta')
        expect(nomeDoItem('CONSULTA', true)).toBe('consultas')
    })

    it('PROCEDIMENTO é "Enfermagem" e seus itens são procedimentos', () => {
        expect(rotuloCategoria('PROCEDIMENTO')).toBe('Enfermagem')
        expect(nomeDoItem('PROCEDIMENTO')).toBe('procedimento')
        expect(nomeDoItem('PROCEDIMENTO', true)).toBe('procedimentos')
    })
})

describe('status sempre escrito (handoff, seção 3)', () => {
    it.each(TODOS)('%s tem texto para o paciente e para a equipe', status => {
        expect(statusParaPaciente(status).texto.length).toBeGreaterThan(0)
        expect(statusParaEquipe(status).texto.length).toBeGreaterThan(0)
    })

    it('o paciente lê "Falta confirmar"; a equipe lê "Pendente"', () => {
        expect(statusParaPaciente('PENDENTE')).toEqual({ chave: 'pendente', texto: 'Falta confirmar' })
        expect(statusParaEquipe('PENDENTE')).toEqual({ chave: 'pendente', texto: 'Pendente' })
    })
})
