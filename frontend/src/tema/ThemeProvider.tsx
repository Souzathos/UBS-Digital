import { createContext, useContext, type ReactNode } from 'react'

import { usePreferencias, type Preferencias } from '@/acessibilidade/PreferenciasProvider'
import { altoContraste, claro, escuro, type Paleta } from './paletas'
import { escalaLetra, espaco, familia, raio, tipografia } from './tokens'

// O tema é o resultado de duas entradas:
// 1. a variante, que vem de onde a tela está: "paciente" (claro) ou "equipe" (escuro);
// 2. as preferências de acessibilidade, que valem para o app inteiro.
// O alto contraste vence as duas variantes.

export type Variante = 'paciente' | 'equipe'

export type Tema = {
    variante: Variante
    cores: Paleta
    altoContraste: boolean
    escala: number
    // Tamanho de fonte já multiplicado pela escala do menu (Normal 1, Grande 1,2, Muito grande 1,4).
    fonte: (tamanho: number) => number
    animacao: boolean
    espaco: typeof espaco
    raio: typeof raio
    familia: typeof familia
    tipografia: typeof tipografia
}

const VarianteContexto = createContext<Variante>('paciente')

// Usado no layout raiz (paciente) e de novo no layout do grupo (equipe) para trocar a paleta de
// tudo o que estiver dentro.
export function ThemeProvider({ variante, children }: { variante: Variante; children: ReactNode }) {
    return <VarianteContexto.Provider value={variante}>{children}</VarianteContexto.Provider>
}

export function useTheme(): Tema {
    const variante = useContext(VarianteContexto)
    const { preferencias } = usePreferencias()
    return obterTema(variante, preferencias)
}

// Um objeto por combinação, guardado para sempre (são no máximo 2 × 3 × 2 × 2 = 24). Assim o
// mesmo tema é sempre a mesma referência, e os estilos de criarEstilos podem ser memorizados.
const cache = new Map<string, Tema>()

export function obterTema(variante: Variante, preferencias: Preferencias): Tema {
    const chave = `${variante}|${preferencias.tamanhoLetra}|${preferencias.altoContraste}|${preferencias.menosAnimacao}`
    const existente = cache.get(chave)
    if (existente) return existente

    const escala = escalaLetra[preferencias.tamanhoLetra]
    const cores = preferencias.altoContraste ? altoContraste : variante === 'equipe' ? escuro : claro
    const tema: Tema = {
        variante,
        cores,
        altoContraste: preferencias.altoContraste,
        escala,
        fonte: tamanho => Math.round(tamanho * escala),
        animacao: !preferencias.menosAnimacao,
        espaco,
        raio,
        familia,
        tipografia
    }
    cache.set(chave, tema)
    return tema
}
