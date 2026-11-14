import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { mensagemDeErro } from '@/api/cliente'
import type { AgendamentoEquipe } from '@/api/tipos'
import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Carregando, ErroTela, Vazio } from '@/componentes/Estados'
import { EtiquetaCategoria, EtiquetaStatus } from '@/componentes/Etiqueta'
import { Filtro } from '@/componentes/Filtro'
import { Icone } from '@/componentes/Icone'
import { IconeSelo, Indicador, nomeCurto } from '@/componentes/Painel'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useReaproveitadas } from '@/hooks/camada2'
import { useAcoesEquipe, useAgendaDoDia, useAgora, usePodeAgir, useRelogio } from '@/hooks/equipe'
import { useEquipeLogada, useSessao, useNomeUbs } from '@/sessao/SessaoProvider'
import { useTheme } from '@/tema/ThemeProvider'
import { dataPorExtenso, diaISO, formatarDiaDeISO, formatarHoraRelogio, somarDiasISO } from '@/utils/datas'
import { rotuloCategoria, rotuloPerfil, statusParaEquipe } from '@/utils/rotulos'

type FiltroAgenda = 'todos' | 'CONSULTA' | 'PROCEDIMENTO' | 'faltas'

const FILTROS: { id: FiltroAgenda; nome: string }[] = [
    { id: 'todos', nome: 'Todos' },
    { id: 'CONSULTA', nome: 'Consulta' },
    { id: 'PROCEDIMENTO', nome: 'Procedimento' },
    { id: 'faltas', nome: 'Faltas' }
]

// Agenda do dia com filtros e registro de comparecimento ou falta (seção 6, fluxo C, RN-82).
// Design: equipe/agenda-do-dia-e-presenca.
export default function Agenda() {
    const nomeUbs = useNomeUbs()
    const usuario = useEquipeLogada()
    const { sair } = useSessao()
    const podeAgir = usePodeAgir()
    const agora = useAgora()
    const relogio = useRelogio()
    const hoje = diaISO(agora)
    const [diaEscolhido, setDiaEscolhido] = useState<string | null>(null)
    const dia = diaEscolhido ?? hoje
    const agenda = useAgendaDoDia(dia)
    const [filtro, setFiltro] = useState<FiltroAgenda>('todos')
    const [aberto, setAberto] = useState<number | null>(null)
    // Camada 2 (exemplo): vagas liberadas e ocupadas por adiantamento no dia.
    const reaproveitadas = useReaproveitadas(dia)

    const lista = agenda.data ?? []
    const passa = (a: AgendamentoEquipe, f: FiltroAgenda) => (f === 'todos' ? true : f === 'faltas' ? a.status === 'FALTOU' : a.tipoAtendimento.categoria === f)
    const visiveis = lista.filter(a => passa(a, filtro))
    const compareceram = lista.filter(a => a.status === 'COMPARECEU').length
    const faltaram = lista.filter(a => a.status === 'FALTOU').length

    const titulo = dia === hoje ? 'Agenda de hoje' : `Agenda de ${formatarDiaDeISO(dia)}`
    const leitura = `${formatarDiaDeISO(dia)}. ${lista.length} atendimentos. ${compareceram} compareceram, ${faltaram} faltaram.`

    return (
        <Tela
            titulo={titulo}
            leitura={leitura}
            atualizando={agenda.isRefetching}
            aoAtualizar={() => agenda.refetch()}
            acaoTitulo={podeAgir ? <Botao titulo="Agendar" icone="mais" onPress={() => router.push('/equipe/agendar')} style={{ minHeight: 48 }} /> : undefined}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BotaoDia icone="voltar" rotulo="Dia anterior" onPress={() => setDiaEscolhido(somarDiasISO(dia, -1))} />
                <View style={{ flex: 1 }}>
                    <Texto cor="textoSuave" numeros>
                        {formatarDiaDeISO(dia)} · {nomeUbs}
                    </Texto>
                    {dia !== hoje ? <Botao titulo="Voltar para hoje" variante="texto" onPress={() => setDiaEscolhido(null)} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} /> : null}
                </View>
                <BotaoDia icone="avancar" rotulo="Próximo dia" onPress={() => setDiaEscolhido(somarDiasISO(dia, 1))} />
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel="Filtrar agenda">
                {FILTROS.map(f => (
                    <Filtro key={f.id} rotulo={f.nome} contagem={lista.filter(a => passa(a, f.id)).length} selecionado={filtro === f.id} onPress={() => setFiltro(f.id)} />
                ))}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Indicador valor={compareceram} rotulo={compareceram === 1 ? 'compareceu' : 'compareceram'} />
                <Indicador valor={faltaram} rotulo={faltaram === 1 ? 'faltou' : 'faltaram'} />
                <Indicador valor={reaproveitadas.data ?? 0} rotulo="reaproveitadas" exemplo />
            </View>

            {agenda.isPending ? (
                <Carregando />
            ) : agenda.isError ? (
                <ErroTela mensagem={mensagemDeErro(agenda.error)} tentarDeNovo={() => agenda.refetch()} />
            ) : visiveis.length ? (
                <View style={{ gap: 6 }}>
                    {visiveis.map(a => (
                        <LinhaAgenda key={a.id} agendamento={a} dia={dia} aberto={aberto === a.id} alternar={() => setAberto(x => (x === a.id ? null : a.id))} podeAgir={podeAgir} />
                    ))}
                </View>
            ) : (
                <Vazio texto={filtro === 'faltas' ? 'Nenhuma falta registrada neste dia.' : lista.length ? 'Nenhum atendimento neste filtro.' : 'Nenhum atendimento marcado neste dia.'} />
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IconeSelo />
                <Texto variante="legenda" cor="textoSuave" style={{ flex: 1 }}>
                    Selo de vulnerável. Só a equipe vê.
                </Texto>
            </View>

            <View style={{ gap: 8, paddingTop: 8 }}>
                <Texto cor="textoSuave">
                    {usuario.nome} · {rotuloPerfil(usuario.perfil)}
                </Texto>
                {relogio.data ? <Botao titulo="Relógio de testes" icone="relogio" variante="contorno" onPress={() => router.push('/equipe/relogio')} /> : null}
                <Botao titulo="Sair" variante="contorno" onPress={sair} />
            </View>
        </Tela>
    )
}

function BotaoDia({ icone, rotulo, onPress }: { icone: 'voltar' | 'avancar'; rotulo: string; onPress: () => void }) {
    const { cores } = useTheme()
    return (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={rotulo} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: cores.bordaForte, alignItems: 'center', justifyContent: 'center' }}>
            <Icone nome={icone} cor={cores.texto} tamanho={22} traco={2.2} />
        </Pressable>
    )
}

