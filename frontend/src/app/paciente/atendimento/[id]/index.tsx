import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { mensagemDeErro } from '@/api/cliente'
import type { Agendamento } from '@/api/tipos'
import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Cartao } from '@/componentes/Cartao'
import { linhaResumo } from '@/componentes/CartaoAtendimento'
import { Carregando, ErroTela } from '@/componentes/Estados'
import { EtiquetaStatus } from '@/componentes/Etiqueta'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { estaAtivo, useAcoesPaciente, useAgendamento } from '@/hooks/paciente'
import { formatarDataHora, quandoRelativo } from '@/utils/datas'
import { leituraAtendimento, nomeDoItem } from '@/utils/rotulos'

type Etapa = 'ver' | 'confirmarCancelamento' | 'cancelado'

// Detalhe de um atendimento: confirmar, remarcar e cancelar (RN-20 a RN-22).
// Design: paciente/lembrete-confirmar-cancelar-remarcar e paciente/cancelar-com-aviso.
export default function DetalheAtendimento() {
    const params = useLocalSearchParams<{ id: string; acao?: string }>()
    const id = Number(params.id)
    const consulta = useAgendamento(id)
    const { confirmar, cancelar } = useAcoesPaciente()
    const [etapa, setEtapa] = useState<Etapa>(params.acao === 'cancelar' ? 'confirmarCancelamento' : 'ver')
    const [erro, setErro] = useState<string>()

    const a = consulta.data

    if (consulta.isPending) return <Tela cabecalho="voltar"><Carregando /></Tela>
    if (consulta.isError) return <Tela cabecalho="voltar"><ErroTela mensagem={mensagemDeErro(consulta.error)} tentarDeNovo={() => consulta.refetch()} /></Tela>
    if (!a) {
        return (
            <Tela cabecalho="voltar" titulo="Atendimento não encontrado">
                <Texto>Ele pode ter sido remarcado ou já ter saído da sua lista.</Texto>
                <Botao titulo="Ver meus atendimentos" onPress={() => router.navigate('/paciente')} />
            </Tela>
        )
    }

    const item = nomeDoItem(a.tipoAtendimento.categoria)

    async function executar(acao: 'confirmar' | 'cancelar') {
        setErro(undefined)
        try {
            if (acao === 'confirmar') await confirmar.mutateAsync(a!.id)
            else {
                await cancelar.mutateAsync(a!.id)
                setEtapa('cancelado')
            }
        } catch (e) {
            setErro(mensagemDeErro(e))
        }
    }

    if (etapa === 'confirmarCancelamento' && a.acoes.cancelar) {
        return (
            <Tela cabecalho="voltar" titulo={`Cancelar ${item === 'consulta' ? 'esta consulta' : 'este procedimento'}?`} leitura={`${leituraAtendimento(a)} A vaga fica livre para outra pessoa. Cancelar não prejudica você.`}>
                <Texto cor="textoSuave" style={{ marginTop: -6 }}>
                    A vaga fica livre para outra pessoa.
                </Texto>
                <ResumoAtendimento agendamento={a} />
                {/* RN-21: cancelar é permitido a qualquer momento antes do horário, sem perder pontos. */}
                <Aviso tipo="info">Você pode cancelar até o horário, mesmo depois de confirmar. Isso não prejudica você.</Aviso>
                {erro ? <Aviso tipo="perigo" titulo="Não foi possível cancelar">{erro}</Aviso> : null}
                <Botao titulo="Sim, cancelar" variante="perigoCheio" grande carregando={cancelar.isPending} onPress={() => executar('cancelar')} />
                <Botao titulo="Não, manter meu horário" variante="contorno" onPress={() => (params.acao === 'cancelar' ? router.back() : setEtapa('ver'))} />
            </Tela>
        )
    }

    if (etapa === 'cancelado') {
        const titulo = item === 'consulta' ? 'Consulta cancelada' : 'Procedimento cancelado'
        return (
            <Tela cabecalho="simples" titulo={titulo} leitura="A vaga fica livre para outra pessoa. Cancelar não prejudica você.">
                <View accessibilityLiveRegion="polite" style={{ gap: 14 }}>
                    <Texto cor="textoSuave" style={{ marginTop: -6 }}>
                        A vaga fica livre para outra pessoa.
                    </Texto>
                    <ResumoAtendimento agendamento={a} />
                    <Aviso tipo="sucesso" titulo="Cancelar não prejudica você" />
                    <Botao titulo="Marcar outra data" onPress={() => router.navigate('/paciente/agendar')} />
                    <Botao titulo="Ver meus atendimentos" variante="contorno" onPress={() => router.navigate('/paciente')} />
                </View>
            </Tela>
        )
    }

    const ativo = estaAtivo(a)
    const confirmado = a.status === 'CONFIRMADO'
    const titulo = !ativo ? 'Seu atendimento' : confirmado ? 'Presença confirmada' : `Sua ${item} ${quandoRelativo(a.inicio, new Date())}`

    return (
        <Tela cabecalho="voltar" titulo={titulo} leitura={leituraAtendimento(a)}>
            {confirmado ? (
                <Texto cor="textoSuave" style={{ marginTop: -6 }}>
                    Mudou de planos? Cancele ou remarque quando quiser.
                </Texto>
            ) : null}
            <ResumoAtendimento agendamento={a} />
            {erro ? <Aviso tipo="perigo" titulo="Não deu certo">{erro}</Aviso> : null}

            {a.acoes.confirmar ? <Botao titulo="Confirmar presença" variante="sucesso" grande icone="visto" carregando={confirmar.isPending} onPress={() => executar('confirmar')} /> : null}
            {a.acoes.remarcar || a.acoes.cancelar ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {a.acoes.remarcar ? <Botao titulo="Remarcar" variante="contorno" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/paciente/atendimento/[id]/remarcar', params: { id: String(a.id) } })} /> : null}
                    {a.acoes.cancelar ? <Botao titulo={confirmado ? `Cancelar ${item}` : 'Cancelar'} variante="perigo" style={{ flex: 1 }} onPress={() => setEtapa('confirmarCancelamento')} /> : null}
                </View>
            ) : null}
            {confirmado ? <Texto cor="textoSuave">Cancelar ou remarcar não prejudica você, nem depois de confirmar.</Texto> : null}

            {a.tipoAtendimento.instrucoesPreparo ? (
                <Aviso tipo="aviso" titulo="Preparo">
                    {a.tipoAtendimento.instrucoesPreparo}
                </Aviso>
            ) : null}

            <Cartao>
                <Texto variante="corpoForte">{a.ubs.nome}</Texto>
                <Texto cor="textoSuave">{a.ubs.endereco}</Texto>
                <Texto cor="textoSuave" numeros>
                    Telefone: {a.ubs.telefone}
                </Texto>
            </Cartao>
        </Tela>
    )
}

// Status, data grande e a linha "Médico · Consulta clínica geral · Dra. Helena · UBS Feitoria".
export function ResumoAtendimento({ agendamento: a, riscado }: { agendamento: Agendamento; riscado?: boolean }) {
    return (
        <Cartao>
            <EtiquetaStatus status={a.status} publico="paciente" grande />
            <Texto variante="dataGrande" numeros style={riscado ? { textDecorationLine: 'line-through' } : undefined}>
                {formatarDataHora(a.inicio)}
            </Texto>
            <Texto cor="textoSuave">{linhaResumo(a)}</Texto>
        </Cartao>
    )
}
