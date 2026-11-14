import type { BottomTabBarProps } from 'expo-router/js-tabs'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { criarEstilos } from '@/tema/criarEstilos'
import { useTheme } from '@/tema/ThemeProvider'
import { Icone, type NomeIcone } from './Icone'
import { Texto } from './Texto'

export type ItemAba = {
    // Nome da rota dentro do grupo de abas (ex.: "index", "perfil").
    rota: string
    rotulo: string
    icone: NomeIcone
    // Botão redondo em destaque no meio (o "Agendar" do paciente).
    destaque?: boolean
}

type Props = BottomTabBarProps & { itens: ItemAba[]; estilo: 'paciente' | 'equipe' }

// Barra de abas desenhada como nos componentes do design (navegacao-do-paciente e
// navegacao-da-equipe). Substitui a barra padrão do Expo Router pela prop `tabBar` do Tabs.
export function BarraAbas({ state, emitter, navigateToTab, itens, estilo }: Props) {
    const e = useEstilos()
    const insets = useSafeAreaInsets()
    const rotaAtual = state.routes[state.index]?.name

    function tocar(chave: string, ativa: boolean) {
        // Mesmo contrato da barra padrão: avisa a tela (tabPress) e só navega se ninguém impediu.
        const evento = emitter.emit({ type: 'tabPress', target: chave, canPreventDefault: true })
        if (!ativa && !evento.defaultPrevented) navigateToTab(chave)
    }

    const botoes = itens.map(item => {
        const rota = state.routes.find(r => r.name === item.rota)
        if (!rota) return null
        const ativa = rota.name === rotaAtual
        const Botao = estilo === 'paciente' ? (item.destaque ? AbaDestaque : AbaPaciente) : AbaEquipe
        return <Botao key={rota.key} item={item} ativa={ativa} aoTocar={() => tocar(rota.key, ativa)} />
    })

    if (estilo === 'paciente') {
        return (
            <View style={[e.barraPaciente, { height: 84 + insets.bottom }]} accessibilityRole="tablist">
                <View style={[e.fundoPaciente, { bottom: 0 }]} />
                <View style={e.linhaPaciente}>{botoes}</View>
            </View>
        )
    }

    return (
        <View style={[e.barraEquipe, { paddingBottom: Math.max(insets.bottom, 12) }]} accessibilityRole="tablist">
            {botoes}
        </View>
    )
}

type PropsAba = { item: ItemAba; ativa: boolean; aoTocar: () => void }

function AbaPaciente({ item, ativa, aoTocar }: PropsAba) {
    const tema = useTheme()
    const e = useEstilos()
    const cor = ativa ? tema.cores.texto : tema.cores.abaInativa
    return (
        <Pressable onPress={aoTocar} accessibilityRole="tab" accessibilityLabel={item.rotulo} accessibilityState={{ selected: ativa }} style={e.abaPaciente}>
            <View style={e.caixaIconePaciente}>
                <Icone nome={item.icone} cor={cor} tamanho={24} traco={ativa ? 2.4 : 1.8} />
            </View>
            <Texto variante="rotulo" cor={cor} peso={ativa ? '700' : '500'} maxFontSizeMultiplier={1.2} style={{ fontSize: 13, lineHeight: 16 }}>
                {item.rotulo}
            </Texto>
        </Pressable>
    )
}

function AbaDestaque({ item, ativa, aoTocar }: PropsAba) {
    const tema = useTheme()
    const e = useEstilos()
    return (
        <Pressable onPress={aoTocar} accessibilityRole="tab" accessibilityLabel={item.rotulo} accessibilityState={{ selected: ativa }} style={e.abaDestaque}>
            <View style={[e.circulo, { borderColor: ativa ? tema.cores.destaque : tema.cores.abaAtivaFundo }]}>
                <Icone nome={item.icone} cor={tema.cores.sobrePrimario} tamanho={28} traco={2.6} />
            </View>
            <Texto variante="rotulo" peso="700" maxFontSizeMultiplier={1.2} style={{ fontSize: 13, lineHeight: 16 }}>
                {item.rotulo}
            </Texto>
        </Pressable>
    )
}

function AbaEquipe({ item, ativa, aoTocar }: PropsAba) {
    const tema = useTheme()
    const e = useEstilos()
    return (
        <Pressable onPress={aoTocar} accessibilityRole="tab" accessibilityLabel={item.rotulo} accessibilityState={{ selected: ativa }} style={e.abaEquipe}>
            <View style={[e.caixaIconeEquipe, ativa && { backgroundColor: tema.cores.abaAtivaFundo }]}>
                <Icone nome={item.icone} cor={ativa ? tema.cores.abaAtiva : tema.cores.abaInativa} tamanho={22} traco={1.8} />
            </View>
            <Texto variante="rotulo" cor={ativa ? 'texto' : 'textoSuave'} peso={ativa ? '700' : '500'} maxFontSizeMultiplier={1.2} style={{ fontSize: 12, lineHeight: 16 }}>
                {item.rotulo}
            </Texto>
        </Pressable>
    )
}

// A barra não cresce com a escala da letra (rótulos de 12–13 px fixos, com o limite do sistema em
// 1,2×): ela precisa caber em qualquer celular, e o ícone + a área de toque de 48 pt já ajudam.
const useEstilos = criarEstilos(t => ({
    barraPaciente: { position: 'relative', backgroundColor: 'transparent' },
    fundoPaciente: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 18,
        backgroundColor: t.cores.barraAbas,
        borderTopWidth: 1,
        borderTopColor: t.cores.borda
    },
    linhaPaciente: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 8, height: 84 },
    abaPaciente: { flex: 1, height: 84, paddingTop: 26, alignItems: 'center' },
    caixaIconePaciente: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
    abaDestaque: { flex: 1, height: 84, alignItems: 'center', gap: 2 },
    circulo: {
        width: 66,
        height: 66,
        borderRadius: 33,
        borderWidth: 5,
        backgroundColor: t.cores.primario,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#082C63',
        shadowOpacity: 0.28,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
        marginTop: -5
    },
    barraEquipe: {
        flexDirection: 'row',
        paddingTop: 8,
        paddingHorizontal: 8,
        backgroundColor: t.cores.barraAbas,
        borderTopWidth: 1,
        borderTopColor: t.cores.borda
    },
    abaEquipe: { flex: 1, minHeight: 48, alignItems: 'center', gap: 2 },
    caixaIconeEquipe: { width: 52, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }
}))
