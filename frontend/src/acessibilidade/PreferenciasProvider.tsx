import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AccessibilityInfo } from 'react-native'

import type { TamanhoLetra } from '@/tema/tokens'

// Escolhas do menu de acessibilidade. Ficam salvas no aparelho (AsyncStorage): não são segredo
// e valem para qualquer pessoa que use este celular, logada ou não.
export type Preferencias = {
    tamanhoLetra: TamanhoLetra
    altoContraste: boolean
    menosAnimacao: boolean
}

type ContextoPreferencias = {
    preferencias: Preferencias
    carregadas: boolean
    definir: (mudanca: Partial<Preferencias>) => void
}

const CHAVE = 'ubs:preferencias'

const PADRAO: Preferencias = { tamanhoLetra: 'normal', altoContraste: false, menosAnimacao: false }

const Contexto = createContext<ContextoPreferencias | null>(null)

export function PreferenciasProvider({ children }: { children: ReactNode }) {
    const [preferencias, setPreferencias] = useState<Preferencias>(PADRAO)
    const [carregadas, setCarregadas] = useState(false)

    useEffect(() => {
        let ativo = true
        async function carregar() {
            // "Menos animação" começa igual ao ajuste do sistema; o que a pessoa escolher no menu vence.
            const reduzirSistema = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false)
            const salvas = await AsyncStorage.getItem(CHAVE).catch(() => null)
            if (!ativo) return
            setPreferencias({ ...PADRAO, menosAnimacao: reduzirSistema, ...lerSalvas(salvas) })
            setCarregadas(true)
        }
        carregar()
        return () => {
            ativo = false
        }
    }, [])

    const definir = useCallback((mudanca: Partial<Preferencias>) => {
        setPreferencias(atual => {
            const novas = { ...atual, ...mudanca }
            AsyncStorage.setItem(CHAVE, JSON.stringify(novas)).catch(() => {})
            return novas
        })
    }, [])

    const valor = useMemo(() => ({ preferencias, carregadas, definir }), [preferencias, carregadas, definir])

    return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function usePreferencias() {
    const contexto = useContext(Contexto)
    if (!contexto) throw new Error('usePreferencias precisa estar dentro de PreferenciasProvider')
    return contexto
}

// Aceita só os campos conhecidos: um valor salvo por uma versão antiga do app não quebra a tela.
function lerSalvas(texto: string | null): Partial<Preferencias> {
    if (!texto) return {}
    try {
        const dados = JSON.parse(texto) as Record<string, unknown>
        const saida: Partial<Preferencias> = {}
        if (dados.tamanhoLetra === 'normal' || dados.tamanhoLetra === 'grande' || dados.tamanhoLetra === 'muitoGrande') {
            saida.tamanhoLetra = dados.tamanhoLetra
        }
        if (typeof dados.altoContraste === 'boolean') saida.altoContraste = dados.altoContraste
        if (typeof dados.menosAnimacao === 'boolean') saida.menosAnimacao = dados.menosAnimacao
        return saida
    } catch {
        return {}
    }
}
