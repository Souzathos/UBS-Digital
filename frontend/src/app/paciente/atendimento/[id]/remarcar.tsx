import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { ApiErro, mensagemDeErro } from '@/api/cliente'
import type { Agendamento, Slot } from '@/api/tipos'
import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Cartao } from '@/componentes/Cartao'
import { linhaResumo } from '@/componentes/CartaoAtendimento'
import { Carregando, ErroTela } from '@/componentes/Estados'
import { EtiquetaCategoria, EtiquetaStatus } from '@/componentes/Etiqueta'
import { GradeHorarios } from '@/componentes/GradeHorarios'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useAcoesPaciente, useAgendamento, useSlots } from '@/hooks/paciente'
import { usePacienteLogado } from '@/sessao/SessaoProvider'
import { dataPorExtenso, formatarDataHora } from '@/utils/datas'

type Etapa = 'escolher' | 'conferir' | 'feito'

// Remarcar (RN-22): troca direta por um horário livre do mesmo tipo. O novo já nasce confirmado
// e o antigo vai para outra pessoa. Em consulta médica, a API só devolve horários do médico da
// rua (RN-06). Design: paciente/remarcar.
export default function Remarcar() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const paciente = usePacienteLogado()
    const consulta = useAgendamento(Number(id))
    const original = consulta.data
    const horarios = useSlots(original ? { tipoAtendimentoId: original.tipoAtendimento.id } : null)
    const { remarcar } = useAcoesPaciente()

    const [etapa, setEtapa] = useState<Etapa>('escolher')
    const [escolhido, setEscolhido] = useState<Slot | null>(null)
    const [ocupados, setOcupados] = useState<number[]>([])
    const [erro, setErro] = useState<string>()
    // Guarda os dois lados da troca para a tela final (a lista muda depois da ação).
    const [troca, setTroca] = useState<{ antes: Agendamento; novo: Agendamento }>()

    if (etapa === 'feito' && troca) {
        return (
            <Tela cabecalho="simples" titulo="Atendimento remarcado" leitura={`Nova data: ${dataPorExtenso(troca.novo.inicio)}. Já está confirmada.`}>
                <View accessibilityLiveRegion="polite" style={{ gap: 14 }}>
                    <Cartao destaque={undefined}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            <EtiquetaCategoria categoria={troca.novo.tipoAtendimento.categoria} />
                            <EtiquetaStatus status={troca.novo.status} publico="paciente" />
                        </View>
                        <Texto variante="subtitulo">{troca.novo.tipoAtendimento.nome}</Texto>
                        <Texto variante="dataGrande" numeros>
                            {formatarDataHora(troca.novo.inicio)}
                        </Texto>
                        <Texto cor="textoSuave">
                            {troca.novo.profissional.nome} · {troca.novo.ubs.nome}
                        </Texto>
                    </Cartao>
                    <Cartao suave>
                        <Texto variante="rotulo" cor="textoSuave">
                            Antes era
                        </Texto>
                        <Texto variante="corpoForte" cor="textoSuave" numeros style={{ textDecorationLine: 'line-through' }}>
                            {formatarDataHora(troca.antes.inicio)}
                        </Texto>
                    </Cartao>
                    <Texto>Os avisos agora seguem a nova data, só para lembrar.</Texto>
                    <Botao titulo="Ver meus atendimentos" onPress={() => router.navigate('/paciente')} />
                </View>
            </Tela>
        )
    }

    if (consulta.isPending) return <Tela cabecalho="voltar"><Carregando /></Tela>
    if (!original || !original.acoes.remarcar) {
        return (
            <Tela cabecalho="voltar" titulo="Remarcar">
                <Aviso tipo="aviso">Este atendimento não pode mais ser remarcado.</Aviso>
                <Botao titulo="Ver meus atendimentos" onPress={() => router.navigate('/paciente')} />
            </Tela>
        )
    }

    const medico = original.tipoAtendimento.categoria === 'CONSULTA'

    async function trocar() {
        if (!escolhido || !original) return
        setErro(undefined)
        try {
            const novo = await remarcar.mutateAsync({ id: original.id, slotId: escolhido.id })
            setTroca({ antes: original, novo })
            setEtapa('feito')
        } catch (e) {
            if (e instanceof ApiErro && e.status === 409) {
                // Outra pessoa pegou o horário entre a lista e a troca: volta para escolher outro.
                setOcupados(o => [...o, escolhido.id])
                setEscolhido(null)
                setEtapa('escolher')
                horarios.refetch()
            }
            setErro(mensagemDeErro(e))
        }
    }

    if (etapa === 'conferir' && escolhido) {
        return (
            <Tela cabecalho="voltar" titulo="Confirmar a troca?" leitura={`Sai ${dataPorExtenso(original.inicio)}. Entra ${dataPorExtenso(escolhido.inicio)}.`}>
                <Cartao suave>
                    <Texto variante="rotulo" cor="textoSuave">
                        Sai este horário
                    </Texto>
                    <Texto variante="subtitulo" cor="textoSuave" numeros style={{ textDecorationLine: 'line-through' }}>
                        {formatarDataHora(original.inicio)}
                    </Texto>
                </Cartao>
                <Cartao destaque={undefined}>
                    <Texto variante="rotulo" cor="textoSuave">
                        Entra este horário
                    </Texto>
                    <Texto variante="dataGrande" numeros>
                        {formatarDataHora(escolhido.inicio)}
                    </Texto>
                    <Texto cor="textoSuave">{linhaResumo({ ...original, profissional: escolhido.profissional })}</Texto>
                </Cartao>
                <Texto>O horário antigo fica livre para outra pessoa. O novo já fica confirmado.</Texto>
                {erro ? <Aviso tipo="perigo" titulo="Não foi possível remarcar">{erro}</Aviso> : null}
                <Botao titulo="Confirmar troca" grande icone="visto" carregando={remarcar.isPending} onPress={trocar} />
                <Botao titulo="Escolher outro horário" variante="contorno" onPress={() => setEtapa('escolher')} />
            </Tela>
        )
    }

    return (
        <Tela
            cabecalho="voltar"
            titulo="Remarcar"
            leitura={`Remarcar ${original.tipoAtendimento.nome}. Horário atual: ${dataPorExtenso(original.inicio)}. Escolha um novo horário.`}
            rodape={<Botao titulo={escolhido ? 'Continuar' : 'Escolha um horário'} grande desabilitado={!escolhido} onPress={() => setEtapa('conferir')} />}
        >
            <Cartao>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <EtiquetaCategoria categoria={original.tipoAtendimento.categoria} />
                    <Texto variante="corpoForte">{original.tipoAtendimento.nome}</Texto>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <Texto cor="textoSuave">Horário atual</Texto>
                    <Texto variante="corpoForte" numeros>
                        {formatarDataHora(original.inicio)}
                    </Texto>
                </View>
            </Cartao>
            <Texto variante="subtitulo" titulo>
                Escolha um novo horário
            </Texto>
            {medico && paciente.medicoReferencia ? <Texto cor="textoSuave">Só horários de consulta com {paciente.medicoReferencia.nome}, pela sua rua.</Texto> : null}
            {erro ? <Aviso tipo="perigo" titulo="Esse horário acabou de ser ocupado">{erro}</Aviso> : null}
            {horarios.isPending ? (
                <Carregando texto="Buscando horários livres…" />
            ) : horarios.isError ? (
                <ErroTela mensagem={mensagemDeErro(horarios.error)} tentarDeNovo={() => horarios.refetch()} />
            ) : (
                <GradeHorarios slots={horarios.data ?? []} selecionado={escolhido?.id ?? null} aoEscolher={setEscolhido} ocupados={ocupados} />
            )}
        </Tela>
    )
}
