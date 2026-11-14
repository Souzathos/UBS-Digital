import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { ApiErro, mensagemDeErro } from '@/api/cliente'
import type { AgendamentoEquipe, Categoria, PacienteEquipe, Slot, TipoAtendimento } from '@/api/tipos'
import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Campo } from '@/componentes/Campo'
import { Cartao } from '@/componentes/Cartao'
import { Carregando, ErroTela, Vazio } from '@/componentes/Estados'
import { Filtro } from '@/componentes/Filtro'
import { GradeHorarios } from '@/componentes/GradeHorarios'
import { IconeSelo } from '@/componentes/Painel'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useAcoesEquipe, useAgora, usePaciente, usePacientes } from '@/hooks/equipe'
import { useSlots, useTipos } from '@/hooks/paciente'
import { cpfParcial } from '@/utils/cpf'
import { dataPorExtenso, diaISO, formatarDataHora, idade } from '@/utils/datas'
import { rotuloCategoria } from '@/utils/rotulos'

// Agendar pela recepção (RN-01: qualquer tipo; RN-02: todos os horários, inclusive os guardados
// para o balcão). Consulta médica só com o médico da rua do paciente (RN-06): a API filtra os
// horários com ?pacienteId=. Design: equipe/agendar-pela-recepcao.
export default function AgendarRecepcao() {
    const params = useLocalSearchParams<{ pacienteId?: string }>()
    const agora = useAgora()
    const tipos = useTipos()
    const { agendar } = useAcoesEquipe()

    const preEscolhido = usePaciente(Number(params.pacienteId ?? 0))
    // undefined = ninguém escolheu ainda: vale o paciente que veio da ficha (?pacienteId=).
    const [escolhido, setPaciente] = useState<PacienteEquipe | null | undefined>(undefined)
    const paciente = escolhido === undefined ? (preEscolhido.data ?? null) : escolhido
    const [digitado, setDigitado] = useState('')
    const [q, setQ] = useState('')
    const busca = usePacientes(q)
    const [categoria, setCategoria] = useState<Categoria>('CONSULTA')
    const [tipo, setTipo] = useState<TipoAtendimento | null>(null)
    const [slot, setSlot] = useState<Slot | null>(null)
    const [erro, setErro] = useState<string>()
    const [feito, setFeito] = useState<AgendamentoEquipe | null>(null)

    useEffect(() => {
        const t = setTimeout(() => setQ(digitado.trim()), 300)
        return () => clearTimeout(t)
    }, [digitado])

    const horarios = useSlots(paciente && tipo ? { tipoAtendimentoId: tipo.id, pacienteId: paciente.id } : null)
    const itens = (tipos.data ?? []).filter(t => t.categoria === categoria)

    async function confirmar() {
        if (!paciente || !slot) return
        setErro(undefined)
        try {
            setFeito(await agendar.mutateAsync({ pacienteId: paciente.id, slotId: slot.id }))
        } catch (e) {
            // 409: o paciente já tem um deste tipo (RN-04) ou o horário foi ocupado; 400/403: regra
            // de prazo ou médico da rua. A mensagem da API já diz qual.
            if (e instanceof ApiErro && e.status === 409) horarios.refetch()
            setErro(mensagemDeErro(e))
        }
    }

    if (feito) {
        return (
            <Tela cabecalho="voltar" titulo="Agendado" leitura={`${feito.paciente.nome}. ${feito.tipoAtendimento.nome}. ${dataPorExtenso(feito.inicio)}.`}>
                <Aviso tipo="sucesso" titulo={`Agendado para ${formatarDataHora(feito.inicio)}`}>
                    {`${feito.paciente.nome} · ${rotuloCategoria(feito.tipoAtendimento.categoria)} · ${feito.tipoAtendimento.nome} · ${feito.profissional.nome}. O aviso sai pelos canais autorizados do paciente.`}
                </Aviso>
                <Botao titulo="Ver na agenda" onPress={() => router.replace({ pathname: '/equipe/agendamento/[id]', params: { id: String(feito.id), dia: diaISO(feito.inicio) } })} />
                <Botao
                    titulo="Agendar outro"
                    variante="contorno"
                    onPress={() => {
                        setFeito(null)
                        setSlot(null)
                        setTipo(null)
                        setPaciente(null)
                    }}
                />
            </Tela>
        )
    }

    const resumo = tipo && slot ? `${tipo.nome}, ${formatarDataHora(slot.inicio)} (${slot.profissional.nome})` : ''

    return (
        <Tela
            cabecalho="voltar"
            titulo="Agendar pela recepção"
            leitura="Agendar pela recepção. Escolha o paciente, o tipo, o atendimento e o horário."
            rodape={paciente && tipo ? <Botao titulo={slot ? `Agendar ${formatarDataHora(slot.inicio)}` : 'Escolha um horário'} grande desabilitado={!slot} carregando={agendar.isPending} onPress={confirmar} /> : undefined}
        >
            {/* 1. Paciente */}
            <Texto variante="subtitulo" titulo>
                1. Paciente
            </Texto>
            {paciente ? (
                <Cartao>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Texto variante="corpoForte">{paciente.nome}</Texto>
                        {paciente.vulneravel ? <IconeSelo /> : null}
                    </View>
                    <Texto cor="textoSuave">
                        {idade(paciente.dataNascimento, agora)} anos · CPF {cpfParcial(paciente.cpf)}
                    </Texto>
                    <Texto cor="textoSuave">{paciente.rua ? `${paciente.rua.nome}, ${paciente.numero}` : 'Sem rua cadastrada'}</Texto>
                    <Texto variante="corpoForte">{paciente.medicoReferencia ? `Médico de referência: ${paciente.medicoReferencia.nome}` : 'Sem médico de referência: só Enfermagem'}</Texto>
                    <Botao
                        titulo="Trocar paciente"
                        variante="texto"
                        onPress={() => {
                            setPaciente(null)
                            setSlot(null)
                        }}
                    />
                </Cartao>
            ) : (
                <View style={{ gap: 8 }}>
                    <Campo rotulo="Buscar paciente por nome ou CPF" value={digitado} onChangeText={setDigitado} placeholder="Nome ou CPF" autoCorrect={false} />
                    {q ? (
                        busca.isPending ? (
                            <Carregando texto="Buscando…" />
                        ) : (busca.data ?? []).length ? (
                            (busca.data ?? []).slice(0, 8).map(p => (
                                <Cartao key={p.id} onPress={() => setPaciente(p)} rotulo={`${p.nome}, CPF ${cpfParcial(p.cpf)}`} dica="Escolhe este paciente" style={{ gap: 2 }}>
                                    <Texto variante="corpoForte">{p.nome}</Texto>
                                    <Texto variante="mono" cor="textoSuave">
                                        {cpfParcial(p.cpf)}
                                    </Texto>
                                </Cartao>
                            ))
                        ) : (
                            <Vazio texto="Ninguém encontrado. Confira o nome ou cadastre o paciente." />
                        )
                    ) : null}
                </View>
            )}

            {paciente ? (
                <>
                    {/* 2. Tipo */}
                    <Texto variante="subtitulo" titulo>
                        2. Tipo
                    </Texto>
                    <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
                        {(['CONSULTA', 'PROCEDIMENTO'] as Categoria[]).map(c => (
                            <Filtro
                                key={c}
                                rotulo={rotuloCategoria(c)}
                                icone={c === 'CONSULTA' ? 'medico' : 'enfermagem'}
                                selecionado={categoria === c}
                                onPress={() => {
                                    setCategoria(c)
                                    setTipo(null)
                                    setSlot(null)
                                }}
                            />
                        ))}
                    </View>

                    {/* 3. Consulta ou procedimento */}
                    <Texto variante="subtitulo" titulo>
                        3. {categoria === 'CONSULTA' ? 'Consulta' : 'Procedimento'}
                    </Texto>
                    {tipos.isPending ? (
                        <Carregando />
                    ) : tipos.isError ? (
                        <ErroTela mensagem={mensagemDeErro(tipos.error)} tentarDeNovo={() => tipos.refetch()} />
                    ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }} accessibilityRole="radiogroup">
                            {itens.map(t => (
                                <Filtro
                                    key={t.id}
                                    rotulo={t.nome}
                                    selecionado={tipo?.id === t.id}
                                    onPress={() => {
                                        setTipo(t)
                                        setSlot(null)
                                        setErro(undefined)
                                    }}
                                />
                            ))}
                        </View>
                    )}
                </>
            ) : null}

            {paciente && tipo ? (
                <>
                    {/* 4. Horário */}
                    <Texto variante="subtitulo" titulo>
                        4. Horário · todos os horários
                    </Texto>
                    {erro ? <Aviso tipo="perigo" titulo="Não foi possível agendar">{erro}</Aviso> : null}
                    {horarios.isPending ? (
                        <Carregando texto="Buscando horários livres…" />
                    ) : horarios.isError ? (
                        <ErroTela mensagem={mensagemDeErro(horarios.error)} tentarDeNovo={() => horarios.refetch()} />
                    ) : (
                        <GradeHorarios slots={horarios.data ?? []} selecionado={slot?.id ?? null} aoEscolher={setSlot} marcarReservados />
                    )}
                    <Texto variante="legenda" cor="textoSuave">
                        Só recepção: horário guardado para quem marca no balcão ou não usa o app. Não aparece para o paciente.
                    </Texto>
                    {resumo ? <Texto variante="corpoForte">{resumo}</Texto> : null}
                </>
            ) : null}
        </Tela>
    )
}
