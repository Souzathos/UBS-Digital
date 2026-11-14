import type { ReactNode } from 'react'
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native'

import { useTheme } from '@/tema/ThemeProvider'

type Props = {
    children: ReactNode
    // Borda grossa e colorida (o "Próximo" atendimento, uma linha aberta da agenda).
    destaque?: string
    suave?: boolean
    onPress?: () => void
    rotulo?: string
    dica?: string
    style?: StyleProp<ViewStyle>
}

// Caixa branca (ou azul, no painel) com borda e cantos arredondados. Com onPress vira botão.
export function Cartao({ children, destaque, suave, onPress, rotulo, dica, style }: Props) {
    const { cores, raio } = useTheme()
    const base: ViewStyle = {
        backgroundColor: suave ? cores.superficieSuave : cores.superficie,
        borderWidth: destaque ? 2 : 1,
        borderColor: destaque ?? cores.borda,
        borderRadius: destaque ? raio.lg : raio.md,
        padding: destaque ? 16 : 14,
        gap: 8
    }
    if (!onPress) return <View style={[base, style]}>{children}</View>
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={rotulo}
            accessibilityHint={dica}
            style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}
        >
            {children}
        </Pressable>
    )
}
