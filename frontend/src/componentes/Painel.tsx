import { View } from 'react-native'

import { useTheme } from '@/tema/ThemeProvider'
import { Icone } from './Icone'
import { Texto } from './Texto'

// Peças pequenas usadas em várias telas do painel da equipe.

// Selo de vulnerável (RN-52: só aparece no painel). O nome por extenso vai no rótulo da linha.
export function IconeSelo() {
    const { cores } = useTheme()
    return <Icone nome="selo" cor={cores.aviso} tamanho={18} traco={2.2} />
}

// Número grande com legenda ("3 compareceram"). A largura mínima cresce com a letra: com letra
// grande, os indicadores passam para a linha de baixo em vez de quebrar a palavra no meio.
export function Indicador({ valor, rotulo, exemplo }: { valor: number; rotulo: string; exemplo?: boolean }) {
    const { cores, raio, fonte } = useTheme()
    return (
        <View accessible accessibilityLabel={`${valor} ${rotulo}${exemplo ? ', exemplo' : ''}`} style={{ flexGrow: 1, flexBasis: fonte(100), minWidth: fonte(100), paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.md, backgroundColor: cores.superficie }}>
            <Texto peso="600" numeros style={{ fontSize: fonte(22), lineHeight: fonte(26) }}>
                {String(valor)}
            </Texto>
            <Texto variante="legenda" cor="textoSuave">
                {rotulo}
                {exemplo && __DEV__ ? ' (exemplo)' : ''}
            </Texto>
        </View>
    )
}

// "Osvaldo Menezes" → "Osvaldo M." (listas da agenda, como no design)
export function nomeCurto(nome: string) {
    const partes = nome.trim().split(/\s+/)
    return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1][0]}.` : partes[0]
}
