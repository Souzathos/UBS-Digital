import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { mensagemDeErro } from '@/api/cliente'
import type { Canal } from '@/api/tipos'
import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Cartao } from '@/componentes/Cartao'
import { Interruptor } from '@/componentes/Interruptor'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { servicos } from '@/servicos'
import { usePacienteLogado, useSessao, useNomeUbs } from '@/sessao/SessaoProvider'
import { formatarTelefone, mascararCpf } from '@/utils/cpf'

// Perfil (seção 6, "Notificações"): seu médico pela rua (RN-06) e os canais de aviso (RN-80).
// Cada canal liga e desliga na hora; canal desligado nunca é usado, nem o push.
// Design: paciente/perfil-do-paciente.
export default function Perfil() {
    const nomeUbs = useNomeUbs()
    const paciente = usePacienteLogado()
    const { sair, atualizar } = useSessao()
    const [salvando, setSalvando] = useState<Canal | null>(null)
    const [erro, setErro] = useState<string>()

    const telefone = paciente.telefone ? formatarTelefone(paciente.telefone) : 'Sem telefone cadastrado: avise a recepção'
    const canais: { canal: Canal; nome: string; detalhe: string }[] = [
        { canal: 'PUSH', nome: 'App', detalhe: 'Notificação neste celular' },
        { canal: 'WHATSAPP', nome: 'WhatsApp', detalhe: telefone },
        { canal: 'SMS', nome: 'SMS', detalhe: telefone },
        ...(paciente.email ? [{ canal: 'EMAIL' as Canal, nome: 'E-mail', detalhe: paciente.email }] : [])
    ]
    const ligados = canais.filter(c => paciente.consentimentoCanais[c.canal]?.aceito).map(c => c.canal)

    async function alternar(canal: Canal) {
        setErro(undefined)
        setSalvando(canal)
        const novos = ligados.includes(canal) ? ligados.filter(c => c !== canal) : [...ligados, canal]
        try {
            await servicos.auth.atualizarCanais(novos)
            await atualizar()
        } catch (e) {
            setErro(mensagemDeErro(e))
        } finally {
            setSalvando(null)
        }
    }

    const leitura = `${paciente.nome}. ${paciente.medicoReferencia ? `Seu médico: ${paciente.medicoReferencia.nome}, pela sua rua.` : ''} Canais ligados: ${ligados.length ? canais.filter(c => ligados.includes(c.canal)).map(c => c.nome).join(', ') : 'nenhum'}.`

    return (
        <Tela titulo="Perfil" leitura={leitura}>
            <Cartao>
                <Texto variante="subtitulo">{paciente.nome}</Texto>
                <Texto cor="textoSuave" numeros>
                    CPF {mascararCpf(paciente.cpf)}
                </Texto>
                <Texto cor="textoSuave">{nomeUbs}</Texto>
                {paciente.medicoReferencia ? (
                    <View style={{ gap: 2, paddingTop: 4 }}>
                        <Texto variante="corpoForte">
                            Seu médico: {paciente.medicoReferencia.nome} (pela sua rua: {paciente.rua?.nome})
                        </Texto>
                        <Texto cor="textoSuave">Mudou de endereço? Avise a recepção.</Texto>
                    </View>
                ) : (
                    <Texto cor="textoSuave">Sem rua cadastrada. Para marcar consulta com o médico, avise a recepção.</Texto>
                )}
            </Cartao>

            <View style={{ gap: 4 }}>
                <Texto variante="subtitulo" titulo>
                    Como a UBS avisa você
                </Texto>
                <Cartao style={{ gap: 0, paddingVertical: 4 }}>
                    {canais.map(c => (
                        <Interruptor key={c.canal} rotulo={c.nome} detalhe={c.detalhe} ligado={ligados.includes(c.canal)} salvando={salvando === c.canal} desabilitado={!!salvando && salvando !== c.canal} alternar={() => alternar(c.canal)} />
                    ))}
                </Cartao>
            </View>
            {erro ? <Aviso tipo="perigo" titulo="Não foi possível salvar">{erro}</Aviso> : null}
            {ligados.length === 0 ? (
                <Aviso tipo="aviso" titulo="Nenhum canal ligado" anunciar>
                    Com tudo desligado, a UBS não consegue avisar você das consultas.
                </Aviso>
            ) : null}
            {/* RN-80: ligar um canal registra o consentimento para aquele canal. */}
            <Texto cor="textoSuave">Ao ligar um canal, você autoriza a UBS a mandar avisos de consulta por ele.</Texto>

            <Botao titulo="Trocar senha" variante="contorno" onPress={() => router.push('/paciente/trocar-senha')} />
            <Botao titulo="Sair" variante="perigo" onPress={sair} />
        </Tela>
    )
}
