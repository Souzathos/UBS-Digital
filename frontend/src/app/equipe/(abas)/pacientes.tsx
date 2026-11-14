import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { mensagemDeErro } from '@/api/cliente'
import { Botao } from '@/componentes/Botao'
import { Campo } from '@/componentes/Campo'
import { Cartao } from '@/componentes/Cartao'
import { Carregando, ErroTela } from '@/componentes/Estados'
import { IconeSelo } from '@/componentes/Painel'
import { Aviso } from '@/componentes/Aviso'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { UBS_NOME } from '@/config'
import { useAgora, usePacientes, usePodeAgir } from '@/hooks/equipe'
import { cpfParcial } from '@/utils/cpf'
import { idade } from '@/utils/datas'

// Pacientes com busca por nome ou início do CPF (seção 6, painel 2). A busca é da API (?q=).
// Design: equipe/pacientes-com-busca.
export default function Pacientes() {
    const podeAgir = usePodeAgir()
    const agora = useAgora()
    const [digitado, setDigitado] = useState('')
    const [q, setQ] = useState('')
    const busca = usePacientes(q)

    // Espera a pessoa parar de digitar antes de buscar.
    useEffect(() => {
        const t = setTimeout(() => setQ(digitado.trim()), 300)
        return () => clearTimeout(t)
    }, [digitado])

    const lista = busca.data ?? []
    const contagem = !q ? `${lista.length} pacientes da ${UBS_NOME}` : lista.length === 1 ? '1 encontrado' : `${lista.length} encontrados`

    return (
        <Tela
            titulo="Pacientes"
            leitura={contagem}
            atualizando={busca.isRefetching}
            aoAtualizar={() => busca.refetch()}
            acaoTitulo={podeAgir ? <Botao titulo="Cadastrar" icone="mais" onPress={() => router.push('/equipe/paciente/novo')} style={{ minHeight: 48 }} /> : undefined}
        >
            <Campo rotulo="Buscar por nome ou CPF" value={digitado} onChangeText={setDigitado} placeholder="Nome ou CPF" autoCorrect={false} returnKeyType="search" />
            <Texto cor="textoSuave" accessibilityLiveRegion="polite">
                {busca.isPending ? 'Buscando…' : contagem}
            </Texto>

            {busca.isPending ? (
                <Carregando />
            ) : busca.isError ? (
                <ErroTela mensagem={mensagemDeErro(busca.error)} tentarDeNovo={() => busca.refetch()} />
            ) : lista.length ? (
                <View style={{ gap: 6 }}>
                    {lista.map(p => (
                        <Cartao
                            key={p.id}
                            onPress={() => router.push({ pathname: '/equipe/paciente/[id]', params: { id: String(p.id) } })}
                            rotulo={`${p.nome}${p.vulneravel ? ', selo de vulnerável' : ''}. ${idade(p.dataNascimento, agora)} anos. ${p.rua ? `${p.rua.nome}, ${p.numero}` : 'sem rua cadastrada'}.`}
                            dica="Abre a ficha"
                            style={{ gap: 2 }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Texto variante="corpoForte">{p.nome}</Texto>
                                {p.vulneravel ? <IconeSelo /> : null}
                            </View>
                            <Texto cor="textoSuave">
                                {idade(p.dataNascimento, agora)} anos · {p.rua ? `${p.rua.nome}, ${p.numero}` : 'sem rua cadastrada'}
                            </Texto>
                            <Texto variante="mono" cor="textoSuave">
                                {cpfParcial(p.cpf)}
                            </Texto>
                        </Cartao>
                    ))}
                </View>
            ) : (
                <Aviso tipo="info" titulo="Ninguém encontrado">
                    Confira o nome ou o CPF. Se a pessoa ainda não tem cadastro, cadastre agora.
                </Aviso>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IconeSelo />
                <Texto variante="legenda" cor="textoSuave">
                    Selo de vulnerável. Só a equipe vê.
                </Texto>
            </View>
        </Tela>
    )
}
