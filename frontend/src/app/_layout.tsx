import { QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { PreferenciasProvider, usePreferencias } from '@/acessibilidade/PreferenciasProvider'
import { queryClient } from '@/api/consultas'
import { MENSAGEM_SEM_CONEXAO } from '@/api/cliente'
import { ErroTela } from '@/componentes/Estados'
import { Tela } from '@/componentes/Tela'
import { calcularGuardas } from '@/sessao/guardas'
import { SessaoProvider, useSessao } from '@/sessao/SessaoProvider'
import { familiasDeFonte } from '@/tema/fontes'
import { ThemeProvider, useTheme } from '@/tema/ThemeProvider'

// A splash fica na tela até as fontes, as preferências de acessibilidade e a sessão estarem
// prontas: a primeira tela já abre com a letra e o contraste certos, no lugar certo.
SplashScreen.preventAutoHideAsync()

export default function LayoutRaiz() {
    return (
        <SafeAreaProvider>
            <PreferenciasProvider>
                <ThemeProvider variante="paciente">
                    <QueryClientProvider client={queryClient}>
                        <SessaoProvider>
                            <Navegacao />
                        </SessaoProvider>
                    </QueryClientProvider>
                </ThemeProvider>
            </PreferenciasProvider>
        </SafeAreaProvider>
    )
}

function Navegacao() {
    const [fontesProntas, erroFontes] = useFonts(familiasDeFonte)
    const { carregadas } = usePreferencias()
    const { sessao, tentarDeNovo } = useSessao()
    const tema = useTheme()
    const pronto = (fontesProntas || !!erroFontes) && carregadas && sessao.estado !== 'carregando'

    useEffect(() => {
        if (pronto) SplashScreen.hideAsync()
    }, [pronto])

    if (!pronto) return null

    if (sessao.estado === 'semConexao') {
        return (
            <Tela cabecalho="simples" titulo="Sem conexão">
                <ErroTela mensagem={MENSAGEM_SEM_CONEXAO} tentarDeNovo={tentarDeNovo} />
            </Tela>
        )
    }

    // Cada grupo de telas só existe enquanto a sua guarda é verdadeira. Quando a sessão muda
    // (entrou, trocou a senha, saiu, o token venceu), a guarda da tela atual vira falsa e o router
    // volta para a entrada (index), que manda para o lugar certo. Ninguém navega "na mão".
    const guardas = calcularGuardas(sessao)

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: tema.animacao ? 'default' : 'none',
                contentStyle: { backgroundColor: tema.cores.fundo }
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Protected guard={guardas.anonimo}>
                <Stack.Screen name="entrar" />
                <Stack.Screen name="entrar-equipe" />
            </Stack.Protected>
            <Stack.Protected guard={guardas.trocarSenha}>
                <Stack.Screen name="trocar-senha" />
            </Stack.Protected>
            <Stack.Protected guard={guardas.paciente}>
                <Stack.Screen name="paciente" />
            </Stack.Protected>
            <Stack.Protected guard={guardas.equipe}>
                <Stack.Screen name="equipe" />
            </Stack.Protected>
            {/* Vitrine dos componentes: só em desenvolvimento. */}
            <Stack.Protected guard={__DEV__}>
                <Stack.Screen name="vitrine" />
            </Stack.Protected>
        </Stack>
    )
}
