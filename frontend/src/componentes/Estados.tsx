import { ActivityIndicator, View } from 'react-native'

import { useTheme } from '@/tema/ThemeProvider'
import { Aviso } from './Aviso'
import { Botao } from './Botao'
import { Texto } from './Texto'

// Os três estados que toda tela com dados da API pode ter, sempre com o mesmo visual.

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
    const { cores, espaco } = useTheme()
    return (
        <View accessibilityRole="progressbar" accessibilityLabel={texto} style={{ alignItems: 'center', gap: espaco.sm, paddingVertical: espaco.xxl }}>
            <ActivityIndicator size="large" color={cores.texto} />
            <Texto cor="textoSuave">{texto}</Texto>
        </View>
    )
}

export function Vazio({ texto }: { texto: string }) {
    const { cores, espaco, raio } = useTheme()
    return (
        <View style={{ padding: espaco.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: cores.bordaForte, borderRadius: raio.md }}>
            <Texto cor="textoSuave">{texto}</Texto>
        </View>
    )
}

// Mostra a `message` que a API devolveu (já pensada para o usuário final) e deixa tentar de novo.
export function ErroTela({ mensagem, tentarDeNovo }: { mensagem: string; tentarDeNovo?: () => void }) {
    const { espaco } = useTheme()
    return (
        <View style={{ gap: espaco.sm }}>
            <Aviso tipo="perigo" titulo="Não deu certo">
                {mensagem}
            </Aviso>
            {tentarDeNovo ? <Botao titulo="Tentar de novo" variante="contorno" onPress={tentarDeNovo} /> : null}
        </View>
    )
}

// Etiqueta das telas que ainda usam dados falsos (Camada 2). Só aparece em desenvolvimento.
export function EtiquetaExemplo() {
    const { cores, raio } = useTheme()
    if (!__DEV__) return null
    return (
        <View
            accessibilityLabel="Tela com dados de exemplo"
            style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: raio.sm, borderWidth: 1.5, borderStyle: 'dashed', borderColor: cores.textoSuave }}
        >
            <Texto variante="rotulo" cor="textoSuave">
                Exemplo
            </Texto>
        </View>
    )
}
