import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Icone, type NomeIcone } from '@/componentes/Icone'
import { Texto } from '@/componentes/Texto'
import { criarEstilos } from '@/tema/criarEstilos'
import { useTheme } from '@/tema/ThemeProvider'
import type { TamanhoLetra } from '@/tema/tokens'
import { useFala } from './leitura'
import { usePreferencias } from './PreferenciasProvider'

type Props = {
    visivel: boolean
    fechar: () => void
    // Resumo da tela atual para "Ouvir esta tela". Sem resumo, o botão não aparece.
    leitura?: string
}

const TAMANHOS: { valor: TamanhoLetra; nome: string; amostra: number }[] = [
    { valor: 'normal', nome: 'Normal', amostra: 18 },
    { valor: 'grande', nome: 'Grande', amostra: 24 },
    { valor: 'muitoGrande', nome: 'Muito grande', amostra: 30 }
]

// Painel que sobe de baixo, como no design (paciente/menu-de-acessibilidade). Tudo o que muda
// aqui muda o tema na hora, inclusive o próprio painel.
export function MenuAcessibilidade({ visivel, fechar, leitura }: Props) {
    const tema = useTheme()
    const e = useEstilos()
    const insets = useSafeAreaInsets()
    const { preferencias, definir } = usePreferencias()
    const { lendo, falar, parar } = useFala()

    function aoFechar() {
        parar()
        fechar()
    }

    return (
        <Modal
            visible={visivel}
            transparent
            animationType={tema.animacao ? 'slide' : 'none'}
            onRequestClose={aoFechar}
            statusBarTranslucent
        >
            <View style={e.fundo}>
                <Pressable style={{ flex: 1 }} onPress={aoFechar} accessibilityLabel="Fechar acessibilidade" accessibilityRole="button" />
                <View style={[e.painel, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]} accessibilityViewIsModal>
                    <ScrollView contentContainerStyle={{ gap: 14 }} bounces={false}>
                        <View style={e.topo}>
                            <Texto titulo variante="titulo" peso="700" style={{ fontSize: tema.fonte(24) }}>
                                Acessibilidade
                            </Texto>
                            <Pressable onPress={aoFechar} accessibilityRole="button" accessibilityLabel="Fechar" style={e.fechar}>
                                <Texto variante="botao" style={{ fontSize: tema.fonte(16) }}>
                                    Fechar
                                </Texto>
                            </Pressable>
                        </View>

                        <View style={{ gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel="Tamanho da letra">
                            <Texto variante="subtitulo" style={{ fontSize: tema.fonte(17) }}>
                                Tamanho da letra
                            </Texto>
                            <View style={e.tamanhos}>
                                {TAMANHOS.map(t => {
                                    const sel = preferencias.tamanhoLetra === t.valor
                                    const tinta = sel ? tema.cores.fundo : tema.cores.texto
                                    return (
                                        <Pressable
                                            key={t.valor}
                                            onPress={() => definir({ tamanhoLetra: t.valor })}
                                            accessibilityRole="radio"
                                            accessibilityLabel={t.nome}
                                            accessibilityState={{ checked: sel }}
                                            style={[e.tamanho, sel && { backgroundColor: tema.cores.texto }]}
                                        >
                                            {/* A amostra não cresce com a escala: mostra o tamanho de cada opção. */}
                                            <Texto peso="700" cor={tinta} allowFontScaling={false} style={{ fontSize: t.amostra, lineHeight: t.amostra + 4 }}>
                                                A
                                            </Texto>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                                {sel ? <Icone nome="visto" cor={tinta} tamanho={14} traco={3} /> : null}
                                                <Texto variante="rotulo" cor={tinta} alinhar="center" style={{ fontSize: tema.fonte(14) }}>
                                                    {t.nome}
                                                </Texto>
                                            </View>
                                        </Pressable>
                                    )
                                })}
                            </View>
                        </View>

                        <Chave
                            icone="contraste"
                            titulo="Alto contraste"
                            descricao="Fundo preto e letras brancas"
                            ligado={preferencias.altoContraste}
                            alternar={() => definir({ altoContraste: !preferencias.altoContraste })}
                        />
                        <Chave
                            icone="pausa"
                            titulo="Menos animação"
                            descricao="As telas trocam sem movimento"
                            ligado={preferencias.menosAnimacao}
                            alternar={() => definir({ menosAnimacao: !preferencias.menosAnimacao })}
                        />

                        {leitura ? (
                            <View style={{ gap: 8 }}>
                                <Pressable
                                    onPress={() => (lendo ? parar() : falar(leitura))}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: lendo }}
                                    style={e.ouvir}
                                >
                                    <Icone nome={lendo ? 'parar' : 'ouvir'} cor={tema.cores.fundo} tamanho={26} />
                                    <Texto variante="botaoGrande" cor={tema.cores.fundo} style={{ fontSize: tema.fonte(18) }}>
                                        {lendo ? 'Parar de ouvir' : 'Ouvir esta tela'}
                                    </Texto>
                                </Pressable>
                                {lendo ? (
                                    <View style={e.lendo} accessibilityLiveRegion="polite">
                                        <Texto>Lendo: “{leitura}”</Texto>
                                    </View>
                                ) : null}
                            </View>
                        ) : null}

                        <Texto cor="textoSuave" style={{ fontSize: tema.fonte(14) }}>
                            Suas escolhas ficam salvas neste celular.
                        </Texto>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    )
}

