import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { Image, View, type TextInputInstance } from 'react-native'

import { ApiErro, mensagemDeErro } from '@/api/cliente'
import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Campo } from '@/componentes/Campo'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { REDE_NOME } from '@/config'
import { useSessao } from '@/sessao/SessaoProvider'
import { cpfCompleto, mascararCpf, somenteDigitos } from '@/utils/cpf'

// Entrar do paciente: CPF + senha (seção 6). Design: paciente/entrar-paciente-com-cpf-e-senha.
export default function Entrar() {
    const { entrarPaciente } = useSessao()
    const senhaRef = useRef<TextInputInstance>(null)
    const [cpf, setCpf] = useState('')
    const [senha, setSenha] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [erroCpf, setErroCpf] = useState<string>()
    const [erroSenha, setErroSenha] = useState<string>()
    const [erroGeral, setErroGeral] = useState<{ titulo: string; texto: string }>()
    const [ajuda, setAjuda] = useState(false)

    async function enviar() {
        setErroGeral(undefined)
        // Só confere se os campos estão preenchidos; quem valida o CPF é a API.
        const faltaCpf = cpfCompleto(cpf) ? undefined : 'Digite os 11 números do CPF.'
        const faltaSenha = senha ? undefined : 'Digite sua senha.'
        setErroCpf(faltaCpf)
        setErroSenha(faltaSenha)
        if (faltaCpf || faltaSenha) return

        setEnviando(true)
        try {
            // Deu certo: a sessão muda e as guardas levam para a tela certa (atendimentos ou
            // "Crie sua senha"). Esta tela não navega.
            await entrarPaciente(somenteDigitos(cpf), senha)
        } catch (erro) {
            setEnviando(false)
            if (erro instanceof ApiErro && erro.status === 401) {
                setErroGeral({ titulo: erro.message, texto: 'Confira os números e tente de novo.' })
            } else if (erro instanceof ApiErro && erro.errors.length) {
                setErroCpf(erro.doCampo('cpf'))
                setErroSenha(erro.doCampo('senha'))
            } else {
                setErroGeral({ titulo: 'Não foi possível entrar', texto: mensagemDeErro(erro) })
            }
        }
    }

    return (
        <Tela cabecalho="simples" leitura="Entrar. Digite seu CPF e sua senha.">
            <View style={{ alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 20 }}>
                <Image source={require('../../assets/imagens/logo-ubs.png')} style={{ width: 150, height: 110 }} resizeMode="contain" accessible={false} />
                <Texto variante="titulo" peso="700" alinhar="center" titulo>
                    {REDE_NOME}
                </Texto>
            </View>

            {erroGeral ? <Aviso tipo="perigo" titulo={erroGeral.titulo}>{erroGeral.texto}</Aviso> : null}

            <Campo
                rotulo="CPF"
                mono
                value={cpf}
                onChangeText={t => setCpf(mascararCpf(t))}
                erro={erroCpf}
                placeholder="000.000.000-00"
                keyboardType="number-pad"
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => senhaRef.current?.focus()}
                maxLength={14}
            />
            <Campo
                ref={senhaRef}
                rotulo="Senha"
                mono
                senha
                value={senha}
                onChangeText={setSenha}
                erro={erroSenha}
                autoComplete="current-password"
                textContentType="password"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={enviar}
            />
            <Botao titulo="Entrar" grande carregando={enviando} onPress={enviar} style={{ marginTop: 6 }} />

            <View style={{ alignItems: 'center', gap: 2, paddingTop: 28 }}>
                {ajuda ? (
                    <View style={{ marginBottom: 6 }}>
                        <Aviso tipo="info">A recepção da UBS cria uma senha nova para você. Leve um documento com foto.</Aviso>
                    </View>
                ) : null}
                <Botao titulo="Esqueci minha senha" variante="texto" onPress={() => setAjuda(a => !a)} />
                <Botao titulo="Sou da equipe da UBS" variante="texto" onPress={() => router.push('/entrar-equipe')} />
                {__DEV__ ? <Botao titulo="Vitrine dos componentes (dev)" variante="texto" onPress={() => router.push('/vitrine')} /> : null}
            </View>
        </Tela>
    )
}
