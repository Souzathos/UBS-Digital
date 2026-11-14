import { cpfCompleto, mascararCpf, somenteDigitos } from '../cpf'

describe('máscara de CPF', () => {
    it('formata enquanto a pessoa digita', () => {
        expect(mascararCpf('123')).toBe('123')
        expect(mascararCpf('1234')).toBe('123.4')
        expect(mascararCpf('1234567')).toBe('123.456.7')
        expect(mascararCpf('12345678909')).toBe('123.456.789-09')
    })

    it('ignora o que não é número e corta no 11º dígito', () => {
        expect(mascararCpf('123.456.789-0999')).toBe('123.456.789-09')
        expect(somenteDigitos('123.456.789-09')).toBe('12345678909')
    })

    it('sabe quando o CPF está completo', () => {
        expect(cpfCompleto('123.456.789-0')).toBe(false)
        expect(cpfCompleto('123.456.789-09')).toBe(true)
    })
})
