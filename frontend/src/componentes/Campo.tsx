import { useId, useState, type Ref } from 'react'
import { Pressable, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native'

import { criarEstilos } from '@/tema/criarEstilos'
import { useTheme } from '@/tema/ThemeProvider'
import { areaToque } from '@/tema/tokens'
import { Icone } from './Icone'
import { Texto } from './Texto'

type Props = Omit<TextInputProps, 'style'> & {
    rotulo: string
    erro?: string
    // Orientação abaixo do campo ("Use pelo menos 6 letras ou números."). O erro, se houver, toma o lugar.
    dica?: string
    // Fonte monoespaçada e grande, como CPF e senha na tela Entrar.
    mono?: boolean
    // Campo de senha com o botão de mostrar e esconder.
    senha?: boolean
    ref?: Ref<TextInputInstance>
}

export function Campo({ rotulo, erro, dica, mono, senha, ref, ...resto }: Props) {
    const tema = useTheme()
    const e = useEstilos()
    const id = useId()
    const [mostrando, setMostrando] = useState(false)

    return (
        <View style={e.grupo}>
            <Texto variante="subtitulo" nativeID={id} style={{ fontSize: tema.fonte(17) }}>
                {rotulo}
            </Texto>
            <View style={e.linha}>
                <TextInput
                    ref={ref}
                    accessibilityLabel={rotulo}
                    accessibilityLabelledBy={id}
                    accessibilityHint={erro ?? dica}
                    placeholderTextColor={tema.cores.textoSuave}
                    secureTextEntry={senha && !mostrando}
                    maxFontSizeMultiplier={1.4}
                    style={[
                        e.entrada,
                        mono && e.mono,
                        senha && { paddingRight: areaToque + 16 },
                        { borderColor: erro ? tema.cores.perigo : tema.cores.texto }
                    ]}
                    {...resto}
                />
                {senha ? (
                    <Pressable
                        onPress={() => setMostrando(m => !m)}
                        accessibilityRole="button"
                        accessibilityLabel={`${mostrando ? 'Esconder' : 'Mostrar'} ${rotulo.toLowerCase()}`}
                        accessibilityState={{ selected: mostrando }}
                        style={e.olho}
                    >
                        <Icone nome={mostrando ? 'olhoFechado' : 'olho'} cor={tema.cores.texto} tamanho={28} />
                    </Pressable>
                ) : null}
            </View>
            {erro ? (
                <Texto variante="corpo" cor="perigo" peso="600" accessibilityLiveRegion="polite">
                    {erro}
                </Texto>
            ) : dica ? (
                <Texto cor="textoSuave">{dica}</Texto>
            ) : null}
        </View>
    )
}

const useEstilos = criarEstilos(t => ({
    grupo: { gap: 6 },
    linha: { position: 'relative', justifyContent: 'center' },
    entrada: {
        minHeight: 60,
        paddingHorizontal: t.espaco.md,
        borderWidth: 1.5,
        borderRadius: t.raio.md,
        backgroundColor: t.cores.superficie,
        color: t.cores.texto,
        fontFamily: t.familia.texto,
        fontSize: t.fonte(18),
        fontWeight: '500'
    },
    mono: {
        fontFamily: t.familia.mono,
        fontSize: t.fonte(22),
        fontWeight: '600',
        letterSpacing: 0.5
    },
    olho: {
        position: 'absolute',
        right: 6,
        width: areaToque,
        height: areaToque,
        borderRadius: t.raio.md,
        alignItems: 'center',
        justifyContent: 'center'
    }
}))
