import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { ApiErro, mensagemDeErro } from '@/api/cliente'
import type { Slot } from '@/api/tipos'
import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Cartao } from '@/componentes/Cartao'
import { Carregando, ErroTela } from '@/componentes/Estados'
import { EtiquetaCategoria, EtiquetaStatus } from '@/componentes/Etiqueta'
import { GradeHorarios } from '@/componentes/GradeHorarios'
import { IconeSelo } from '@/componentes/Painel'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useAcoesEquipe, useAgendamentoEquipe, usePodeAgir } from '@/hooks/equipe'
import { useSlots } from '@/hooks/paciente'
import { formatarTelefone, mascararCpf } from '@/utils/cpf'
import { dataPorExtenso, diaISO, formatarDataHora } from '@/utils/datas'
import { rotuloCategoria } from '@/utils/rotulos'

type Etapa = 'ver' | 'cancelar' | 'remarcar'

// Confirmar, cancelar e remarcar pelo painel, em nome do paciente (RN-20 a RN-22, RN-82: a API
// registra a equipe como autora). Na remarcação a recepção vê todos os horários, inclusive os
// guardados para o balcão, e a consulta médica continua com o médico da rua (RN-06).
export default function AgendamentoEquipeTela() {
    const params = useLocalSearchParams<{ id: string; dia: string }>()
    const [dia, setDia] = useState(params.dia)
    const consulta = useAgendamentoEquipe(dia, Number(params.id))
    const acoes = useAcoesEquipe()
    const podeAgir = usePodeAgir()
    const [etapa, setEtapa] = useState<Etapa>('ver')
    const [slot, setSlot] = useState<Slot | null>(null)
    const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'perigo'; texto: string }>()

    const a = consulta.data
    const horarios = useSlots(etapa === 'remarcar' && a ? { tipoAtendimentoId: a.tipoAtendimento.id, pacienteId: a.paciente.id } : null)

    if (consulta.isPending) return <Tela cabecalho="voltar"><Carregando /></Tela>
    if (consulta.isError) return <Tela cabecalho="voltar"><ErroTela mensagem={mensagemDeErro(consulta.error)} tentarDeNovo={() => consulta.refetch()} /></Tela>
    if (!a) {
        return (
            <Tela cabecalho="voltar" titulo="Agendamento não encontrado">
                <Texto>Ele pode ter sido remarcado para outro dia.</Texto>
                <Botao titulo="Voltar para a agenda" onPress={() => router.back()} />
            </Tela>
        )
    }

    async function executar(acao: () => Promise<unknown>, sucesso: string) {
        setMensagem(undefined)
        try {
            await acao()
            setMensagem({ tipo: 'sucesso', texto: sucesso })
            setEtapa('ver')
        } catch (e) {
            setMensagem({ tipo: 'perigo', texto: mensagemDeErro(e) })
        }
    }

    const ativo = a.status === 'PENDENTE' || a.status === 'CONFIRMADO'

    const resumo = (
            <Cartao>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <Texto variante="subtitulo">{a.paciente.nome}</Texto>
                    {a.paciente.vulneravel ? <IconeSelo /> : null}
                </View>
                <Texto cor="textoSuave" numeros>
                    CPF {mascararCpf(a.paciente.cpf)}
                    {a.paciente.telefone ? ` · ${formatarTelefone(a.paciente.telefone)}` : ''}
                </Texto>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 4 }}>
                    <EtiquetaCategoria categoria={a.tipoAtendimento.categoria} />
                    <EtiquetaStatus status={a.status} publico="equipe" />
                </View>
                <Texto variante="corpoForte">{a.tipoAtendimento.nome}</Texto>
                <Texto variante="dataGrande" numeros>
                    {formatarDataHora(a.inicio)}
                </Texto>
                <Texto cor="textoSuave">{a.profissional.nome}</Texto>
            </Cartao>
    )


    if (etapa === 'remarcar') {
        return (
            <Tela
                cabecalho="voltar"
                aoVoltar={() => setEtapa('ver')}
                titulo="Remarcar"
                leitura={`Remarcar ${a.tipoAtendimento.nome} de ${a.paciente.nome}. Horário atual: ${dataPorExtenso(a.inicio)}.`}
                rodape={
                    <Botao
                        titulo={slot ? `Remarcar para ${formatarDataHora(slot.inicio)}` : 'Escolha um horário'}
                        grande
                        desabilitado={!slot}
                        carregando={acoes.remarcar.isPending}
                        onPress={async () => {
                            if (!slot) return
                            setMensagem(undefined)
                            try {
                                const novo = await acoes.remarcar.mutateAsync({ id: a.id, slotId: slot.id })
                                // O novo agendamento pode cair em outro dia: a tela passa a mostrar ele.
                                setDia(diaISO(novo.inicio))
                                router.setParams({ id: String(novo.id), dia: diaISO(novo.inicio) })
                                setMensagem({ tipo: 'sucesso', texto: `Remarcado para ${formatarDataHora(novo.inicio)}. O novo já fica confirmado.` })
                                setEtapa('ver')
                                setSlot(null)
                            } catch (e) {
                                if (e instanceof ApiErro && e.status === 409) horarios.refetch()
                                setMensagem({ tipo: 'perigo', texto: mensagemDeErro(e) })
                            }
                        }}
                    />
                }
            >
                <Texto cor="textoSuave" style={{ marginTop: -6 }}>
                    {a.paciente.nome} · {rotuloCategoria(a.tipoAtendimento.categoria)} · {a.tipoAtendimento.nome} · {formatarDataHora(a.inicio)}
                </Texto>
                {mensagem ? <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso> : null}
                {horarios.isPending ? (
                    <Carregando texto="Buscando horários livres…" />
                ) : horarios.isError ? (
                    <ErroTela mensagem={mensagemDeErro(horarios.error)} tentarDeNovo={() => horarios.refetch()} />
                ) : (
                    <GradeHorarios slots={horarios.data ?? []} selecionado={slot?.id ?? null} aoEscolher={setSlot} marcarReservados />
                )}
            </Tela>
        )
    }

    if (etapa === 'cancelar') {
        return (
            <Tela cabecalho="voltar" aoVoltar={() => setEtapa('ver')} titulo="Cancelar este atendimento?">
                {resumo}
                <Texto>A vaga fica livre para outra pessoa. O paciente não perde pontos por cancelar.</Texto>
                {mensagem ? <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso> : null}
                <Botao titulo="Sim, cancelar" variante="perigoCheio" grande carregando={acoes.cancelar.isPending} onPress={() => executar(() => acoes.cancelar.mutateAsync(a.id), 'Atendimento cancelado. A vaga voltou para a agenda.')} />
                <Botao titulo="Não, manter" variante="contorno" onPress={() => setEtapa('ver')} />
            </Tela>
        )
    }

    return (
        <Tela cabecalho="voltar" titulo="Agendamento" leitura={`${a.paciente.nome}. ${a.tipoAtendimento.nome}. ${dataPorExtenso(a.inicio)}.`}>
            {resumo}
            {mensagem ? <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso> : null}
            {podeAgir ? (
                <View style={{ gap: 8 }}>
                    {ativo ? (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Botao titulo="Compareceu" style={{ flex: 1 }} carregando={acoes.presenca.isPending && acoes.presenca.variables?.resultado === 'COMPARECEU'} onPress={() => executar(() => acoes.presenca.mutateAsync({ id: a.id, resultado: 'COMPARECEU' }), 'Comparecimento registrado.')} />
                            <Botao titulo="Faltou" variante="contorno" style={{ flex: 1 }} carregando={acoes.presenca.isPending && acoes.presenca.variables?.resultado === 'FALTOU'} onPress={() => executar(() => acoes.presenca.mutateAsync({ id: a.id, resultado: 'FALTOU' }), 'Falta registrada.')} />
                        </View>
                    ) : null}
                    {a.acoes.confirmar ? <Botao titulo="Confirmar em nome do paciente" variante="contorno" icone="visto" carregando={acoes.confirmar.isPending} onPress={() => executar(() => acoes.confirmar.mutateAsync(a.id), 'Presença confirmada em nome do paciente.')} /> : null}
                    {a.acoes.remarcar ? <Botao titulo="Remarcar" variante="contorno" onPress={() => setEtapa('remarcar')} /> : null}
                    {a.acoes.cancelar ? <Botao titulo="Cancelar" variante="perigo" onPress={() => setEtapa('cancelar')} /> : null}
                </View>
            ) : (
                <Aviso tipo="info">Seu perfil só consulta a agenda. Para confirmar, remarcar ou cancelar, fale com a recepção.</Aviso>
            )}
            <Botao titulo="Abrir ficha do paciente" variante="texto" onPress={() => router.push({ pathname: '/equipe/paciente/[id]', params: { id: String(a.paciente.id) } })} />
        </Tela>
    )
}
