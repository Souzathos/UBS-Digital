import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native'

import { useTheme, type Tema } from '@/tema/ThemeProvider'
import { areaToque } from '@/tema/tokens'
import { Icone, type NomeIcone } from './Icone'
import { Texto } from './Texto'

export type VarianteBotao = 'primario' | 'sucesso' | 'contorno' | 'perigo' | 'perigoCheio' | 'texto'

type Props = {
    titulo: string
    onPress: () => void
    variante?: VarianteBotao
    grande?: boolean
    icone?: NomeIcone
    carregando?: boolean
    desabilitado?: boolean
    // O que acontece ao tocar, quando o título sozinho não basta ("Abre a lista de horários").
    dica?: string
    style?: StyleProp<ViewStyle>
}

// Botão do app. Altura mínima de 52 (60 no grande), sempre acima dos 48 pt pedidos no handoff.
export function Botao({ titulo, onPress, variante = 'primario', grande, icone, carregando, desabilitado, dica, style }: Props) {
    const tema = useTheme()
    const { fundo, tinta, borda } = coresDoBotao(tema, variante)
    const inativo = desabilitado || carregando

    return (
        <Pressable
            onPress={onPress}
            disabled={inativo}
            accessibilityRole="button"
            accessibilityLabel={titulo}
            accessibilityHint={dica}
            accessibilityState={{ disabled: !!inativo, busy: !!carregando }}
            style={({ pressed }) => [
                {
                    minHeight: Math.max(areaToque, grande ? 60 : 52),
                    paddingHorizontal: tema.espaco.md,
                    borderRadius: tema.raio.md,
                    borderWidth: variante === 'texto' ? 0 : 1.5,
                    borderColor: borda,
                    backgroundColor: fundo,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: inativo ? 0.55 : pressed ? 0.8 : 1
                },
                style
            ]}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {carregando ? (
                    <ActivityIndicator color={tinta} />
                ) : icone ? (
                    <Icone nome={icone} cor={tinta} tamanho={grande ? 24 : 20} traco={2.6} />
                ) : null}
                <Texto variante={grande ? 'botaoGrande' : 'botao'} cor={tinta} alinhar="center">
                    {titulo}
                </Texto>
            </View>
        </Pressable>
    )
}

function coresDoBotao(tema: Tema, variante: VarianteBotao) {
    const c = tema.cores
    switch (variante) {
        case 'primario': return { fundo: c.primario, tinta: c.sobrePrimario, borda: c.primario }
        case 'sucesso': return { fundo: c.sucesso, tinta: c.sobreSucesso, borda: c.sucesso }
        case 'contorno': return { fundo: 'transparent', tinta: c.texto, borda: c.texto }
        case 'perigo': return { fundo: c.superficie, tinta: c.perigo, borda: c.perigo }
        case 'perigoCheio': return { fundo: c.perigo, tinta: c.sobrePerigo, borda: c.perigo }
        case 'texto': return { fundo: 'transparent', tinta: c.link, borda: 'transparent' }
    }
}
