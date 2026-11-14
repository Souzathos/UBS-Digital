import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { PreferenciasProvider, usePreferencias } from '@/acessibilidade/PreferenciasProvider'
import { familiasDeFonte } from '@/tema/fontes'
import { ThemeProvider, useTheme } from '@/tema/ThemeProvider'

// A splash fica na tela até as fontes e as preferências de acessibilidade estarem prontas, para
// a primeira tela já abrir com a letra e o contraste certos.
SplashScreen.preventAutoHideAsync()

export default function LayoutRaiz() {
    return (
        <SafeAreaProvider>
            <PreferenciasProvider>
                <ThemeProvider variante="paciente">
                    <Navegacao />
                </ThemeProvider>
            </PreferenciasProvider>
        </SafeAreaProvider>
    )
}

function Navegacao() {
    const [fontesProntas, erroFontes] = useFonts(familiasDeFonte)
    const { carregadas } = usePreferencias()
    const tema = useTheme()
    const pronto = (fontesProntas || !!erroFontes) && carregadas

    useEffect(() => {
        if (pronto) SplashScreen.hideAsync()
    }, [pronto])

    if (!pronto) return null

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: tema.animacao ? 'default' : 'none',
                contentStyle: { backgroundColor: tema.cores.fundo }
            }}
        />
    )
}
