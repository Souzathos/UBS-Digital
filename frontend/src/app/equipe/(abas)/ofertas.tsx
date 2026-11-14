import { View } from 'react-native'

import { mensagemDeErro } from '@/api/cliente'
import { Cartao } from '@/componentes/Cartao'
import { Carregando, ErroTela, Vazio } from '@/componentes/Estados'
import { Etiqueta } from '@/componentes/Etiqueta'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useOfertasEmAndamento } from '@/hooks/camada2'
import type { CandidatoOferta } from '@/servicos/camada2/contratos'
import { useTheme } from '@/tema/ThemeProvider'
import { formatarDataHora, formatarHoraRelogio } from '@/utils/datas'
import { rotuloCategoria } from '@/utils/rotulos'

// Ofertas em andamento (seção 6, painel 6; RN-30 a RN-34): vagas liberadas e em que candidato
// cada uma está. Camada 2: dados de exemplo até existir GET /equipe/ofertas.
// Design: equipe/ofertas-em-andamento.
export default function OfertasEmAndamento() {
    const { cores } = useTheme()
    const consulta = useOfertasEmAndamento()

    const estado = (c: CandidatoOferta) => {
        switch (c.estado) {
            case 'aguardando': return { texto: c.prazo ? `Até ${formatarDataHora(c.prazo)}` : 'Aguarda', cores: cores.status.compareceu }
            case 'proximo': return { texto: 'Próximo', cores: cores.status.confirmado }
            case 'depois': return { texto: 'Depois', cores: cores.status.confirmado }
            case 'recusou': return { texto: 'Recusou', cores: cores.status.faltou }
            case 'expirou': return { texto: 'Expirou', cores: cores.status.faltou }
            case 'abaixoDoLimite': return { texto: 'Abaixo de 50', cores: cores.status.cancelado }
        }
    }

    return (
        <Tela titulo="Ofertas em andamento" exemplo leitura={`${consulta.data?.length ?? 0} vagas sendo oferecidas.`} atualizando={consulta.isRefetching} aoAtualizar={() => consulta.refetch()}>
            {consulta.isPending ? (
                <Carregando />
            ) : consulta.isError ? (
                <ErroTela mensagem={mensagemDeErro(consulta.error)} tentarDeNovo={() => consulta.refetch()} />
            ) : consulta.data.length ? (
                consulta.data.map(v => (
                    <Cartao key={v.id}>
                        <Texto variante="legenda" cor="textoSuave">
                            {rotuloCategoria(v.vaga.tipoAtendimento.categoria)} · {v.vaga.tipoAtendimento.nome} · {v.vaga.profissional.nome}
                        </Texto>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                            <Texto variante="subtitulo" numeros>
                                {formatarDataHora(v.vaga.inicio)}
                            </Texto>
                            <Etiqueta texto={v.simultanea ? '5 ao mesmo tempo' : 'Uma pessoa por vez'} cores={v.simultanea ? cores.status.pendente : cores.status.confirmado} />
                        </View>
                        <Texto>
                            {v.liberadaPor} cancelou às {formatarHoraRelogio(v.liberadaEm)}.{' '}
                            {v.simultanea ? 'Falta menos de 24h: a oferta foi para 5 pessoas e quem aceitar primeiro leva.' : 'Uma pessoa por vez, até 5, cada uma com seu prazo.'}
                        </Texto>
                        <Texto variante="corpoForte">Prazo: {formatarDataHora(v.prazo)}</Texto>
                        <View style={{ gap: 6, paddingTop: 4 }}>
                            <Texto variante="secao" cor="textoSuave">
                                Ordem da oferta
                            </Texto>
                            {v.fila.map((c, i) => {
                                const e = estado(c)
                                return (
                                    <View key={i} accessible accessibilityLabel={`${c.ordem ? `${c.ordem}º` : 'Fora da fila'}: ${c.nome}, ${c.nota}. ${e.texto}.`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Texto variante="mono" style={{ width: 22 }}>
                                            {c.ordem ? String(c.ordem) : '–'}
                                        </Texto>
                                        <View style={{ flex: 1 }}>
                                            <Texto variante="corpoForte">{c.nome}</Texto>
                                            <Texto variante="legenda" cor="textoSuave">
                                                {c.nota}
                                            </Texto>
                                        </View>
                                        <Etiqueta texto={e.texto} cores={e.cores} />
                                    </View>
                                )
                            })}
                        </View>
                    </Cartao>
                ))
            ) : (
                <Vazio texto="Nenhuma vaga sendo oferecida agora." />
            )}
            <Texto variante="legenda" cor="textoSuave">
                Quem aceita tem o agendamento movido para a vaga, e a vaga antiga dele vira nova oferta. Sem aceite, a vaga volta para a agenda livre.
            </Texto>
        </Tela>
    )
}
