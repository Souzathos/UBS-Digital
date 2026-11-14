import type { ReactNode } from 'react'
import { View } from 'react-native'

import { useTheme } from '@/tema/ThemeProvider'
import { Icone, type NomeIcone } from './Icone'
import { Texto } from './Texto'

type Tipo = 'info' | 'aviso' | 'perigo' | 'sucesso'

type Props = {
    tipo?: Tipo
    titulo?: string
    children?: ReactNode
    // Erros são anunciados na hora pelo leitor de tela; avisos informativos, não.
    anunciar?: boolean
}

const ICONE: Record<Tipo, NomeIcone> = { info: 'info', aviso: 'alerta', perigo: 'erro', sucesso: 'visto' }

// Caixa de mensagem: erro de login, aviso antes de cancelar, orientação "procure a recepção".
export function Aviso({ tipo = 'info', titulo, children, anunciar = tipo === 'perigo' }: Props) {
    const tema = useTheme()
    const c = tema.cores
    const destaque = tipo === 'perigo' ? c.perigo : tipo === 'aviso' ? c.aviso : tipo === 'sucesso' ? c.sucesso : c.link

    return (
        <View
            accessibilityRole={anunciar ? 'alert' : 'summary'}
            accessibilityLiveRegion={anunciar ? 'assertive' : 'none'}
            style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
                paddingVertical: tema.espaco.sm,
                paddingHorizontal: 14,
                borderWidth: 2,
                borderColor: destaque,
                borderRadius: tema.raio.md,
                backgroundColor: c.superficie
            }}
        >
            <View style={{ paddingTop: 2 }}>
                <Icone nome={ICONE[tipo]} cor={tipo === 'aviso' && !tema.altoContraste ? c.texto : destaque} tamanho={22} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
                {titulo ? (
                    <Texto variante="subtitulo" cor={tipo === 'perigo' ? 'perigo' : 'texto'}>
                        {titulo}
                    </Texto>
                ) : null}
                {typeof children === 'string' ? <Texto>{children}</Texto> : children}
            </View>
        </View>
    )
}
