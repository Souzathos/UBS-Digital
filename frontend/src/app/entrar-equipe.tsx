import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { View, type TextInputInstance } from 'react-native'

import { ApiErro, mensagemDeErro } from '@/api/cliente'
import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Campo } from '@/componentes/Campo'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useSessao } from '@/sessao/SessaoProvider'
import { ThemeProvider, useTheme } from '@/tema/ThemeProvider'

// Entrar da equipe: e-mail + senha, já na paleta escura do painel.
// Design: equipe/entrar-com-e-mail-e-senha.
export default function EntrarEquipe() {
    return (
        <ThemeProvider variante="equipe">
            <Formulario />
        </ThemeProvider>
    )
}

function Formulario() {
    const { entrarEquipe } = useSessao()
    const tema = useTheme()
    const senhaRef = useRef<TextInputInstance>(null)
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [erroEmail, setErroEmail] = useState<string>()
    const [erroSenha, setErroSenha] = useState<string>()
    const [erroGeral, setErroGeral] = useState<{ titulo: string; texto: string }>()

    async function enviar() {
        setErroGeral(undefined)
        const faltaEmail = email.trim() ? undefined : 'Digite seu e-mail.'
        const faltaSenha = senha ? undefined : 'Digite sua senha.'
        setErroEmail(faltaEmail)
        setErroSenha(faltaSenha)
        if (faltaEmail || faltaSenha) return

        setEnviando(true)
        try {
            await entrarEquipe(email.trim(), senha)
        } catch (erro) {
            setEnviando(false)
            if (erro instanceof ApiErro && erro.status === 401) {
                setErroGeral({ titulo: erro.message, texto: 'Confira e tente de novo.' })
            } else if (erro instanceof ApiErro && erro.errors.length) {
                setErroEmail(erro.doCampo('email'))
                setErroSenha(erro.doCampo('senha'))
            } else {
                setErroGeral({ titulo: 'Não foi possível entrar', texto: mensagemDeErro(erro) })
            }
        }
    }

    return (
        <Tela cabecalho="voltar" titulo="Entrar na equipe" leitura="Recepção, enfermagem, médicos e ACS. Use seu e-mail da UBS.">
            <Texto cor="textoSuave" style={{ marginTop: -8 }}>
                Recepção, enfermagem, médicos e ACS. Use seu e-mail da UBS.
            </Texto>

            {erroGeral ? <Aviso tipo="perigo" titulo={erroGeral.titulo}>{erroGeral.texto}</Aviso> : null}

            <Campo
                rotulo="E-mail"
                value={email}
                onChangeText={setEmail}
                erro={erroEmail}
                placeholder="nome@ubs.local"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => senhaRef.current?.focus()}
            />
            <Campo
                ref={senhaRef}
                rotulo="Senha"
                senha
                value={senha}
                onChangeText={setSenha}
                erro={erroSenha}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={enviar}
            />
            <Botao titulo="Entrar" grande carregando={enviando} onPress={enviar} />
            <Texto cor="textoSuave" style={{ fontSize: tema.fonte(14) }}>
                Esqueceu a senha? Fale com a coordenação da UBS.
            </Texto>

            <View style={{ alignItems: 'center', paddingTop: 24 }}>
                <Botao titulo="Sou paciente: entrar com CPF" variante="texto" onPress={() => (router.canGoBack() ? router.back() : router.replace('/entrar'))} />
            </View>
        </Tela>
    )
}