type PropsLinha = { agendamento: AgendamentoEquipe; dia: string; aberto: boolean; alternar: () => void; podeAgir: boolean }

// Uma linha da agenda. Tocar abre o registro de presença (só para pendente ou confirmado).
function LinhaAgenda({ agendamento: a, dia, aberto, alternar, podeAgir }: PropsLinha) {
    const { cores, raio, fonte } = useTheme()
    const { presenca } = useAcoesEquipe()
    const [erro, setErro] = useState<string>()
    const ativo = a.status === 'PENDENTE' || a.status === 'CONFIRMADO'

    async function registrar(resultado: 'COMPARECEU' | 'FALTOU') {
        setErro(undefined)
        try {
            await presenca.mutateAsync({ id: a.id, resultado })
            alternar()
        } catch (e) {
            // Ex.: antes do dia da consulta a API recusa (400) com a mensagem certa.
            setErro(mensagemDeErro(e))
        }
    }

    const rotulo = `${formatarHoraRelogio(a.inicio)}. ${a.paciente.nome}${a.paciente.vulneravel ? ', selo de vulnerável' : ''}. ${rotuloCategoria(a.tipoAtendimento.categoria)}, ${a.tipoAtendimento.nome}. ${a.profissional.nome}. ${statusParaEquipe(a.status).texto}.`

    return (
        <View style={{ borderWidth: 1, borderColor: aberto ? cores.link : cores.borda, borderRadius: raio.md, backgroundColor: cores.superficie }}>
            <Pressable onPress={alternar} accessibilityRole="button" accessibilityLabel={rotulo} accessibilityState={{ expanded: aberto }} style={{ minHeight: 64, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Texto variante="mono" style={{ width: 48 }}>
                    {formatarHoraRelogio(a.inicio)}
                </Texto>
                <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <Texto variante="corpoForte">{nomeCurto(a.paciente.nome)}</Texto>
                        {/* RN-52: o selo só aparece no painel. */}
                        {a.paciente.vulneravel ? <IconeSelo /> : null}
                        <EtiquetaCategoria categoria={a.tipoAtendimento.categoria} />
                    </View>
                    <Texto variante="rotulo" cor="textoSuave" style={{ fontSize: fonte(14) }}>
                        {a.tipoAtendimento.nome} · {a.profissional.nome}
                    </Texto>
                </View>
                <EtiquetaStatus status={a.status} publico="equipe" />
            </Pressable>
            {aberto ? (
                <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}>
                    {podeAgir && ativo ? (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Botao titulo="Compareceu" style={{ flex: 1 }} carregando={presenca.isPending && presenca.variables?.resultado === 'COMPARECEU'} onPress={() => registrar('COMPARECEU')} />
                            <Botao titulo="Faltou" variante="contorno" style={{ flex: 1 }} carregando={presenca.isPending && presenca.variables?.resultado === 'FALTOU'} onPress={() => registrar('FALTOU')} />
                        </View>
                    ) : null}
                    {erro ? <Aviso tipo="aviso">{erro}</Aviso> : null}
                    <Texto variante="legenda" cor="textoSuave">
                        {dataPorExtenso(a.inicio)}
                    </Texto>
                    <Botao titulo="Ver detalhes e ações" variante="texto" onPress={() => router.push({ pathname: '/equipe/agendamento/[id]', params: { id: String(a.id), dia } })} />
                </View>
            ) : null}
        </View>
    )
}
