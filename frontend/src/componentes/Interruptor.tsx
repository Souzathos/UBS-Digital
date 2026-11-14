import { ActivityIndicator, Pressable, View } from 'react-native'

import { useTheme } from '@/tema/ThemeProvider'
import { areaToque } from '@/tema/tokens'
import { Texto } from './Texto'

type Props = {
    rotulo: string
    detalhe?: string
    ligado: boolean
    alternar: () => void
    salvando?: boolean
    desabilitado?: boolean
}

// Liga e desliga com o estado escrito ao lado ("Ligado" / "Desligado"), nunca só pela cor.
// Design: paciente/perfil-do-paciente (canais) e equipe/contato-consentimento-e-selo (selo).
export function Interruptor({ rotulo, detalhe, ligado, alternar, salvando, desabilitado }: Props) {
    const { cores, fonte } = useTheme()
    const trilho = ligado ? cores.sucesso : cores.fundo
    return (
        <Pressable
            onPress={alternar}
            disabled={desabilitado || salvando}
            accessibilityRole="switch"
            accessibilityLabel={rotulo}
            accessibilityHint={detalhe}
            accessibilityState={{ checked: ligado, disabled: !!desabilitado, busy: !!salvando }}
            style={{ minHeight: areaToque + 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: desabilitado ? 0.55 : 1 }}
        >
            <View style={{ flex: 1 }}>
                <Texto variante="corpoForte">{rotulo}</Texto>
                {detalhe ? (
                    <Texto cor="textoSuave" style={{ fontSize: fonte(14) }}>
                        {detalhe}
                    </Texto>
                ) : null}
            </View>
            <Texto variante="rotulo" cor={ligado ? 'sucesso' : 'textoSuave'} style={{ fontSize: fonte(14) }}>
                {ligado ? 'Ligado' : 'Desligado'}
            </Texto>
            {salvando ? (
                <ActivityIndicator color={cores.texto} />
            ) : (
                <View style={{ width: 52, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: ligado ? cores.sucesso : cores.bordaForte, backgroundColor: trilho, padding: 2, alignItems: ligado ? 'flex-end' : 'flex-start' }}>
                    <View style={{ width: 23, height: 23, borderRadius: 12, backgroundColor: ligado ? cores.sobreSucesso : cores.bordaForte }} />
                </View>
            )}
        </Pressable>
    )
}
