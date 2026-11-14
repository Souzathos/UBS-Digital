import { useState } from 'react'
import { FlatList, Modal, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { Rua } from '@/api/tipos'
import { useTheme } from '@/tema/ThemeProvider'
import { areaToque } from '@/tema/tokens'
import { Botao } from './Botao'
import { Icone } from './Icone'
import { Texto } from './Texto'

type Props = {
    ruas: Rua[]
    selecionada: number | null
    aoEscolher: (rua: Rua) => void
    erro?: string
}

// Escolha da rua no cadastro e na ficha. Cada rua mostra o médico de referência: é a rua que
// define o médico da consulta (RN-06), ninguém escolhe médico. Design: equipe/cadastrar-paciente-medico-pela-rua.
export function SeletorRua({ ruas, selecionada, aoEscolher, erro }: Props) {
    const { cores, raio, animacao } = useTheme()
    const insets = useSafeAreaInsets()
    const [aberto, setAberto] = useState(false)
    const rua = ruas.find(r => r.id === selecionada)

    return (
        <View style={{ gap: 6 }}>
            <Texto variante="subtitulo">Rua *</Texto>
            <Pressable
                onPress={() => setAberto(true)}
                accessibilityRole="button"
                accessibilityLabel={`Rua: ${rua ? rua.nome : 'nenhuma escolhida'}`}
                accessibilityHint="Abre a lista de ruas"
                style={{ minHeight: 56, paddingHorizontal: 14, borderWidth: 1.5, borderColor: erro ? cores.perigo : cores.bordaForte, borderRadius: raio.md, backgroundColor: cores.superficie, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
                <Texto variante="corpoForte" cor={rua ? 'texto' : 'textoSuave'} style={{ flex: 1 }}>
                    {rua ? rua.nome : 'Escolha a rua'}
                </Texto>
                <Icone nome="avancar" cor={cores.textoSuave} tamanho={20} />
            </Pressable>
            {erro ? (
                <Texto cor="perigo" peso="600">
                    {erro}
                </Texto>
            ) : null}

            <Modal visible={aberto} animationType={animacao ? 'slide' : 'none'} onRequestClose={() => setAberto(false)}>
                <View style={{ flex: 1, backgroundColor: cores.fundo, paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 12, gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Texto variante="titulo" titulo>
                            Escolha a rua
                        </Texto>
                        <Botao titulo="Fechar" variante="contorno" onPress={() => setAberto(false)} />
                    </View>
                    <FlatList
                        data={ruas}
                        keyExtractor={r => String(r.id)}
                        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                        renderItem={({ item }) => {
                            const sel = item.id === selecionada
                            return (
                                <Pressable
                                    onPress={() => {
                                        aoEscolher(item)
                                        setAberto(false)
                                    }}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: sel }}
                                    accessibilityLabel={`${item.nome}. Médico de referência: ${item.medicoReferencia.nome}`}
                                    style={{ minHeight: areaToque + 12, padding: 12, borderRadius: raio.md, borderWidth: sel ? 2 : 1, borderColor: sel ? cores.link : cores.borda, backgroundColor: sel ? cores.destaqueSuave : cores.superficie }}
                                >
                                    <Texto variante="corpoForte">{item.nome}</Texto>
                                    <Texto cor="textoSuave">Médico: {item.medicoReferencia.nome}</Texto>
                                </Pressable>
                            )
                        }}
                    />
                </View>
            </Modal>
        </View>
    )
}
