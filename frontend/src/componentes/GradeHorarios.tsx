import { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'

import type { Slot } from '@/api/tipos'
import { useTheme } from '@/tema/ThemeProvider'
import { areaToque } from '@/tema/tokens'
import { dataPorExtenso, diaISO, formatarDia, formatarHora } from '@/utils/datas'
import { Botao } from './Botao'
import { Vazio } from './Estados'
import { Icone } from './Icone'
import { Texto } from './Texto'

type Props = {
    slots: Slot[]
    selecionado: number | null
    aoEscolher: (slot: Slot) => void
    // Horários que acabaram de ser ocupados (409): aparecem riscados e não podem ser escolhidos.
    ocupados?: number[]
    // Painel: marca os horários guardados para o balcão (origem RECEPCAO, fora da cota do app).
    marcarReservados?: boolean
    vazio?: string
}

const DIAS_POR_VEZ = 7

// Horários livres agrupados por dia e profissional, como nas telas Remarcar, Agendar 3 e Agendar
// pela recepção. Mostra uma semana de dias por vez para a lista não ficar enorme.
export function GradeHorarios({ slots, selecionado, aoEscolher, ocupados = [], marcarReservados, vazio = 'Nenhum horário livre por enquanto.' }: Props) {
    const tema = useTheme()
    const [diasVisiveis, setDiasVisiveis] = useState(DIAS_POR_VEZ)

    const grupos = useMemo(() => {
        const mapa = new Map<string, { dia: string; titulo: string; profissional: string; slots: Slot[] }>()
        for (const s of [...slots].sort((x, y) => x.inicio.localeCompare(y.inicio))) {
            const dia = diaISO(s.inicio)
            const chave = `${dia}|${s.profissional.id}`
            if (!mapa.has(chave)) mapa.set(chave, { dia, titulo: formatarDia(s.inicio), profissional: s.profissional.nome, slots: [] })
            mapa.get(chave)!.slots.push(s)
        }
        return [...mapa.values()]
    }, [slots])

    if (!grupos.length) return <Vazio texto={vazio} />

    const dias = [...new Set(grupos.map(g => g.dia))]
    const diasMostrados = new Set(dias.slice(0, diasVisiveis))
    const visiveis = grupos.filter(g => diasMostrados.has(g.dia))

    return (
        <View style={{ gap: 16 }}>
            {visiveis.map(g => (
                <View key={`${g.dia}-${g.profissional}`} style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={`${g.titulo}, com ${g.profissional}`}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 }}>
                        <Texto variante="subtitulo" titulo numeros>
                            {g.titulo}
                        </Texto>
                        <Texto cor="textoSuave">com {g.profissional}</Texto>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {g.slots.map(s => {
                            const ocupado = ocupados.includes(s.id)
                            const sel = !ocupado && s.id === selecionado
                            const reservado = marcarReservados && s.origem === 'RECEPCAO'
                            const tinta = ocupado ? tema.cores.textoSuave : sel ? tema.cores.sobrePrimario : tema.cores.texto
                            return (
                                <Pressable
                                    key={s.id}
                                    onPress={() => aoEscolher(s)}
                                    disabled={ocupado}
                                    accessibilityRole="radio"
                                    accessibilityLabel={`${dataPorExtenso(s.inicio)}${reservado ? ', só recepção' : ''}${ocupado ? ', ocupado' : ''}`}
                                    accessibilityState={{ checked: sel, disabled: ocupado }}
                                    style={{
                                        minWidth: 96,
                                        minHeight: areaToque + 4,
                                        paddingHorizontal: 12,
                                        borderRadius: tema.raio.md,
                                        borderWidth: 1.5,
                                        borderStyle: reservado && !sel ? 'dashed' : 'solid',
                                        borderColor: ocupado ? tema.cores.borda : sel ? tema.cores.primario : reservado ? tema.cores.aviso : tema.cores.bordaForte,
                                        backgroundColor: ocupado ? tema.cores.fundo : sel ? tema.cores.primario : tema.cores.superficie,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'row',
                                        gap: 6
                                    }}
                                >
                                    {sel ? <Icone nome="visto" cor={tinta} tamanho={18} traco={3} /> : null}
                                    <View style={{ alignItems: 'center' }}>
                                        <Texto variante="botao" cor={tinta} numeros style={ocupado ? { textDecorationLine: 'line-through' } : undefined}>
                                            {formatarHora(s.inicio)}
                                        </Texto>
                                        {ocupado ? <Texto variante="legenda" cor={tinta}>ocupado</Texto> : null}
                                        {reservado ? (
                                            <Texto variante="legenda" cor={sel ? tinta : tema.cores.aviso} peso="600">
                                                Só recepção
                                            </Texto>
                                        ) : null}
                                    </View>
                                </Pressable>
                            )
                        })}
                    </View>
                </View>
            ))}
            {dias.length > diasVisiveis ? <Botao titulo="Ver mais dias" variante="contorno" onPress={() => setDiasVisiveis(n => n + DIAS_POR_VEZ)} /> : null}
        </View>
    )
}
