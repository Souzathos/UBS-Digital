import { View } from 'react-native'

import type { Categoria, StatusAgendamento } from '@/api/tipos'
import type { ChaveStatus, CoresEtiqueta } from '@/tema/paletas'
import { useTheme } from '@/tema/ThemeProvider'
import { rotuloCategoria, statusParaEquipe, statusParaPaciente } from '@/utils/rotulos'
import { Icone, type NomeIcone } from './Icone'
import { Texto } from './Texto'

type Props = {
    // Obrigatório: nenhuma etiqueta mostra estado só por cor (handoff, seção 3).
    texto: string
    cores: CoresEtiqueta
    icone?: NomeIcone
    grande?: boolean
}

export function Etiqueta({ texto, cores, icone, grande }: Props) {
    const tema = useTheme()
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-start',
                gap: grande ? 5 : 4,
                paddingVertical: grande ? 4 : 2,
                paddingHorizontal: grande ? 10 : 8,
                borderRadius: tema.raio.sm,
                borderWidth: 1.5,
                borderColor: cores.borda,
                backgroundColor: cores.fundo
            }}
        >
            {icone ? <Icone nome={icone} cor={cores.tinta} tamanho={grande ? 16 : 14} traco={2.4} /> : null}
            <Texto variante="rotulo" cor={cores.tinta} style={grande ? { fontSize: tema.fonte(14) } : undefined}>
                {texto}
            </Texto>
        </View>
    )
}

// "Médico" ou "Enfermagem" (RN-06)
export function EtiquetaCategoria({ categoria, grande }: { categoria: Categoria; grande?: boolean }) {
    const { cores } = useTheme()
    const medico = categoria === 'CONSULTA'
    return (
        <Etiqueta
            texto={rotuloCategoria(categoria)}
            cores={medico ? cores.etiquetaMedico : cores.etiquetaEnfermagem}
            icone={medico ? 'medico' : 'enfermagem'}
            grande={grande}
        />
    )
}

const ICONE_STATUS: Record<ChaveStatus, NomeIcone> = {
    confirmado: 'visto',
    pendente: 'relogio',
    remarcado: 'seta',
    cancelado: 'fechar',
    compareceu: 'visto',
    faltou: 'fechar'
}

export function EtiquetaStatus({ status, publico, grande }: { status: StatusAgendamento; publico: 'paciente' | 'equipe'; grande?: boolean }) {
    const { cores } = useTheme()
    const visual = publico === 'paciente' ? statusParaPaciente(status) : statusParaEquipe(status)
    return <Etiqueta texto={visual.texto} cores={cores.status[visual.chave]} icone={ICONE_STATUS[visual.chave]} grande={grande} />
}
