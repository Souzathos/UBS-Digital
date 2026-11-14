import { Text, type TextProps, type TextStyle } from 'react-native'

import type { Paleta } from '@/tema/paletas'
import { useTheme } from '@/tema/ThemeProvider'
import type { Peso, VarianteTexto } from '@/tema/tokens'

type CorTexto = keyof Pick<Paleta, 'texto' | 'textoSuave' | 'link' | 'perigo' | 'sucesso' | 'sobrePrimario' | 'sobreAviso' | 'sobreSucesso' | 'sobrePerigo'>

type Props = TextProps & {
    variante?: VarianteTexto
    cor?: CorTexto | (string & {})
    peso?: Peso
    alinhar?: TextStyle['textAlign']
    // Marca o texto como título para o leitor de tela (VoiceOver e TalkBack navegam por títulos).
    titulo?: boolean
    // Números alinhados (datas, horas, contadores), como o font-variant-numeric das telas.
    numeros?: boolean
}

// A escala do sistema (ajuste de fonte do celular) continua valendo, mas limitada: somada à nossa
// escala de 1,4 sem limite, um texto chegaria a 3× e quebraria os cartões.
const LIMITE_ESCALA_SISTEMA = 1.4

export function Texto({ variante = 'corpo', cor = 'texto', peso, alinhar, titulo, numeros, style, ...resto }: Props) {
    const tema = useTheme()
    const tipo = tema.tipografia[variante]
    const tamanho = tema.fonte(tipo.tamanho)
    const corFinal = cor in tema.cores ? (tema.cores[cor as CorTexto] as string) : cor
    const mono = variante === 'mono'

    return (
        <Text
            accessibilityRole={titulo ? 'header' : undefined}
            maxFontSizeMultiplier={LIMITE_ESCALA_SISTEMA}
            style={[
                {
                    fontFamily: mono ? tema.familia.mono : tema.familia.texto,
                    fontSize: tamanho,
                    lineHeight: Math.round(tamanho * tipo.altura),
                    fontWeight: peso ?? tipo.peso,
                    color: corFinal,
                    textAlign: alinhar,
                    fontVariant: numeros ? ['tabular-nums'] : undefined
                },
                style
            ]}
            {...resto}
        />
    )
}
