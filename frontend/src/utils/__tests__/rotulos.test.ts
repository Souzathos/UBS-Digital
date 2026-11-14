import type { StatusAgendamento } from '@/api/tipos'
import { concordar, esteItem, nomeDoItem, rotuloCategoria, seuItem, statusParaEquipe, statusParaPaciente } from '../rotulos'

const TODOS: StatusAgendamento[] = ['PENDENTE', 'CONFIRMADO', 'CANCELADO_PACIENTE', 'CANCELADO_AUTO', 'REMARCADO', 'COMPARECEU', 'FALTOU']

describe('RN-06: Médico × Enfermagem', () => {
    it('CONSULTA é "Consulta" e seus itens são consultas', () => {
        expect(rotuloCategoria('CONSULTA')).toBe('Consulta')
        expect(nomeDoItem('CONSULTA')).toBe('consulta')
        expect(nomeDoItem('CONSULTA', true)).toBe('consultas')
    })

    it('PROCEDIMENTO é "Procedimento" e seus itens são procedimentos', () => {
        expect(rotuloCategoria('PROCEDIMENTO')).toBe('Procedimento')
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

describe('concordância de consulta (feminino) e procedimento (masculino)', () => {
    it('sua consulta / seu procedimento', () => {
        expect(seuItem('CONSULTA')).toBe('sua consulta')
        expect(seuItem('PROCEDIMENTO')).toBe('seu procedimento')
        expect(esteItem('PROCEDIMENTO')).toBe('este procedimento')
        expect(concordar('PROCEDIMENTO', 'cancelada', 'cancelado')).toBe('cancelado')
    })
})