type PropsChave = { icone: NomeIcone; titulo: string; descricao: string; ligado: boolean; alternar: () => void }

function Chave({ icone, titulo, descricao, ligado, alternar }: PropsChave) {
    const tema = useTheme()
    const e = useEstilos()
    return (
        <Pressable onPress={alternar} accessibilityRole="switch" accessibilityLabel={titulo} accessibilityHint={descricao} accessibilityState={{ checked: ligado }} style={e.chave}>
            <Icone nome={icone} cor={tema.cores.texto} tamanho={26} />
            <View style={{ flex: 1 }}>
                <Texto variante="subtitulo" style={{ fontSize: tema.fonte(17) }}>
                    {titulo}
                </Texto>
                <Texto cor="textoSuave" style={{ fontSize: tema.fonte(14) }}>
                    {descricao}
                </Texto>
            </View>
            {/* Estado escrito, não só a cor da chave. */}
            <View style={[e.estadoChave, ligado && { backgroundColor: tema.cores.texto }]}>
                <Texto variante="rotulo" peso="700" cor={ligado ? tema.cores.fundo : tema.cores.texto} alinhar="center" style={{ fontSize: tema.fonte(14) }}>
                    {ligado ? 'Ligado' : 'Desligado'}
                </Texto>
            </View>
        </Pressable>
    )
}

const useEstilos = criarEstilos(t => ({
    fundo: { flex: 1, backgroundColor: t.cores.sobreposicao },
    painel: {
        maxHeight: '88%',
        paddingTop: 18,
        paddingHorizontal: t.espaco.lg,
        borderTopLeftRadius: t.raio.xl,
        borderTopRightRadius: t.raio.xl,
        borderTopWidth: 2,
        borderColor: t.cores.texto,
        backgroundColor: t.cores.fundo
    },
    topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    fechar: {
        minHeight: 48,
        paddingHorizontal: 14,
        borderWidth: 1.5,
        borderColor: t.cores.texto,
        borderRadius: t.raio.pilula,
        justifyContent: 'center'
    },
    tamanhos: { flexDirection: 'row', gap: 8 },
    tamanho: {
        flex: 1,
        minHeight: 84,
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: t.cores.texto,
        borderRadius: t.raio.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2
    },
    chave: {
        minHeight: 64,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1.5,
        borderColor: t.cores.texto,
        borderRadius: t.raio.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    estadoChave: {
        minWidth: 92,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: t.cores.texto
    },
    ouvir: {
        minHeight: 60,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: t.raio.md,
        backgroundColor: t.cores.texto,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10
    },
    lendo: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: t.raio.md,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: t.cores.texto
    }
}))
