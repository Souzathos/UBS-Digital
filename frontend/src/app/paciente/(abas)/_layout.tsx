import { Tabs } from 'expo-router/js-tabs'

import { BarraAbas, type ItemAba } from '@/componentes/BarraAbas'
import { useTheme } from '@/tema/ThemeProvider'

const ITENS: ItemAba[] = [
    { rota: 'index', rotulo: 'Atendimentos', icone: 'calendarioVisto' },
    { rota: 'agendar', rotulo: 'Agendar', icone: 'mais', destaque: true },
    { rota: 'perfil', rotulo: 'Perfil', icone: 'pessoa' }
]

// Abas do paciente: Atendimentos · Agendar · Perfil (componentes/navegacao-do-paciente).
export default function AbasPaciente() {
    const tema = useTheme()
    return (
        <Tabs
            tabBar={props => <BarraAbas {...props} itens={ITENS} estilo="paciente" />}
            screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: tema.cores.fundo } }}
        >
            <Tabs.Screen name="index" options={{ title: 'Atendimentos' }} />
            <Tabs.Screen name="agendar" options={{ title: 'Agendar' }} />
            <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
        </Tabs>
    )
}
