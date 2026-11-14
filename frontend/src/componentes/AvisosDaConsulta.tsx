import { View } from 'react-native'

import type { Agendamento } from '@/api/tipos'
import { useAvisos } from '@/hooks/camada2'
import type { AvisoConsulta } from '@/servicos/camada2/contratos'
import { useTheme } from '@/tema/ThemeProvider'
import { formatarDataHora, formatarDiaMes } from '@/utils/datas'
import { concordar, oItem } from '@/utils/rotulos'
import { Aviso } from './Aviso'
import { Cartao } from './Cartao'
import { Carregando } from './Estados'
import { Etiqueta } from './Etiqueta'
import { Texto } from './Texto'

const QUANDO: Record<AvisoConsulta['etapa'], string> = { D14: '2 semanas antes', D7: '1 semana antes', D3: '3 dias antes', D0: 'No dia' }
const CANAL: Record<string, string> = { PUSH: 'App', WHATSAPP: 'WhatsApp', SMS: 'SMS', EMAIL: 'E-mail' }

// "Avisos desta consulta": a linha do tempo D-14, D-7, D-3 e D-0 (RN-10 a RN-12), vinda de
// GET /agendamentos/:id/avisos (ou da rota da equipe, no painel).
// Design: paciente/lembrete-confirmar-cancelar-remarcar.
export function AvisosDaConsulta({ agendamento, publico = 'paciente' }: { agendamento: Agendamento; publico?: 'paciente' | 'equipe' }) {
    const { cores } = useTheme()
    const consulta = useAvisos(agendamento, publico)

    const estadoVisual = (a: AvisoConsulta) => {
        switch (a.estado) {
            case 'agendado': return { texto: 'Vai sair', cores: cores.status.cancelado }
            case 'enviado': return { texto: 'Pede resposta', cores: cores.status.pendente }
            case 'respondido': return { texto: 'Você confirmou', cores: cores.status.confirmado }
            case 'lembrete': return { texto: 'Só lembrete', cores: cores.status.remarcado }
            case 'semResposta': return { texto: 'Sem resposta', cores: cores.status.faltou }
        }
    }

    return (
        <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Texto variante="subtitulo" titulo>
                    Avisos {concordar(agendamento.tipoAtendimento.categoria, 'desta', 'deste')} {agendamento.tipoAtendimento.categoria === 'CONSULTA' ? 'consulta' : 'procedimento'}
                </Texto>
            </View>
            {consulta.isPending ? (
                <Carregando texto="Carregando avisos…" />
            ) : consulta.data ? (
                <>
                    <Cartao style={{ gap: 0, paddingVertical: 4 }}>
                        {consulta.data.avisos.map((a, i) => {
                            const visual = estadoVisual(a)
                            return (
                                <View
                                    key={a.etapa}
                                    accessible
                                    accessibilityLabel={`${QUANDO[a.etapa]}, ${formatarDiaMes(a.data)}: ${visual.texto}`}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: cores.borda }}
                                >
                                    <Texto variante="mono" style={{ width: 52 }}>
                                        {formatarDiaMes(a.data)}
                                    </Texto>
                                    <View style={{ flex: 1 }}>
                                        <Texto variante="corpoForte">{QUANDO[a.etapa]}</Texto>
                                        {a.estado !== 'agendado' ? (
                                            <Texto variante="legenda" cor="textoSuave">
                                                {a.canais.map(c => CANAL[c] ?? c).join(' e ')}
                                            </Texto>
                                        ) : null}
                                    </View>
                                    <Etiqueta texto={visual.texto} cores={visual.cores} />
                                </View>
                            )
                        })}
                    </Cartao>
                    {consulta.data.avisos.length === 0 ? <Texto cor="textoSuave">Nenhum aviso programado.</Texto> : null}
                    {consulta.data.prazoResposta ? (
                        <Texto cor="textoSuave">
                            Responda pelo app, WhatsApp ou SMS. Sem resposta até {formatarDataHora(consulta.data.prazoResposta)}, {oItem(agendamento.tipoAtendimento.categoria)} é {concordar(agendamento.tipoAtendimento.categoria, 'cancelada', 'cancelado')} e a vaga vai para outra pessoa.
                        </Texto>
                    ) : publico === 'paciente' && agendamento.status === 'CONFIRMADO' ? (
                        <Texto cor="textoSuave">Você já respondeu, a vaga está garantida. Os próximos avisos só lembram e trazem as opções de cancelar e remarcar.</Texto>
                    ) : null}
                </>
            ) : null}
        </View>
    )
}

// Cancelada por falta de resposta (RN-26): o que aconteceu e o que fazer. Design:
// paciente/cancelada-sem-resposta-48h-antes.
export function ExplicacaoSemResposta({ agendamento }: { agendamento: Agendamento }) {
    const consulta = useAvisos(agendamento)
    const cancelada = consulta.data?.canceladoAutomaticamenteEm
    return (
        <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Texto variante="subtitulo" titulo>
                    O que aconteceu
                </Texto>
            </View>
            <Texto>Não recebemos resposta aos avisos. Por isso, antes {concordar(agendamento.tipoAtendimento.categoria, 'da consulta', 'do procedimento')}, a vaga foi para outra pessoa.</Texto>
            {consulta.data ? (
                <Cartao style={{ gap: 6 }}>
                    {consulta.data.avisos.map((a, i) => (
                        <Texto key={a.etapa}>
                            {formatarDiaMes(a.data)} · {i + 1}º aviso · sem resposta
                        </Texto>
                    ))}
                    {cancelada ? <Texto variante="corpoForte">{formatarDataHora(cancelada)} · {concordar(agendamento.tipoAtendimento.categoria, 'cancelada', 'cancelado')}, vaga liberada</Texto> : null}
                </Cartao>
            ) : null}
            <Aviso tipo="info" titulo="Isso não prejudica você">
                Só perde ofertas de vaga mais cedo quem confirma e falta.
            </Aviso>
        </View>
    )
}
