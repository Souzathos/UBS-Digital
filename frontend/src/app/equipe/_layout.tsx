import { Stack } from 'expo-router'

import { ThemeProvider, useTheme } from '@/tema/ThemeProvider'

// Área da equipe (só existe com sessão de equipe; ver o layout raiz). Tudo aqui dentro usa a
// paleta escura do painel: basta este ThemeProvider, nenhuma tela escolhe cor.
export default function LayoutEquipe() {
    return (
        <ThemeProvider variante="equipe">
            <PilhaEquipe />
        </ThemeProvider>
    )
}

function PilhaEquipe() {
    const tema = useTheme()
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
