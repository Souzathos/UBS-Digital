import { Redirect } from 'expo-router'

import { destinoInicial } from '@/sessao/guardas'
import { useSessao } from '@/sessao/SessaoProvider'

// Entrada do app: não mostra nada, só manda cada sessão para a sua área.
// Sem login → Entrar · senha provisória → Crie sua senha · paciente → atendimentos · equipe → agenda
export default function Entrada() {
    const { sessao } = useSessao()
    const destino = destinoInicial(sessao)
    return destino ? <Redirect href={destino} /> : null
}
