import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'

import { useTheme } from '@/tema/ThemeProvider'
import { Icone, type NomeIcone } from './Icone'
import { Texto } from './Texto'

type Props = {
    titulo: string
    descricao?: string
    icone?: NomeIcone
    // Linha extra em destaque ("Seu médico: Dra. Helena (pela sua rua)", "Já marcada: …").
    nota?: string
    selecionado?: boolean
    onPress: () => void
    children?: ReactNode
}

// Opção grande de uma escolha (Médico ou Enfermagem, qual consulta). Leva para o próximo passo,
// por isso tem a seta à direita.
export function BotaoOpcao({ titulo, descricao, icone, nota, selecionado, onPress, children }: Props) {
    const { cores, raio } = useTheme()
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={[titulo, descricao, nota].filter(Boolean).join('. ')}
            accessibilityState={{ selected: !!selecionado }}
            style={({ pressed }) => ({
                minHeight: 64,
                padding: 14,
                borderRadius: raio.lg,
                borderWidth: selecionado ? 2 : 1.5,
                borderColor: selecionado ? cores.primario : cores.bordaForte,
                backgroundColor: cores.superficie,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                opacity: pressed ? 0.85 : 1
            })}
        >
            {icone ? (
                <View style={{ width: 48, height: 48, borderRadius: raio.md, backgroundColor: cores.destaqueSuave, alignItems: 'center', justifyContent: 'center' }}>
                    <Icone nome={icone} cor={cores.texto} tamanho={26} />
                </View>
            ) : null}
            <View style={{ flex: 1, gap: 2 }}>
                <Texto variante="subtitulo">{titulo}</Texto>
                {descricao ? <Texto cor="textoSuave">{descricao}</Texto> : null}
                {nota ? (
                    <Texto variante="corpoForte" cor="link">
                        {nota}
                    </Texto>
                ) : null}
                {children}
            </View>
            <Icone nome="avancar" cor={cores.textoSuave} tamanho={22} />
        </Pressable>
    )
}
