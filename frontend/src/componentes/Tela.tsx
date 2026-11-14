import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useState, type ReactNode } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { MenuAcessibilidade } from '@/acessibilidade/MenuAcessibilidade'
import { REDE_NOME } from '@/config'
import { criarEstilos } from '@/tema/criarEstilos'
import { useTheme } from '@/tema/ThemeProvider'
import { areaToque } from '@/tema/tokens'
import { EtiquetaExemplo } from './Estados'
import { Icone } from './Icone'
import { Texto } from './Texto'
import { useNomeUbs } from '@/sessao/SessaoProvider'

type Props = {
    children: ReactNode
    // Título grande da tela (h1). Também vira o começo da leitura em voz alta.
    titulo?: string
    // Resumo da tela para "Ouvir esta tela" no menu de acessibilidade.
    leitura?: string
    // ubs: logo e nome da UBS (telas principais) · voltar: botão de voltar (telas internas)
    // · simples: só o botão de acessibilidade (login)
    cabecalho?: 'ubs' | 'voltar' | 'simples'
    // Conteúdo fixo embaixo, fora da rolagem (botão principal de um fluxo).
    rodape?: ReactNode
    rolagem?: boolean
    // Puxar a tela para baixo para atualizar.
    atualizando?: boolean
    aoAtualizar?: () => void
    // Tela da Camada 2 com dados falsos: mostra a etiqueta "Exemplo" em desenvolvimento.
    exemplo?: boolean
    // O que o botão de voltar faz (padrão: voltar na pilha). Fluxos em passos voltam um passo.
    aoVoltar?: () => void
    // Texto no meio do cabeçalho ("Passo 2 de 4").
    meio?: string
    // Ação principal ao lado do título (o "Agendar" e o "Cadastrar" do painel).
    acaoTitulo?: ReactNode
}

// Moldura de todas as telas do app. Garante em um lugar só o que o handoff pede para todas:
// botão de acessibilidade, área segura, fundo da paleta certa e título marcado para leitor de tela.
export function Tela({ children, titulo, leitura, cabecalho = 'ubs', rodape, rolagem = true, atualizando, aoAtualizar, exemplo, aoVoltar, meio, acaoTitulo }: Props) {
    const tema = useTheme()
    const e = useEstilos()
    const insets = useSafeAreaInsets()
    const nomeUbs = useNomeUbs()
    const [menuAberto, setMenuAberto] = useState(false)
    // No painel, o subtítulo diz onde a pessoa está e o logo ganha uma caixa branca (design da equipe).
    const painel = tema.variante === 'equipe'
    const subtitulo = painel ? 'Painel da equipe' : REDE_NOME

    const topo = (
        <View style={e.cabecalho}>
            {cabecalho === 'ubs' ? (
                <View style={e.marca} accessible accessibilityLabel={`${nomeUbs}, ${subtitulo}`}>
                    <View style={painel ? e.caixaLogo : undefined}>
                        <Image source={require('../../assets/imagens/logo-ubs.png')} style={painel ? e.logoPainel : e.logo} resizeMode="contain" accessible={false} />
                    </View>
                    <View style={{ flexShrink: 1 }}>
                        <Texto variante="subtitulo" peso="600" style={{ lineHeight: tema.fonte(21) }}>
                            {nomeUbs}
                        </Texto>
                        <Texto variante="legenda" cor="textoSuave" style={{ fontSize: tema.fonte(12) }}>
                            {subtitulo}
                        </Texto>
                    </View>
                </View>
            ) : cabecalho === 'voltar' ? (
                <Pressable onPress={aoVoltar ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} accessibilityRole="button" accessibilityLabel="Voltar" style={e.voltar}>
                    <Icone nome="voltar" cor={tema.cores.texto} tamanho={24} traco={2.2} />
                </Pressable>
            ) : (
                <View />
            )}
            {meio ? (
                <Texto variante="secao" cor="textoSuave" numeros style={{ flex: 1, textAlign: 'center' }}>
                    {meio}
                </Texto>
            ) : null}
            <Pressable onPress={() => setMenuAberto(true)} accessibilityRole="button" accessibilityLabel="Acessibilidade" accessibilityHint="Tamanho da letra, alto contraste e ouvir esta tela" style={e.botaoAcessibilidade}>
                <Icone nome="acessibilidade" cor={tema.cores.texto} tamanho={22} />
                <Texto variante="rotulo" style={{ fontSize: tema.fonte(14) }}>
                    Acessibilidade
                </Texto>
            </Pressable>
        </View>
    )

    const corpo = (
        <>
            {topo}
            {exemplo ? <EtiquetaExemplo /> : null}
            {titulo ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <Texto variante="titulo" titulo style={{ flexShrink: 1 }}>
                        {titulo}
                    </Texto>
                    {acaoTitulo}
                </View>
            ) : null}
            {children}
        </>
    )

    const leituraCompleta = [titulo, leitura].filter(Boolean).join('. ')

    return (
        <View style={e.raiz}>
            <StatusBar style={tema.cores.escuro ? 'light' : 'dark'} />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {rolagem ? (
                    <ScrollView
                        contentContainerStyle={[e.conteudo, { paddingTop: insets.top + tema.espaco.sm }]}
                        keyboardShouldPersistTaps="handled"
                        refreshControl={aoAtualizar ? <RefreshControl refreshing={!!atualizando} onRefresh={aoAtualizar} tintColor={tema.cores.texto} /> : undefined}
                    >
                        {corpo}
                    </ScrollView>
                ) : (
                    <View style={[e.conteudo, { flex: 1, paddingTop: insets.top + tema.espaco.sm }]}>{corpo}</View>
                )}
                {rodape ? <View style={[e.rodape, { paddingBottom: tema.espaco.md }]}>{rodape}</View> : null}
            </KeyboardAvoidingView>
            <MenuAcessibilidade visivel={menuAberto} fechar={() => setMenuAberto(false)} leitura={leituraCompleta || undefined} />
        </View>
    )
}

const useEstilos = criarEstilos(t => ({
    raiz: { flex: 1, backgroundColor: t.cores.fundo },
    conteudo: { paddingHorizontal: t.espaco.lg, paddingBottom: t.espaco.xl, gap: 14 },
    cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    marca: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
    logo: { width: 49, height: 36 },
    caixaLogo: { paddingVertical: 3, paddingHorizontal: 5, borderRadius: 8, backgroundColor: '#FFFFFF' },
    logoPainel: { width: 42, height: 31 },
    voltar: {
        width: areaToque,
        height: areaToque,
        borderRadius: areaToque / 2,
        borderWidth: 1.5,
        borderColor: t.cores.texto,
        backgroundColor: t.cores.superficie,
        alignItems: 'center',
        justifyContent: 'center'
    },
    botaoAcessibilidade: {
        minHeight: areaToque,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: t.cores.bordaForte,
        borderRadius: t.raio.md,
        backgroundColor: t.cores.superficie,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    rodape: {
        paddingHorizontal: t.espaco.lg,
        paddingTop: t.espaco.sm,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: t.cores.borda,
        backgroundColor: t.cores.fundo
    }
}))
