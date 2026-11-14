import { Stack } from 'expo-router'

import { useTheme } from '@/tema/ThemeProvider'

// Área do paciente (só existe com sessão de paciente e senha já trocada; ver o layout raiz).
// Um Stack por fora das abas: as telas internas (detalhe, remarcar, passos do agendamento) abrem
// por cima da barra de abas, como nas telas do design.
export default function LayoutPaciente() {
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
