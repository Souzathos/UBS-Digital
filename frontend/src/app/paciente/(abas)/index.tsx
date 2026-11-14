import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { mensagemDeErro } from '@/api/cliente'
import type { Agendamento } from '@/api/tipos'
import { Aviso } from '@/componentes/Aviso'
import { CartaoCompacto, CartaoHistorico, CartaoProximo } from '@/componentes/CartaoAtendimento'
import { CartaoMedico } from '@/componentes/CartaoMedico'
import { Carregando, ErroTela, Vazio } from '@/componentes/Estados'
import { Botao } from '@/componentes/Botao'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useAcoesPaciente, useMeusAtendimentos } from '@/hooks/paciente'
import { usePacienteLogado } from '@/sessao/SessaoProvider'
import { leituraAtendimento } from '@/utils/rotulos'

// Meus atendimentos (seção 6): o próximo em destaque com as ações, os seguintes e o histórico.
// Design: paciente/meus-atendimentos-confirmado-e-historico.
export default function MeusAtendimentos() {
    const paciente = usePacienteLogado()
    const consulta = useMeusAtendimentos()
    const { confirmar } = useAcoesPaciente()
    const [erroAcao, setErroAcao] = useState<string>()

    const abrir = (a: Agendamento, acao?: 'cancelar') =>
        router.push({ pathname: '/paciente/atendimento/[id]', params: acao ? { id: String(a.id), acao } : { id: String(a.id) } })

    async function confirmarPresenca(a: Agendamento) {
        setErroAcao(undefined)
        try {
            await confirmar.mutateAsync(a.id)
        } catch (erro) {
            setErroAcao(mensagemDeErro(erro))
        }
    }

    const dados = consulta.data
    const [proximo, ...depois] = dados?.proximos ?? []

    const leitura = proximo ? `Próximo atendimento. ${leituraAtendimento(proximo)}` : 'Você não tem atendimentos marcados.'

    return (
        <Tela titulo="Meus atendimentos" leitura={leitura} atualizando={consulta.isRefetching} aoAtualizar={() => consulta.refetch()}>
            <CartaoMedico paciente={paciente} />

            {consulta.isPending ? (
                <Carregando />
            ) : consulta.isError ? (
                <ErroTela mensagem={mensagemDeErro(consulta.error)} tentarDeNovo={() => consulta.refetch()} />
            ) : (
                <>
                    {erroAcao ? <Aviso tipo="perigo" titulo="Não foi possível confirmar">{erroAcao}</Aviso> : null}

                    <Secao titulo="Próximo">
                        {proximo ? (
                            <CartaoProximo
                                agendamento={proximo}
                                aoAbrir={() => abrir(proximo)}
                                aoConfirmar={() => confirmarPresenca(proximo)}
                                aoRemarcar={() => router.push({ pathname: '/paciente/atendimento/[id]/remarcar', params: { id: String(proximo.id) } })}
                                aoCancelar={() => abrir(proximo, 'cancelar')}
                                confirmando={confirmar.isPending && confirmar.variables === proximo.id}
                            />
                        ) : (
                            <View style={{ gap: 10 }}>
                                <Vazio texto="Você não tem atendimentos marcados." />
                                <Botao titulo="Agendar um atendimento" icone="mais" onPress={() => router.navigate('/paciente/agendar')} />
                            </View>
                        )}
                    </Secao>

                    {depois.length ? (
                        <Secao titulo="Depois">
                            {depois.map(a => (
                                <CartaoCompacto key={a.id} agendamento={a} aoAbrir={() => abrir(a)} />
                            ))}
                        </Secao>
                    ) : null}

                    {dados?.historico.length ? (
                        <Secao titulo="Histórico">
                            {dados.historico.map(a => (
                                <CartaoHistorico key={a.id} agendamento={a} aoAbrir={() => abrir(a)} />
                            ))}
                        </Secao>
                    ) : null}
                </>
            )}
        </Tela>
    )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <View style={{ gap: 8 }}>
            <Texto variante="secao" cor="textoSuave" titulo>
                {titulo}
            </Texto>
            {children}
        </View>
    )
}
