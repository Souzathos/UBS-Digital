import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { ApiErro, mensagemDeErro } from '@/api/cliente'
import type { Canal } from '@/api/tipos'
import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Campo } from '@/componentes/Campo'
import { Carregando, ErroTela } from '@/componentes/Estados'
import { Filtro } from '@/componentes/Filtro'
import { Interruptor } from '@/componentes/Interruptor'
import { SeletorRua } from '@/componentes/SeletorRua'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useAcoesPacientes, useRuas } from '@/hooks/equipe'
import { guardarSenhaGerada } from '@/hooks/senhaGerada'
import { cpfCompleto, formatarTelefone, mascararCpf, somenteDigitos } from '@/utils/cpf'
import { lerDataNascimento, mascararData } from '@/utils/datas'

const CANAIS: { canal: Canal; nome: string }[] = [
    { canal: 'PUSH', nome: 'App' },
    { canal: 'WHATSAPP', nome: 'WhatsApp' },
    { canal: 'SMS', nome: 'SMS' },
    { canal: 'EMAIL', nome: 'E-mail' }
]

type Erros = Partial<Record<'nome' | 'cpf' | 'dataNascimento' | 'ruaId' | 'numero' | 'cns' | 'telefone' | 'email', string>>

// Cadastrar paciente (seção 6, painel 2). A rua define o médico de referência (RN-06); os canais
// marcados registram o consentimento (RN-80). A API gera a senha provisória.
// Design: equipe/cadastrar-paciente-medico-pela-rua.
export default function CadastrarPaciente() {
    const ruas = useRuas()
    const { cadastrar } = useAcoesPacientes()
    const [nome, setNome] = useState('')
    const [cpf, setCpf] = useState('')
    const [nascimento, setNascimento] = useState('')
    const [cns, setCns] = useState('')
    const [telefone, setTelefone] = useState('')
    const [email, setEmail] = useState('')
    const [ruaId, setRuaId] = useState<number | null>(null)
    const [numero, setNumero] = useState('')
    const [possuiCelular, setPossuiCelular] = useState(true)
    const [canais, setCanais] = useState<Canal[]>(['SMS'])
    const [erros, setErros] = useState<Erros>({})
    const [erroGeral, setErroGeral] = useState<string>()

    const rua = ruas.data?.find(r => r.id === ruaId)

    async function salvar() {
        setErroGeral(undefined)
        const dataNascimento = lerDataNascimento(nascimento)
        // Só o preenchimento obrigatório; o resto (CPF válido, CPF repetido…) a API confere.
        const novos: Erros = {
            nome: nome.trim() ? undefined : 'Digite o nome completo.',
            cpf: cpfCompleto(cpf) ? undefined : 'Digite os 11 números do CPF.',
            dataNascimento: dataNascimento ? undefined : 'Use o formato dia/mês/ano, ex.: 03/05/1952.',
            ruaId: ruaId ? undefined : 'Escolha a rua.',
            numero: numero.trim() ? undefined : 'Digite o número.'
        }
        setErros(novos)
        if (Object.values(novos).some(Boolean)) return

        try {
            const r = await cadastrar.mutateAsync({
                nome: nome.trim(),
                cpf: somenteDigitos(cpf),
                dataNascimento: dataNascimento!,
                ruaId: ruaId!,
                numero: numero.trim(),
                cns: somenteDigitos(cns) || undefined,
                telefone: somenteDigitos(telefone) || undefined,
                email: email.trim() || undefined,
                possuiCelular,
                consentimentoCanais: canais
            })
            guardarSenhaGerada({
                pacienteId: r.paciente.id,
                nome: r.paciente.nome,
                cpf: r.paciente.cpf,
                senha: r.senhaProvisoria,
                endereco: `${r.paciente.rua?.nome ?? ''}, ${r.paciente.numero ?? ''}`,
                medico: r.paciente.medicoReferencia?.nome ?? null,
                novo: true
            })
            router.replace('/equipe/senha-gerada')
        } catch (e) {
            if (e instanceof ApiErro && e.errors.length) {
                const porCampo: Erros = {}
                for (const campo of ['nome', 'cpf', 'dataNascimento', 'ruaId', 'numero', 'cns', 'telefone', 'email'] as const) porCampo[campo] = e.doCampo(campo)
                setErros(porCampo)
                setErroGeral(e.message)
            } else if (e instanceof ApiErro && e.status === 409) {
                setErros({ cpf: e.message })
            } else {
                setErroGeral(mensagemDeErro(e))
            }
        }
    }

    if (ruas.isPending) return <Tela cabecalho="voltar"><Carregando /></Tela>
    if (ruas.isError) return <Tela cabecalho="voltar"><ErroTela mensagem={mensagemDeErro(ruas.error)} tentarDeNovo={() => ruas.refetch()} /></Tela>

    return (
        <Tela
            cabecalho="voltar"
            titulo="Cadastrar paciente"
            leitura="Cadastrar paciente. Campos com asterisco são obrigatórios."
            rodape={<Botao titulo="Salvar e gerar senha" grande carregando={cadastrar.isPending} onPress={salvar} />}
        >
            <Texto cor="textoSuave" style={{ marginTop: -6 }}>
                Campos com * são obrigatórios.
            </Texto>
            {erroGeral ? <Aviso tipo="perigo" titulo="Confira o cadastro">{erroGeral}</Aviso> : null}

            <Campo rotulo="Nome completo *" value={nome} onChangeText={setNome} erro={erros.nome} autoComplete="name" autoCapitalize="words" />
            <Campo rotulo="CPF *" mono value={cpf} onChangeText={t => setCpf(mascararCpf(t))} erro={erros.cpf} keyboardType="number-pad" placeholder="000.000.000-00" maxLength={14} />
            <Campo rotulo="Nascimento *" mono value={nascimento} onChangeText={t => setNascimento(mascararData(t))} erro={erros.dataNascimento} keyboardType="number-pad" placeholder="dd/mm/aaaa" maxLength={10} />
            <Campo rotulo="Cartão SUS" mono value={cns} onChangeText={t => setCns(somenteDigitos(t).slice(0, 15))} erro={erros.cns} keyboardType="number-pad" placeholder="15 números" />
            <Campo rotulo="Telefone" value={telefone} onChangeText={t => setTelefone(formatarTelefone(t))} erro={erros.telefone} keyboardType="phone-pad" placeholder="(51) 99999-0000" />
            <Campo rotulo="E-mail" value={email} onChangeText={setEmail} erro={erros.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />

            <SeletorRua ruas={ruas.data ?? []} selecionada={ruaId} aoEscolher={r => setRuaId(r.id)} erro={erros.ruaId} />
            <Campo rotulo="Nº *" value={numero} onChangeText={setNumero} erro={erros.numero} keyboardType="number-pad" />
            {rua ? (
                <Aviso tipo="info" titulo={`Médico de referência: ${rua.medicoReferencia.nome}`}>
                    Definido pela rua. O paciente não escolhe.
                </Aviso>
            ) : null}

            <Interruptor rotulo="Tem celular próprio" detalhe="Sem celular, vincule um contato na ficha do paciente." ligado={possuiCelular} alternar={() => setPossuiCelular(v => !v)} />

            <View style={{ gap: 8 }} accessibilityRole="none" accessibilityLabel="Canais de aviso autorizados">
                <Texto variante="subtitulo">Canais de aviso autorizados</Texto>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {CANAIS.map(c => (
                        <Filtro key={c.canal} multiplo rotulo={c.nome} selecionado={canais.includes(c.canal)} onPress={() => setCanais(l => (l.includes(c.canal) ? l.filter(x => x !== c.canal) : [...l, c.canal]))} />
                    ))}
                </View>
                {/* RN-80: o consentimento de cada canal fica registrado com a data. */}
                <Texto variante="legenda" cor="textoSuave">
                    Marque só os canais que o paciente autorizou agora.
                </Texto>
            </View>
        </Tela>
    )
}
