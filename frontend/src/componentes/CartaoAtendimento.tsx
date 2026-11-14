import { Pressable, View } from 'react-native'

import type { Agendamento } from '@/api/tipos'
import { useTheme } from '@/tema/ThemeProvider'
import { formatarDataHora, formatarDiaMes, formatarDiaSemana, formatarHora } from '@/utils/datas'
import { leituraAtendimento, rotuloCategoria } from '@/utils/rotulos'
import { Botao } from './Botao'
import { Cartao } from './Cartao'
import { EtiquetaCategoria, EtiquetaStatus } from './Etiqueta'
import { Texto } from './Texto'

// Um atendimento do paciente nas três formas de "Meus atendimentos" (design
// paciente/meus-atendimentos-confirmado-e-historico). Os botões seguem `acoes` da API: a tela não
// decide o que pode ser feito.

type PropsProximo = {
    agendamento: Agendamento
    aoAbrir: () => void
    aoConfirmar: () => void
    aoRemarcar: () => void
    aoCancelar: () => void
    confirmando?: boolean
}

export function CartaoProximo({ agendamento: a, aoAbrir, aoConfirmar, aoRemarcar, aoCancelar, confirmando }: PropsProximo) {
    const { cores } = useTheme()
    const confirmado = a.status === 'CONFIRMADO'
    return (
        <Cartao destaque={confirmado ? cores.sucesso : cores.primario}>
            <Pressable onPress={aoAbrir} accessibilityRole="button" accessibilityLabel={leituraAtendimento(a)} accessibilityHint="Abre os detalhes e os avisos" style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    <EtiquetaCategoria categoria={a.tipoAtendimento.categoria} grande />
                    <EtiquetaStatus status={a.status} publico="paciente" grande />
                </View>
                <Texto variante="subtitulo">{a.tipoAtendimento.nome}</Texto>
                <Texto variante="dataGrande" numeros>
                    {formatarDataHora(a.inicio)}
                </Texto>
                <Texto cor="textoSuave">
                    {a.profissional.nome} · {a.ubs.nome}
                </Texto>
                {a.tipoAtendimento.instrucoesPreparo ? <Texto variante="legenda" cor="textoSuave">Preparo: {a.tipoAtendimento.instrucoesPreparo}</Texto> : null}
            </Pressable>
            <View style={{ gap: 8, paddingTop: 6 }}>
                {a.acoes.confirmar ? <Botao titulo="Confirmar presença" variante="sucesso" grande icone="visto" carregando={confirmando} onPress={aoConfirmar} /> : null}
                {confirmado ? <Texto accessibilityLiveRegion="polite">Sua vaga está garantida. Se não puder ir, remarque ou cancele.</Texto> : null}
                {a.acoes.remarcar || a.acoes.cancelar ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {a.acoes.remarcar ? <Botao titulo="Remarcar" variante="contorno" onPress={aoRemarcar} style={{ flex: 1 }} /> : null}
                        {a.acoes.cancelar ? <Botao titulo="Cancelar" variante="perigo" onPress={aoCancelar} style={{ flex: 1 }} /> : null}
                    </View>
                ) : null}
            </View>
        </Cartao>
    )
}

// "Depois": linha compacta com a data à esquerda.
export function CartaoCompacto({ agendamento: a, aoAbrir }: { agendamento: Agendamento; aoAbrir: () => void }) {
    const { fonte } = useTheme()
    return (
        <Cartao onPress={aoAbrir} rotulo={leituraAtendimento(a)} dica="Abre os detalhes" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
            <View style={{ width: 64, alignItems: 'center' }}>
                <Texto variante="rotulo" cor="textoSuave" numeros>
                    {formatarDiaSemana(a.inicio)}
                </Texto>
                <Texto peso="700" numeros style={{ fontSize: fonte(20), lineHeight: fonte(23) }}>
                    {formatarDiaMes(a.inicio)}
                </Texto>
                <Texto variante="secao" numeros>
                    {formatarHora(a.inicio)}
                </Texto>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                    <EtiquetaCategoria categoria={a.tipoAtendimento.categoria} />
                    <EtiquetaStatus status={a.status} publico="paciente" />
                </View>
                <Texto variante="corpoForte">{a.tipoAtendimento.nome}</Texto>
                {a.tipoAtendimento.instrucoesPreparo ? (
                    <Texto variante="legenda" cor="textoSuave">
                        Preparo: {a.tipoAtendimento.instrucoesPreparo}
                    </Texto>
                ) : null}
            </View>
        </Cartao>
    )
}

// "Histórico": fundo suave; data riscada quando o atendimento não aconteceu naquele horário.
export function CartaoHistorico({ agendamento: a, aoAbrir }: { agendamento: Agendamento; aoAbrir: () => void }) {
    const riscado = a.status === 'REMARCADO' || a.status === 'CANCELADO_PACIENTE' || a.status === 'CANCELADO_AUTO'
    return (
        <Cartao suave onPress={aoAbrir} rotulo={leituraAtendimento(a)} dica="Abre os detalhes" style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                <EtiquetaCategoria categoria={a.tipoAtendimento.categoria} />
                <EtiquetaStatus status={a.status} publico="paciente" />
            </View>
            <Texto variante="corpoForte">{a.tipoAtendimento.nome}</Texto>
            <Texto variante="corpoForte" cor="textoSuave" numeros style={riscado ? { textDecorationLine: 'line-through' } : undefined}>
                {formatarDataHora(a.inicio)}
            </Texto>
        </Cartao>
    )
}

// Resumo de uma linha: "Médico · Consulta clínica geral · Dra. Helena · UBS Feitoria"
export function linhaResumo(a: Pick<Agendamento, 'tipoAtendimento' | 'profissional'> & { ubs?: { nome: string } }) {
    return [rotuloCategoria(a.tipoAtendimento.categoria), a.tipoAtendimento.nome, a.profissional.nome, a.ubs?.nome].filter(Boolean).join(' · ')
}
