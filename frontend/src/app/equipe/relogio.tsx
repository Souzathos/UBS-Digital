import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { View } from 'react-native'

import { mensagemDeErro } from '@/api/cliente'
import { chaves } from '@/api/consultas'
import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Cartao } from '@/componentes/Cartao'
import { Carregando, ErroTela, Vazio } from '@/componentes/Estados'
import { Etiqueta } from '@/componentes/Etiqueta'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useRelogio } from '@/hooks/equipe'
import { servicos } from '@/servicos'
import { useTheme } from '@/tema/ThemeProvider'
import { formatarDia, formatarDiaHoraCurto, formatarHoraRelogio } from '@/utils/datas'

const SALTOS = [
    { rotulo: '+1 hora', tempo: { horas: 1 } },
    { rotulo: '+1 dia', tempo: { dias: 1 } },
    { rotulo: '+7 dias', tempo: { dias: 7 } },
    { rotulo: '+14 dias', tempo: { dias: 14 } }
]

const ETAPA: Record<string, string> = {
    D14: '2 semanas antes',
    D7: '1 semana antes',
    D3: '3 dias antes',
    D0: 'No dia',
    PRE_AVISO: 'Pré-aviso',
    OFERTA: 'Oferta',
    CONFIRMACAO_AGENDAMENTO: 'Confirmação'
}

const CANAL: Record<string, string> = { PUSH: 'App', WHATSAPP: 'WhatsApp', SMS: 'SMS', EMAIL: 'E-mail' }

// Relógio de testes (RN-90): avança o tempo da API rodando os jobs, para ver os lembretes D-14,
// D-7, D-3 e D-0 saindo em minutos. Só existe fora de produção. Design: equipe/relogio-de-testes.
export default function Relogio() {
    const tema = useTheme()
    const queryClient = useQueryClient()
    const relogio = useRelogio()
    const envios = useQuery({ queryKey: chaves.envios, queryFn: () => servicos.dev.envios(100) })

    const aoMudar = () => {
        queryClient.invalidateQueries({ queryKey: chaves.relogio })
        queryClient.invalidateQueries({ queryKey: chaves.envios })
        queryClient.invalidateQueries({ queryKey: chaves.todasAgendas })
        queryClient.invalidateQueries({ queryKey: chaves.todosSlots })
    }
    const avancar = useMutation({ mutationFn: (tempo: { dias?: number; horas?: number }) => servicos.dev.avancar(tempo), onSuccess: aoMudar })
    const zerar = useMutation({ mutationFn: () => servicos.dev.zerar(), onSuccess: aoMudar })

    if (relogio.isPending) return <Tela cabecalho="voltar"><Carregando /></Tela>
    if (!relogio.data) {
        return (
            <Tela cabecalho="voltar" titulo="Relógio de testes">
                <Aviso tipo="info">O relógio de testes só existe no ambiente de desenvolvimento.</Aviso>
            </Tela>
        )
    }

    const agora = new Date(relogio.data.agora)
    const deslocamentoHoras = Math.round(relogio.data.deslocamentoMs / 3_600_000)
    const dias = Math.floor(deslocamentoHoras / 24)
    const horas = deslocamentoHoras % 24
    const status = deslocamentoHoras
        ? `Adiantado ${[dias ? `${dias} ${dias === 1 ? 'dia' : 'dias'}` : '', horas ? `${horas} ${horas === 1 ? 'hora' : 'horas'}` : ''].filter(Boolean).join(' e ')}`
        : 'Horário real'
    const ocupado = avancar.isPending || zerar.isPending
    const erro = avancar.error ?? zerar.error

    return (
        <Tela cabecalho="voltar" titulo="Relógio de testes" leitura={`${formatarDia(agora)}, ${formatarHoraRelogio(agora)}. ${status}.`} atualizando={envios.isRefetching} aoAtualizar={() => envios.refetch()}>
            <Aviso tipo="aviso" titulo="Só no ambiente de testes">
                Nada sai para os pacientes: as mensagens são simuladas.
            </Aviso>

            <Cartao>
                <Texto variante="rotulo" cor="textoSuave">
                    Data e hora do sistema
                </Texto>
                <Texto peso="700" numeros style={{ fontSize: tema.fonte(26), lineHeight: tema.fonte(30) }}>
                    {formatarDia(agora)}
                </Texto>
                <Texto variante="mono" style={{ fontSize: tema.fonte(30), lineHeight: tema.fonte(34) }}>
                    {formatarHoraRelogio(agora)}
                </Texto>
                <Texto cor="textoSuave" accessibilityLiveRegion="polite">
                    {ocupado ? 'Avançando e rodando os lembretes…' : status}
                </Texto>
            </Cartao>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SALTOS.map(s => (
                    <Botao key={s.rotulo} titulo={s.rotulo} variante="contorno" desabilitado={ocupado} carregando={avancar.isPending && avancar.variables === s.tempo} onPress={() => avancar.mutate(s.tempo)} style={{ flexGrow: 1, minWidth: 140 }} />
                ))}
            </View>
            <Botao titulo="Voltar ao horário real" variante="texto" desabilitado={!deslocamentoHoras || ocupado} carregando={zerar.isPending} onPress={() => zerar.mutate()} />
            {erro ? <Aviso tipo="perigo">{mensagemDeErro(erro)}</Aviso> : null}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Texto variante="subtitulo" titulo>
                    Mensagens enviadas
                </Texto>
                <Texto cor="textoSuave">{envios.data ? `${envios.data.length} ${envios.data.length === 1 ? 'mensagem' : 'mensagens'}` : ''}</Texto>
            </View>
            {envios.isPending ? (
                <Carregando />
            ) : envios.isError ? (
                <ErroTela mensagem={mensagemDeErro(envios.error)} tentarDeNovo={() => envios.refetch()} />
            ) : envios.data.length ? (
                <View style={{ gap: 6 }}>
                    {envios.data.map(m => (
                        <Cartao key={m.id} style={{ gap: 4 }}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                                <Etiqueta texto={ETAPA[m.etapa] ?? m.etapa} cores={tema.cores.status.confirmado} />
                                <Texto variante="rotulo">{CANAL[m.canal] ?? m.canal}</Texto>
                                <Texto variante="mono" style={{ fontSize: tema.fonte(13) }}>
                                    {formatarDiaHoraCurto(m.enviadaEm)}
                                </Texto>
                                <Texto variante="legenda" cor="textoSuave">
                                    {m.destinatarioNome ?? `${m.destinatarioTipo === 'PACIENTE' ? 'paciente' : m.destinatarioTipo.toLowerCase()} nº ${m.destinatarioId}`}
                                    {m.destino ? ` · ${m.destino}` : ' · sem canal próprio'}
                                </Texto>
                            </View>
                            <Texto>{m.texto}</Texto>
                        </Cartao>
                    ))}
                </View>
            ) : (
                <Vazio texto="Nenhuma mensagem até agora. Avance o relógio para ver os lembretes saindo." />
            )}
        </Tela>
    )
}
