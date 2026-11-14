import { Tabs } from 'expo-router/js-tabs'

import { BarraAbas, type ItemAba } from '@/componentes/BarraAbas'
import { useTheme } from '@/tema/ThemeProvider'

const ITENS: ItemAba[] = [
    { rota: 'index', rotulo: 'Agenda', icone: 'calendario' },
    { rota: 'ofertas', rotulo: 'Ofertas', icone: 'troca' },
    { rota: 'alertas', rotulo: 'Alertas', icone: 'sino' },
    { rota: 'pacientes', rotulo: 'Pacientes', icone: 'pessoa' }
]

// Abas do painel: Agenda · Ofertas · Alertas · Pacientes (componentes/navegacao-da-equipe).
export default function AbasEquipe() {
    const tema = useTheme()
    return (
        <Tabs
            tabBar={props => <BarraAbas {...props} itens={ITENS} estilo="equipe" />}
            screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: tema.cores.fundo } }}
        >
            <Tabs.Screen name="index" options={{ title: 'Agenda' }} />
            <Tabs.Screen name="ofertas" options={{ title: 'Ofertas' }} />
            <Tabs.Screen name="alertas" options={{ title: 'Alertas' }} />
            <Tabs.Screen name="pacientes" options={{ title: 'Pacientes' }} />
        </Tabs>
    )
}
