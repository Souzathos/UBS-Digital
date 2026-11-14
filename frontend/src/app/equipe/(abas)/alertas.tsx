import { useState } from 'react'
import { View } from 'react-native'

import { mensagemDeErro } from '@/api/cliente'
import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Cartao } from '@/componentes/Cartao'
import { Carregando, ErroTela, Vazio } from '@/componentes/Estados'
import { Etiqueta } from '@/componentes/Etiqueta'
import { IconeSelo } from '@/componentes/Painel'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useAcoesAlerta, useAlertas } from '@/hooks/camada2'
import { usePodeAgir } from '@/hooks/equipe'
import type { Alerta } from '@/servicos/camada2/contratos'
import { useTheme } from '@/tema/ThemeProvider'
import { formatarDataHora } from '@/utils/datas'

// Alertas de vulneráveis (RN-27): com selo, a consulta não é cancelada sem resposta; vira alerta
// para a recepção e o ACS fazerem contato. Camada 2: dados de exemplo até existir
// GET /equipe/alertas. Design: equipe/alertas-de-vulneraveis.
export default function Alertas() {
    const { cores } = useTheme()
    const consulta = useAlertas()
    const { atribuir, resolver } = useAcoesAlerta()
    const podeAgir = usePodeAgir()
    const [erro, setErro] = useState<string>()

    const visual = (a: Alerta) =>
        a.status === 'ABERTO'
            ? { texto: 'Aberto', cores: cores.status.pendente, situacao: `Aberto desde ${formatarDataHora(a.atualizadoEm)}` }
            : a.status === 'EM_CONTATO'
              ? { texto: 'Em contato', cores: cores.status.confirmado, situacao: `Com ${a.responsavel} desde ${formatarDataHora(a.atualizadoEm)}` }
              : { texto: 'Resolvido', cores: cores.status.compareceu, situacao: `Resolvido por ${a.responsavel} em ${formatarDataHora(a.atualizadoEm)}` }

    async function agir(acao: () => Promise<unknown>) {
        setErro(undefined)
        try {
            await acao()
        } catch (e) {
            setErro(mensagemDeErro(e))
        }
    }

    const abertos = consulta.data?.filter(a => a.status !== 'RESOLVIDO').length ?? 0

    return (
        <Tela titulo="Alertas" exemplo leitura={`${abertos} alertas abertos ou em contato.`} atualizando={consulta.isRefetching} aoAtualizar={() => consulta.refetch()}>
            <Texto cor="textoSuave" style={{ marginTop: -6 }}>
                Pacientes com selo que não responderam aos avisos
            </Texto>
            <Aviso tipo="info">Com selo de vulnerável, a consulta não é cancelada sem resposta. Ela continua pendente e a equipe faz o contato.</Aviso>
            {erro ? <Aviso tipo="perigo">{erro}</Aviso> : null}
            {consulta.isPending ? (
                <Carregando />
            ) : consulta.isError ? (
                <ErroTela mensagem={mensagemDeErro(consulta.error)} tentarDeNovo={() => consulta.refetch()} />
            ) : consulta.data.length ? (
                consulta.data.map(a => {
                    const v = visual(a)
                    return (
                        <Cartao key={a.id}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                                    <IconeSelo />
                                    <Texto variante="corpoForte">
                                        {a.paciente.nome}, {a.paciente.idade}
                                    </Texto>
                                </View>
                                <Etiqueta texto={v.texto} cores={v.cores} />
                            </View>
                            <Texto numeros>Consulta {formatarDataHora(a.consulta)}</Texto>
                            <Texto cor="textoSuave">{a.motivo}</Texto>
                            <Texto variante="legenda" cor="textoSuave">
                                {v.situacao}
                            </Texto>
                            {podeAgir && a.status === 'ABERTO' ? <Botao titulo="Atribuir ao ACS" carregando={atribuir.isPending && atribuir.variables === a.id} onPress={() => agir(() => atribuir.mutateAsync(a.id))} /> : null}
                            {a.status === 'EM_CONTATO' ? <Botao titulo="Dar baixa" variante="contorno" carregando={resolver.isPending && resolver.variables === a.id} onPress={() => agir(() => resolver.mutateAsync(a.id))} /> : null}
                        </Cartao>
                    )
                })
            ) : (
                <Vazio texto="Nenhum alerta. Todos os pacientes com selo responderam aos avisos." />
            )}
        </Tela>
    )
}
