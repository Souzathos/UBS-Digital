import { dataPorExtenso, diaISO, formatarDataHora, formatarDiaMes, formatarHora, partesEmSaoPaulo } from '../datas'

// A API manda ISO em UTC; o app mostra no horário de São Paulo (UTC−3).
describe('datas no horário de São Paulo', () => {
    it('converte UTC para São Paulo', () => {
        expect(partesEmSaoPaulo('2026-12-10T12:00:00.000Z')).toEqual({ ano: 2026, mes: 12, dia: 10, hora: 9, minuto: 0, diaSemana: 4 })
    })

    it('vira o dia quando o UTC já passou da meia-noite', () => {
        // 01:30 UTC de sexta = 22:30 de quinta em São Paulo
        expect(diaISO('2026-12-11T01:30:00.000Z')).toBe('2026-12-10')
    })

    it('formata no padrão "Qui, 10/12 · 9h" (handoff, seção 3)', () => {
        expect(formatarDataHora('2026-12-10T12:00:00.000Z')).toBe('Qui, 10/12 · 9h')
    })

    it('mostra os minutos só quando existem', () => {
        expect(formatarHora('2026-12-15T11:20:00.000Z')).toBe('8h20')
        expect(formatarHora('2026-12-15T11:05:00.000Z')).toBe('8h05')
    })

    it('dia sem zero e mês com dois dígitos, como nas telas', () => {
        expect(formatarDiaMes('2027-01-04T10:30:00.000Z')).toBe('4/01')
    })

    it('escreve por extenso para o leitor de tela', () => {
        expect(dataPorExtenso('2026-12-10T12:00:00.000Z')).toBe('quinta-feira, 10 de dezembro, às 9 horas')
        expect(dataPorExtenso('2026-12-15T11:20:00.000Z')).toBe('terça-feira, 15 de dezembro, às 8 horas e 20 minutos')
        expect(dataPorExtenso('2026-12-15T04:01:00.000Z')).toBe('terça-feira, 15 de dezembro, às 1 hora e 1 minuto')
    })
})
