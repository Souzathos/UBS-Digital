import { Platform } from 'react-native'
import Svg, { Path } from 'react-native-svg'

// Ícones de traço das telas do design (viewBox 24 × 24). Os caminhos foram copiados dos
// arquivos .dc.html para manter o mesmo desenho. Ícones são sempre decorativos: o texto ao lado
// diz o que é, e o leitor de tela não os anuncia.
export const icones = {
    relogio: 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    visto: 'M5 12l4.5 4.5L19 7',
    fechar: 'M6 6l12 12M18 6L6 18',
    seta: 'M4 12h14M13 6l6 6-6 6',
    voltar: 'M15 5l-7 7 7 7',
    avancar: 'M9 5l7 7-7 7',
    medico: 'M6 3v5a4 4 0 008 0V3M10 12v3a5 5 0 0010 0v-2M20 13a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z',
    enfermagem: 'M9 4h6v5h5v6h-5v5H9v-5H4V9h5z',
    acessibilidade: 'M12 2.5a1.6 1.6 0 110 3.2 1.6 1.6 0 010-3.2zM5 8.5l7 1.5 7-1.5M12 10v4.5M12 14.5L9 21M12 14.5l3 6.5',
    calendario: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    calendarioVisto: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4',
    mais: 'M12 5v14M5 12h14',
    pessoa: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
    troca: 'M4 9h13l-3-3M20 15H7l3 3',
    sino: 'M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 21h4',
    contraste: 'M12 3a9 9 0 100 18V3zM21 12a9 9 0 01-9 9M12 3a9 9 0 019 9',
    ouvir: 'M4 9v6h4l5 4V5L8 9H4zM16 9a3.5 3.5 0 010 6M18.5 6.5a7 7 0 010 11',
    parar: 'M7 7h10v10H7z',
    alerta: 'M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
    info: 'M12 16v-5M12 8h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    pausa: 'M9 6v12M15 6v12',
    erro: 'M12 7v6M12 16.5v.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    olho: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
    olhoFechado: 'M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.1M6.6 6.6A17 17 0 002 12s3.5 7 10 7a9.6 9.6 0 005.4-1.6M9.9 9.9a3 3 0 004.2 4.2'
} as const

export type NomeIcone = keyof typeof icones

type Props = {
    nome: NomeIcone
    tamanho?: number
    cor: string
    traco?: number
}

// No celular, `accessible={false}` esconde o ícone do VoiceOver/TalkBack. Na web o react-native-svg
// repassaria essas props cruas para o <svg> (o React reclama); lá o equivalente é aria-hidden.
const ESCONDIDO_DO_LEITOR = (Platform.OS === 'web'
    ? { 'aria-hidden': true }
    : { accessible: false, importantForAccessibility: 'no-hide-descendants' }) as object

export function Icone({ nome, tamanho = 22, cor, traco = 2 }: Props) {
    return (
        <Svg
            width={tamanho}
            height={tamanho}
            viewBox="0 0 24 24"
            fill="none"
            stroke={cor}
            strokeWidth={traco}
            strokeLinecap="round"
            strokeLinejoin="round"
            {...ESCONDIDO_DO_LEITOR}
        >
            <Path d={icones[nome]} />
        </Svg>
    )
}
