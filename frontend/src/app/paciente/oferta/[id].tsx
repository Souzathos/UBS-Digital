import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { mensagemDeErro } from '@/api/cliente'
import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Cartao } from '@/componentes/Cartao'
import { Carregando, ErroTela } from '@/componentes/Estados'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useAgoraLocal } from '@/hooks/agoraLocal'
import { useAcoesOferta, useOfertas } from '@/hooks/camada2'
import { useTheme } from '@/tema/ThemeProvider'
import { dataPorExtenso, diasAte, formatarDataHora } from '@/utils/datas'
import { rotuloCategoria } from '@/utils/rotulos'

// Oferta de vaga mais cedo (RN-30 a RN-35): aceitar adianta o atendimento; manter não tem
// penalidade. Camada 2: dados de exemplo até existir GET /ofertas/minhas.
// Design: paciente/oferta-de-vaga-mais-cedo.
export default function Oferta() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const tema = useTheme()
    const consulta = useOfertas()
    const { aceitar, manter } = useAcoesOferta()
    const [erro, setErro] = useState<string>()
    const agora = useAgoraLocal()

    const oferta = consulta.data?.find(o => o.id === Number(id))
    if (consulta.isPending) return <Tela cabecalho="voltar" exemplo><Carregando /></Tela>
    if (consulta.isError || !oferta) return <Tela cabecalho="voltar" exemplo><ErroTela mensagem={consulta.error ? mensagemDeErro(consulta.error) : 'Esta oferta não existe mais.'} /></Tela>

    const resumo = `${rotuloCategoria(oferta.vaga.tipoAtendimento.categoria)} · ${oferta.vaga.tipoAtendimento.nome} · ${oferta.vaga.profissional.nome} · ${oferta.vaga.ubs}`

    async function responder(acao: 'aceitar' | 'manter') {
        setErro(undefined)
        try {
            await (acao === 'aceitar' ? aceitar : manter).mutateAsync(oferta!.id)
        } catch (e) {
            setErro(mensagemDeErro(e))
        }
    }

    if (oferta.status === 'ACEITA') {
        return (
            <Tela cabecalho="voltar" exemplo titulo="Consulta adiantada" leitura={`Sua nova data: ${dataPorExtenso(oferta.vaga.inicio)}. Já está confirmada.`}>
                <Texto cor="textoSuave">Sua vaga de {formatarDataHora(oferta.agendamentoAtual.inicio)} foi liberada para outra pessoa.</Texto>
                <Cartao>
                    <Texto variante="rotulo" cor="textoSuave">
                        Sua nova data
                    </Texto>
                    <Texto variante="dataGrande" numeros>
                        {formatarDataHora(oferta.vaga.inicio)}
                    </Texto>
                    <Texto cor="textoSuave">{resumo}</Texto>
                </Cartao>
                <Aviso tipo="sucesso">Já está confirmada. Os avisos agora seguem a nova data.</Aviso>
                <Botao titulo="Ver meus atendimentos" onPress={() => router.navigate('/paciente')} />
            </Tela>
        )
    }

    if (oferta.status !== 'PENDENTE') {
        return (
            <Tela cabecalho="voltar" exemplo titulo="Você manteve seu horário">
                <Texto>A vaga de {formatarDataHora(oferta.vaga.inicio)} passou para a próxima pessoa. Sem nenhuma penalidade.</Texto>
                <Cartao>
                    <Texto variante="rotulo" cor="textoSuave">
                        Sua consulta
                    </Texto>
                    <Texto variante="dataGrande" numeros>
                        {formatarDataHora(oferta.agendamentoAtual.inicio)}
                    </Texto>
                </Cartao>
                <Botao titulo="Ver meus atendimentos" onPress={() => router.navigate('/paciente')} />
            </Tela>
        )
    }

    const diasAntes = diasAte(oferta.agendamentoAtual.inicio, new Date(oferta.vaga.inicio))
    const faltaMs = new Date(oferta.expiraEm).getTime() - agora
    const falta = faltaMs > 0 ? `faltam ${Math.floor(faltaMs / 3_600_000)}h${String(Math.floor((faltaMs % 3_600_000) / 60_000)).padStart(2, '0')}` : 'prazo encerrado'

    return (
        <Tela
            cabecalho="voltar"
            exemplo
            titulo="Abriu uma vaga mais cedo"
            leitura={`Nova vaga: ${dataPorExtenso(oferta.vaga.inicio)}, ${diasAntes} dias antes da sua consulta. Prazo para responder: ${dataPorExtenso(oferta.expiraEm)}.`}
        >
            <Cartao destaque={tema.cores.sucesso}>
                <Texto variante="rotulo" cor="textoSuave">
                    Nova vaga
                </Texto>
                <Texto variante="dataGrande" numeros>
                    {formatarDataHora(oferta.vaga.inicio)}
                </Texto>
                <Texto cor="textoSuave">{resumo}</Texto>
                <Texto variante="corpoForte">{diasAntes} dias antes da sua consulta</Texto>
                <Botao titulo="Aceitar e adiantar" variante="sucesso" grande carregando={aceitar.isPending} onPress={() => responder('aceitar')} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <Texto variante="corpoForte">Prazo: {formatarDataHora(oferta.expiraEm)}</Texto>
                    <Texto cor="textoSuave">{falta}</Texto>
                </View>
            </Cartao>
            <Cartao>
                <Texto variante="rotulo" cor="textoSuave">
                    Sua consulta marcada
                </Texto>
                <Texto variante="subtitulo" numeros>
                    {formatarDataHora(oferta.agendamentoAtual.inicio)}
                </Texto>
                <Botao titulo="Manter meu horário" variante="contorno" carregando={manter.isPending} onPress={() => responder('manter')} />
            </Cartao>
            {erro ? <Aviso tipo="perigo">{erro}</Aviso> : null}
            <Texto cor="textoSuave">Sem resposta no prazo, a vaga passa para a próxima pessoa. Recusar ou deixar passar não tem penalidade.</Texto>
            <Botao titulo="Por que recebi esta oferta" variante="texto" onPress={() => router.push('/paciente/ofertas')} />
        </Tela>
    )
}
