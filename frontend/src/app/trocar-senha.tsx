import { useRef, useState } from 'react'
import { View, type TextInputInstance } from 'react-native'

import { ApiErro, mensagemDeErro } from '@/api/cliente'
import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Campo } from '@/componentes/Campo'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useSessao } from '@/sessao/SessaoProvider'
import { useTheme } from '@/tema/ThemeProvider'

// "Crie sua senha": a única tela possível enquanto a senha for provisória (handoff, seção 3).
// A guarda do layout raiz não deixa abrir nenhuma outra. Design: paciente/crie-sua-senha.
export default function TrocarSenha() {
    const { trocarSenha, sair } = useSessao()
    const tema = useTheme()
    const novaRef = useRef<TextInputInstance>(null)
    const repetirRef = useRef<TextInputInstance>(null)
    const [atual, setAtual] = useState('')
    const [nova, setNova] = useState('')
    const [repetir, setRepetir] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [erros, setErros] = useState<{ atual?: string; nova?: string; repetir?: string }>({})
    const [erroGeral, setErroGeral] = useState<string>()

    async function enviar() {
        setErroGeral(undefined)
        // Só confere o que é da tela (campos vazios, as duas novas iguais). O tamanho mínimo e
        // "diferente da atual" são regras da API, que devolve a mensagem certa para cada campo.
        const novos = {
            atual: atual ? undefined : 'Digite a senha que a recepção entregou.',
            nova: nova ? undefined : 'Digite a nova senha.',
            repetir: repetir === nova ? undefined : 'As senhas não são iguais. Digite de novo.'
        }
        setErros(novos)
        if (novos.atual || novos.nova || novos.repetir) return

        setEnviando(true)
        try {
            // Deu certo: a sessão passa a ter o token liberado e as guardas abrem o app.
            await trocarSenha(atual, nova)
        } catch (erro) {
            setEnviando(false)
            if (erro instanceof ApiErro && erro.status === 401) {
                setErros({ atual: erro.message })
            } else if (erro instanceof ApiErro && erro.errors.length) {
                setErros({ atual: erro.doCampo('senhaAtual'), nova: erro.doCampo('novaSenha') })
            } else {
                setErroGeral(mensagemDeErro(erro))
            }
        }
    }

    return (
        <Tela cabecalho="simples" leitura="Crie sua senha. Troque a senha que a recepção entregou por uma senha só sua.">
            <View style={{ gap: 6, paddingTop: 8 }}>
                <Texto variante="titulo" peso="700" titulo style={{ fontSize: tema.fonte(32), lineHeight: tema.fonte(35) }}>
                    Crie sua senha
                </Texto>
                <Texto cor="textoSuave" style={{ fontSize: tema.fonte(17), lineHeight: tema.fonte(23) }}>
                    Troque a senha que a recepção entregou por uma senha só sua.
                </Texto>
            </View>

            {erroGeral ? <Aviso tipo="perigo" titulo="Não foi possível salvar">{erroGeral}</Aviso> : null}

            <Campo
                rotulo="Senha atual"
                mono
                senha
                value={atual}
                onChangeText={setAtual}
                erro={erros.atual}
                dica="É a senha que a recepção entregou."
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="next"
                onSubmitEditing={() => novaRef.current?.focus()}
            />
            <Campo
                ref={novaRef}
                rotulo="Nova senha"
                mono
                senha
                value={nova}
                onChangeText={setNova}
                erro={erros.nova}
                dica="Use pelo menos 6 letras ou números."
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => repetirRef.current?.focus()}
            />
            <Campo
                ref={repetirRef}
                rotulo="Repita a nova senha"
                mono
                senha
                value={repetir}
                onChangeText={setRepetir}
                erro={erros.repetir}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={enviar}
            />
            <Botao titulo="Salvar e entrar" grande carregando={enviando} onPress={enviar} style={{ marginTop: 6 }} />
            <Botao titulo="Não sou eu: sair" variante="texto" onPress={sair} />
        </Tela>
    )
}
