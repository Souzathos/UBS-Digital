import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { mensagemDeErro } from '@/api/cliente'
import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Campo } from '@/componentes/Campo'
import { Cartao } from '@/componentes/Cartao'
import { Carregando, ErroTela } from '@/componentes/Estados'
import { IconeSelo } from '@/componentes/Painel'
import { SeletorRua } from '@/componentes/SeletorRua'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useAcoesPacientes, useAgora, usePaciente, usePodeAgir, useRuas } from '@/hooks/equipe'
import { guardarSenhaGerada } from '@/hooks/senhaGerada'
import { useTheme } from '@/tema/ThemeProvider'
import { formatarTelefone, mascararCpf } from '@/utils/cpf'
import { formatarDataNascimento, idade } from '@/utils/datas'

const NOME_CANAL: Record<string, string> = { PUSH: 'App', WHATSAPP: 'WhatsApp', SMS: 'SMS', EMAIL: 'E-mail' }

// Ficha do paciente (seção 6, painel 2): dados, endereço e médico de referência (RN-06), canais
// autorizados (RN-80), pontuação e selo (só no painel, RN-52), redefinir senha.
// Design: equipe/contato-consentimento-e-selo.
export default function FichaPaciente() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const tema = useTheme()
    const agora = useAgora()
    const podeAgir = usePodeAgir()
    const consulta = usePaciente(Number(id))
    const ruas = useRuas()
    const { atualizarEndereco, redefinirSenha } = useAcoesPacientes()
    const [editando, setEditando] = useState(false)
    const [ruaId, setRuaId] = useState<number | null>(null)
    const [numero, setNumero] = useState('')
    const [confirmarSenha, setConfirmarSenha] = useState(false)
    const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'perigo'; texto: string }>()

    const p = consulta.data
    if (consulta.isPending) return <Tela cabecalho="voltar"><Carregando /></Tela>
    if (consulta.isError || !p) return <Tela cabecalho="voltar"><ErroTela mensagem={mensagemDeErro(consulta.error)} tentarDeNovo={() => consulta.refetch()} /></Tela>

    const canais = Object.entries(p.consentimentoCanais).filter(([, c]) => c?.aceito).map(([canal]) => NOME_CANAL[canal] ?? canal)

    async function salvarEndereco() {
        if (!ruaId || !numero.trim()) {
            setMensagem({ tipo: 'perigo', texto: 'Escolha a rua e digite o número.' })
            return
        }
        setMensagem(undefined)
        try {
            const novo = await atualizarEndereco.mutateAsync({ id: p!.id, ruaId, numero: numero.trim() })
            setEditando(false)
            setMensagem({ tipo: 'sucesso', texto: `Endereço salvo. Médico de referência: ${novo.medicoReferencia?.nome ?? 'nenhum'}.` })
        } catch (e) {
            setMensagem({ tipo: 'perigo', texto: mensagemDeErro(e) })
        }
    }

    async function gerarSenha() {
        setMensagem(undefined)
        try {
            const r = await redefinirSenha.mutateAsync(p!.id)
            guardarSenhaGerada({
                pacienteId: r.paciente.id,
                nome: r.paciente.nome,
                cpf: r.paciente.cpf,
                senha: r.senhaProvisoria,
                endereco: `${r.paciente.rua?.nome ?? 'Sem rua'}, ${r.paciente.numero ?? ''}`,
                medico: r.paciente.medicoReferencia?.nome ?? null,
                novo: false
            })
            router.push('/equipe/senha-gerada')
        } catch (e) {
            setMensagem({ tipo: 'perigo', texto: mensagemDeErro(e) })
        }
    }

    return (
        <Tela cabecalho="voltar" titulo={p.nome} leitura={`${p.nome}, ${idade(p.dataNascimento, agora)} anos. ${p.medicoReferencia ? `Médico de referência: ${p.medicoReferencia.nome}.` : 'Sem rua cadastrada.'}`}>
            <Texto cor="textoSuave" style={{ marginTop: -6 }}>
                {idade(p.dataNascimento, agora)} anos · {p.possuiCelular ? 'com celular próprio' : 'sem celular próprio'}
            </Texto>
            {mensagem ? <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso> : null}

            <Cartao>
                <Linha rotulo="CPF" valor={mascararCpf(p.cpf)} />
                <Linha rotulo="Nascimento" valor={formatarDataNascimento(p.dataNascimento)} />
                {p.cns ? <Linha rotulo="Cartão SUS" valor={p.cns} /> : null}
                <Linha rotulo="Telefone" valor={p.telefone ? formatarTelefone(p.telefone) : 'não informado'} />
                {p.email ? <Linha rotulo="E-mail" valor={p.email} /> : null}
                <Linha rotulo="Canais autorizados" valor={canais.length ? canais.join(', ') : 'nenhum'} />
            </Cartao>

            <View style={{ gap: 8 }}>
                <Texto variante="subtitulo" titulo>
                    Endereço e médico
                </Texto>
                {editando ? (
                    <Cartao>
                        <SeletorRua ruas={ruas.data ?? []} selecionada={ruaId} aoEscolher={r => setRuaId(r.id)} />
                        <Campo rotulo="Nº *" value={numero} onChangeText={setNumero} keyboardType="number-pad" />
                        {ruaId ? <Texto cor="textoSuave">Médico de referência: {ruas.data?.find(r => r.id === ruaId)?.medicoReferencia.nome}</Texto> : null}
                        <Botao titulo="Salvar endereço" carregando={atualizarEndereco.isPending} onPress={salvarEndereco} />
                        <Botao titulo="Cancelar" variante="texto" onPress={() => setEditando(false)} />
                    </Cartao>
                ) : (
                    <Cartao>
                        <Texto variante="corpoForte">{p.rua ? `${p.rua.nome}, ${p.numero}` : 'Sem rua cadastrada'}</Texto>
                        <Texto cor="textoSuave">
                            {p.medicoReferencia ? `Médico de referência: ${p.medicoReferencia.nome} (pela rua)` : 'Sem médico de referência: consulta médica fica bloqueada até cadastrar a rua.'}
                        </Texto>
                        {podeAgir ? (
                            <Botao
                                titulo={p.rua ? 'Mudar endereço' : 'Cadastrar rua'}
                                variante="contorno"
                                onPress={() => {
                                    setRuaId(p.rua?.id ?? null)
                                    setNumero(p.numero ?? '')
                                    setEditando(true)
                                }}
                            />
                        ) : null}
                    </Cartao>
                )}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
                <Cartao style={{ flex: 1 }}>
                    <Texto variante="rotulo" cor="textoSuave">
                        Pontuação de compromisso
                    </Texto>
                    {/* Só a equipe vê o número (seção 6). */}
                    <Texto peso="700" numeros style={{ fontSize: tema.fonte(28), lineHeight: tema.fonte(32) }}>
                        {String(p.pontuacao)}
                    </Texto>
                </Cartao>
                <Cartao style={{ flex: 1 }}>
                    <Texto variante="rotulo" cor="textoSuave">
                        Selo de vulnerável
                    </Texto>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {p.vulneravel ? <IconeSelo /> : null}
                        <Texto variante="corpoForte">{p.vulneravel ? 'Ativo' : 'Inativo'}</Texto>
                    </View>
                </Cartao>
            </View>

            {podeAgir ? (
                <View style={{ gap: 8 }}>
                    <Botao titulo="Agendar para este paciente" icone="mais" onPress={() => router.push({ pathname: '/equipe/agendar', params: { pacienteId: String(p.id) } })} />
                    {confirmarSenha ? (
                        <Cartao>
                            <Texto variante="corpoForte">Gerar uma senha provisória nova?</Texto>
                            <Texto cor="textoSuave">A senha atual deixa de funcionar e o paciente cria outra no primeiro acesso.</Texto>
                            <Botao titulo="Sim, gerar senha nova" carregando={redefinirSenha.isPending} onPress={gerarSenha} />
                            <Botao titulo="Não" variante="texto" onPress={() => setConfirmarSenha(false)} />
                        </Cartao>
                    ) : (
                        <Botao titulo="Redefinir senha" variante="contorno" onPress={() => setConfirmarSenha(true)} />
                    )}
                </View>
            ) : null}
        </Tela>
    )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
            <Texto cor="textoSuave">{rotulo}</Texto>
            <Texto variante="corpoForte" numeros style={{ flexShrink: 1, textAlign: 'right' }}>
                {valor}
            </Texto>
        </View>
    )
}
