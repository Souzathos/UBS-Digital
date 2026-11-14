import { altoContraste, claro, escuro } from '../paletas'
import { obterTema } from '../ThemeProvider'

const NORMAL = { tamanhoLetra: 'normal', altoContraste: false, menosAnimacao: false } as const

describe('tema', () => {
    it('paciente usa a paleta clara e equipe a escura', () => {
        expect(obterTema('paciente', NORMAL).cores).toBe(claro)
        expect(obterTema('equipe', NORMAL).cores).toBe(escuro)
    })

    it('alto contraste vence as duas variantes', () => {
        const prefs = { ...NORMAL, altoContraste: true }
        expect(obterTema('paciente', prefs).cores).toBe(altoContraste)
        expect(obterTema('equipe', prefs).cores).toBe(altoContraste)
    })

    it('a escala da letra multiplica os tamanhos (1 · 1,2 · 1,4)', () => {
        expect(obterTema('paciente', NORMAL).fonte(15)).toBe(15)
        expect(obterTema('paciente', { ...NORMAL, tamanhoLetra: 'grande' }).fonte(15)).toBe(18)
        expect(obterTema('paciente', { ...NORMAL, tamanhoLetra: 'muitoGrande' }).fonte(15)).toBe(21)
    })

    it('menos animação desliga as animações', () => {
        expect(obterTema('paciente', { ...NORMAL, menosAnimacao: true }).animacao).toBe(false)
    })

    it('a mesma combinação devolve o mesmo objeto (os estilos memorizados dependem disso)', () => {
        expect(obterTema('equipe', { ...NORMAL })).toBe(obterTema('equipe', { ...NORMAL }))
    })

    it('as três paletas têm as mesmas chaves', () => {
        const chaves = Object.keys(claro).sort()
        expect(Object.keys(escuro).sort()).toEqual(chaves)
        expect(Object.keys(altoContraste).sort()).toEqual(chaves)
    })
})
