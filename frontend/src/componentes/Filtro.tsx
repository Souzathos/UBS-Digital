import { Pressable, View } from 'react-native'

import { useTheme } from '@/tema/ThemeProvider'
import { areaToque } from '@/tema/tokens'
import { Icone, type NomeIcone } from './Icone'
import { Texto } from './Texto'

type Props = {
    rotulo: string
    selecionado: boolean
    onPress: () => void
    contagem?: number
    icone?: NomeIcone
    // Escolha múltipla (canais autorizados): o leitor de tela anuncia como caixa de seleção.
    multiplo?: boolean
}

// Pílula de filtro ou de escolha curta (Todos · Médico · Enfermagem · Faltas; Médico ou Enfermagem
// no agendar da recepção). Design: equipe/agenda-do-dia-e-presenca.
export function Filtro({ rotulo, selecionado, onPress, contagem, icone, multiplo }: Props) {
    const { cores, raio } = useTheme()
    const tinta = selecionado ? cores.sobrePrimario : cores.texto
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole={multiplo ? 'checkbox' : 'radio'}
            accessibilityLabel={contagem !== undefined ? `${rotulo}, ${contagem}` : rotulo}
            accessibilityState={{ checked: selecionado }}
            style={{
                minHeight: areaToque,
                paddingHorizontal: 12,
                borderRadius: raio.pilula,
                borderWidth: 1.5,
                borderColor: selecionado ? cores.primario : cores.bordaForte,
                backgroundColor: selecionado ? cores.primario : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6
            }}
        >
            {icone ? <Icone nome={icone} cor={tinta} tamanho={18} /> : multiplo && selecionado ? <Icone nome="visto" cor={tinta} tamanho={18} traco={3} /> : null}
            <Texto variante="secao" cor={tinta}>
                {rotulo}
            </Texto>
            {contagem !== undefined ? (
                <View style={{ minWidth: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: selecionado ? cores.sobrePrimario : cores.destaqueSuave }}>
                    <Texto variante="rotulo" peso="700" alinhar="center" numeros cor={selecionado ? cores.primario : cores.texto}>
                        {String(contagem)}
                    </Texto>
                </View>
            ) : null}
        </Pressable>
    )
}
