import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { ApiErro, mensagemDeErro } from '@/api/cliente'
import type { Agendamento, Categoria, Slot, TipoAtendimento } from '@/api/tipos'
import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { BotaoOpcao } from '@/componentes/BotaoOpcao'
import { Cartao } from '@/componentes/Cartao'
import { CartaoMedico } from '@/componentes/CartaoMedico'
import { Carregando, ErroTela, Vazio } from '@/componentes/Estados'
import { EtiquetaCategoria, EtiquetaStatus } from '@/componentes/Etiqueta'
import { GradeHorarios } from '@/componentes/GradeHorarios'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { estaAtivo, useAcoesPaciente, useMeusAtendimentos, useSlots, useTipos } from '@/hooks/paciente'
import { usePacienteLogado } from '@/sessao/SessaoProvider'
import { dataPorExtenso, formatarDataHora } from '@/utils/datas'
import { concordar, leituraAtendimento, nomeDoItem, rotuloCategoria } from '@/utils/rotulos'

type Passo = 'tipo' | 'item' | 'duplicado' | 'hora' | 'conferir' | 'feito'

const NUMERO_DO_PASSO: Record<Passo, number> = { tipo: 1, item: 2, duplicado: 2, hora: 3, conferir: 4, feito: 4 }

// Agendar pelo app em 4 passos (seção 6, RN-01 a RN-06): Consulta ou Procedimento → qual consulta ou
// procedimento → dia e hora → conferir. A API só devolve os tipos liberados para o app (RN-01),
// os horários da cota do app (RN-02) e, em consulta, só os do médico da rua (RN-06).
// Design: paciente/agendar-fluxo-completo e telas vizinhas.
export default function Agendar() {
    const paciente = usePacienteLogado()
    const tipos = useTipos()
    const meus = useMeusAtendimentos()
    const { criar } = useAcoesPaciente()

    const [passo, setPasso] = useState<Passo>('tipo')
    const [categoria, setCategoria] = useState<Categoria>('CONSULTA')
    const [tipo, setTipo] = useState<TipoAtendimento | null>(null)
    const [slot, setSlot] = useState<Slot | null>(null)
    const [ocupados, setOcupados] = useState<number[]>([])
    const [aviso, setAviso] = useState<string>()
    const [marcado, setMarcado] = useState<Agendamento | null>(null)

    const horarios = useSlots(passo === 'hora' && tipo ? { tipoAtendimentoId: tipo.id } : null)

    const ativos = (meus.data?.proximos ?? []).filter(estaAtivo)
    const jaTem = (t: TipoAtendimento) => ativos.find(a => a.tipoAtendimento.id === t.id)

    function recomecar() {
        setPasso('tipo')
        setTipo(null)
        setSlot(null)
        setOcupados([])
        setAviso(undefined)
        setMarcado(null)
    }

    function voltar() {
        setAviso(undefined)
        if (passo === 'item') setPasso('tipo')
        else if (passo === 'duplicado' || passo === 'hora') setPasso('item')
        else if (passo === 'conferir') setPasso('hora')
    }

    function escolherItem(t: TipoAtendimento) {
        setTipo(t)
        setSlot(null)
        setOcupados([])
        // Atalho de exibição: se a lista já mostra um ativo deste tipo, avisa antes de escolher
        // horário. Quem decide é a API (RN-04, 409); isto só evita o paciente perder tempo.
        setPasso(jaTem(t) ? 'duplicado' : 'hora')
    }

    async function marcar() {
        if (!slot) return
        setAviso(undefined)
        try {
            const novo = await criar.mutateAsync(slot.id)
            setMarcado(novo)
            setPasso('feito')
        } catch (e) {
            if (e instanceof ApiErro && e.status === 409) {
                // Dois motivos possíveis: já existe um ativo deste tipo (RN-04) ou o horário foi
                // ocupado. A lista atualizada diz qual foi.
                const { data: dados } = await meus.refetch()
                if (tipo && dados?.proximos.some(a => estaAtivo(a) && a.tipoAtendimento.id === tipo.id)) {
                    setPasso('duplicado')
                    return
                }
                setOcupados(o => [...o, slot.id])
                setSlot(null)
                setPasso('hora')
                horarios.refetch()
                setAviso('Outra pessoa marcou antes. Escolha outro horário.')
                return
            }
            setAviso(mensagemDeErro(e))
        }
    }

    const meio = passo === 'feito' ? 'Pronto' : `Passo ${NUMERO_DO_PASSO[passo]} de 4`
    const comum = { cabecalho: passo === 'tipo' || passo === 'feito' ? ('ubs' as const) : ('voltar' as const), aoVoltar: voltar, meio }

    // --- Passo 1: Consulta (médico) ou Procedimento (enfermagem) ---
    if (passo === 'tipo') {
        const daCategoria = (c: Categoria) => (tipos.data ?? []).filter(t => t.categoria === c).map(t => t.nome.toLowerCase())
        return (
            <Tela {...comum} titulo="O que você precisa?" leitura="Escolha o tipo de atendimento: consulta, com o médico, ou procedimento, com a enfermagem.">
                <Texto cor="textoSuave" style={{ marginTop: -6 }}>
                    Escolha o tipo de atendimento.
                </Texto>
                {tipos.isPending ? (
                    <Carregando />
                ) : tipos.isError ? (
                    <ErroTela mensagem={mensagemDeErro(tipos.error)} tentarDeNovo={() => tipos.refetch()} />
                ) : (
                    <>
                        <BotaoOpcao
                            titulo="Consulta"
                            icone="medico"
                            descricao={`Com o médico: ${daCategoria('CONSULTA').join(', ')}.`}
                            nota={paciente.medicoReferencia ? `Seu médico: ${paciente.medicoReferencia.nome} (pela sua rua)` : undefined}
                            onPress={() => {
                                setCategoria('CONSULTA')
                                setPasso('item')
                            }}
                        />
                        <BotaoOpcao
                            titulo="Procedimento"
                            icone="enfermagem"
                            descricao={`Com a enfermagem: ${daCategoria('PROCEDIMENTO').join(', ')}.`}
                            onPress={() => {
                                setCategoria('PROCEDIMENTO')
                                setPasso('item')
                            }}
                        />
                    </>
                )}
            </Tela>
        )
    }

    // --- Passo 2: qual consulta ou procedimento ---
    if (passo === 'item') {
        const itens = (tipos.data ?? []).filter(t => t.categoria === categoria)
        const pergunta = categoria === 'CONSULTA' ? 'Qual consulta?' : 'Qual procedimento?'
        return (
            <Tela {...comum} titulo={pergunta} leitura={`${pergunta} ${itens.map(i => i.nome).join(', ')}.`}>
                {categoria === 'CONSULTA' ? <CartaoMedico paciente={paciente} /> : <EtiquetaCategoria categoria="PROCEDIMENTO" grande />}
                {itens.length ? (
                    itens.map(t => {
                        const existente = jaTem(t)
                        return (
                            <BotaoOpcao
                                key={t.id}
                                titulo={t.nome}
                                descricao={t.instrucoesPreparo ? `Preparo: ${t.instrucoesPreparo}` : undefined}
                                nota={existente ? `Já marcada: ${formatarDataHora(existente.inicio)}` : undefined}
                                onPress={() => escolherItem(t)}
                            />
                        )
                    })
                ) : (
                    <Vazio texto={`Nenhum ${nomeDoItem(categoria)} liberado para marcar pelo app. Procure a recepção da UBS.`} />
                )}
            </Tela>
        )
    }

    // --- Já existe um ativo deste tipo (RN-04) ---
    if (passo === 'duplicado' && tipo) {
        const existente = jaTem(tipo)
        return (
            <Tela {...comum} titulo={`${tipo.nome}: você já tem ${concordar(tipo.categoria, 'uma marcada', 'um marcado')}`} leitura={existente ? `Você já tem ${leituraAtendimento(existente)}` : undefined}>
                <View accessibilityRole="alert" style={{ gap: 14 }}>
                    {existente ? (
                        <Cartao>
                            <Texto variante="corpoForte">
                                {rotuloCategoria(existente.tipoAtendimento.categoria)} · {existente.tipoAtendimento.nome}
                            </Texto>
                            <Texto variante="dataGrande" numeros>
                                {formatarDataHora(existente.inicio)}
                            </Texto>
                            <Texto cor="textoSuave">
                                {existente.profissional.nome} · {existente.ubs.nome}
                            </Texto>
                        </Cartao>
                    ) : null}
                    <Texto>Só dá para ter uma marcada de cada vez. Se precisa de outro dia, remarque a que já existe.</Texto>
                    {existente?.acoes.remarcar ? (
                        <Botao titulo="Remarcar a que já existe" onPress={() => router.push({ pathname: '/paciente/atendimento/[id]/remarcar', params: { id: String(existente.id) } })} />
                    ) : null}
                    <Botao titulo={categoria === 'CONSULTA' ? 'Escolher outra consulta' : 'Escolher outro procedimento'} variante="contorno" onPress={() => setPasso('item')} />
                </View>
            </Tela>
        )
    }

    // --- Passo 3: dia e hora ---
    if (passo === 'hora' && tipo) {
        return (
            <Tela
                {...comum}
                titulo="Escolha o dia e a hora"
                leitura={`Escolha o dia e a hora para ${tipo.nome}.`}
                rodape={<Botao titulo={slot ? 'Continuar' : 'Escolha um horário'} grande desabilitado={!slot} onPress={() => setPasso('conferir')} />}
            >
                <Texto cor="textoSuave" style={{ marginTop: -6 }}>
                    {rotuloCategoria(tipo.categoria)} · {tipo.nome}
                </Texto>
                {aviso ? <Aviso tipo="aviso" titulo="Esse horário acabou de ser ocupado">{aviso}</Aviso> : null}
                {horarios.isPending ? (
                    <Carregando texto="Buscando horários livres…" />
                ) : horarios.isError ? (
                    // Ex.: paciente sem rua pedindo consulta médica (400 da API, RN-06).
                    <View style={{ gap: 10 }}>
                        <ErroTela mensagem={mensagemDeErro(horarios.error)} tentarDeNovo={() => horarios.refetch()} />
                        {horarios.error instanceof ApiErro && horarios.error.status === 400 ? <Texto cor="textoSuave">Procure a recepção da UBS com um comprovante de endereço.</Texto> : null}
                    </View>
                ) : (
                    <GradeHorarios slots={horarios.data ?? []} selecionado={slot?.id ?? null} aoEscolher={setSlot} ocupados={ocupados} vazio="Nenhum horário livre pelo app agora. Tente de novo outro dia ou procure a recepção." />
                )}
            </Tela>
        )
    }

    // --- Passo 4: conferir ---
    if (passo === 'conferir' && tipo && slot) {
        return (
            <Tela {...comum} titulo="Confira o agendamento" leitura={`${rotuloCategoria(tipo.categoria)}. ${tipo.nome}. ${dataPorExtenso(slot.inicio)}. ${slot.profissional.nome}.`}>
                <Cartao>
                    <EtiquetaCategoria categoria={tipo.categoria} grande />
                    <Texto variante="subtitulo">{tipo.nome}</Texto>
                    <Texto variante="dataGrande" numeros>
                        {formatarDataHora(slot.inicio)}
                    </Texto>
                    <Texto cor="textoSuave">{slot.profissional.nome}</Texto>
                </Cartao>
                {tipo.instrucoesPreparo ? <Aviso tipo="aviso" titulo="Preparo">{tipo.instrucoesPreparo}</Aviso> : null}
                {aviso ? <Aviso tipo="perigo" titulo="Não foi possível marcar">{aviso}</Aviso> : null}
                <Botao titulo="Confirmar agendamento" grande icone="visto" carregando={criar.isPending} onPress={marcar} />
                <Botao titulo="Mudar o horário" variante="contorno" onPress={() => setPasso('hora')} />
            </Tela>
        )
    }

    // --- Pronto ---
    if (passo === 'feito' && marcado) {
        return (
            <Tela {...comum} titulo="Atendimento marcado" leitura={`Atendimento marcado. ${leituraAtendimento(marcado)}`}>
                <View accessibilityLiveRegion="polite" style={{ gap: 14 }}>
                    <Cartao>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            <EtiquetaCategoria categoria={marcado.tipoAtendimento.categoria} grande />
                            <EtiquetaStatus status={marcado.status} publico="paciente" grande />
                        </View>
                        <Texto variante="subtitulo">{marcado.tipoAtendimento.nome}</Texto>
                        <Texto variante="dataGrande" numeros>
                            {formatarDataHora(marcado.inicio)}
                        </Texto>
                        <Texto cor="textoSuave">
                            {marcado.profissional.nome} · {marcado.ubs.nome}
                        </Texto>
                    </Cartao>
                    <Texto>Vamos lembrar você antes do dia, pelos canais que você escolheu no Perfil.</Texto>
                    <Botao titulo="Ver meus atendimentos" onPress={() => {
                        recomecar()
                        router.navigate('/paciente')
                    }} />
                    <Botao titulo="Marcar outro" variante="contorno" onPress={recomecar} />
                </View>
            </Tela>
        )
    }

    // Estado inconsistente (ex.: lista mudou no meio): volta ao começo.
    return (
        <Tela titulo="Agendar">
            <Botao titulo="Começar de novo" onPress={recomecar} />
        </Tela>
    )
}
