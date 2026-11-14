import { useRef, useState } from 'react'
import type { TextInputInstance } from 'react-native'

import { ApiErro, mensagemDeErro } from '@/api/cliente'
import { Aviso } from './Aviso'
import { Botao } from './Botao'
import { Campo } from './Campo'

type Props = {
    aoSalvar: (senhaAtual: string, novaSenha: string) => Promise<void>
    dicaAtual?: string
    tituloBotao: string
}

// Senha atual + nova + repetir. Usado em "Crie sua senha" (senha provisória) e em "Trocar senha"
// (Perfil). Só confere o que é da tela (campos vazios, as duas novas iguais); o tamanho mínimo e
// "diferente da atual" são regras da API, que devolve a mensagem certa para cada campo.
export function FormularioSenha({ aoSalvar, dicaAtual, tituloBotao }: Props) {
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
        const novos = {
            atual: atual ? undefined : 'Digite a senha atual.',
            nova: nova ? undefined : 'Digite a nova senha.',
            repetir: repetir === nova ? undefined : 'As senhas não são iguais. Digite de novo.'
        }
        setErros(novos)
        if (novos.atual || novos.nova || novos.repetir) return

        setEnviando(true)
        try {
            await aoSalvar(atual, nova)
        } catch (erro) {
            if (erro instanceof ApiErro && erro.status === 401) {
                setErros({ atual: erro.message })
            } else if (erro instanceof ApiErro && erro.errors.length) {
                setErros({ atual: erro.doCampo('senhaAtual'), nova: erro.doCampo('novaSenha') })
            } else {
                setErroGeral(mensagemDeErro(erro))
            }
        } finally {
            setEnviando(false)
        }
    }

    const comum = { mono: true, senha: true, autoCapitalize: 'none' as const, autoCorrect: false }

    return (
        <>
            {erroGeral ? <Aviso tipo="perigo" titulo="Não foi possível salvar">{erroGeral}</Aviso> : null}
            <Campo
                {...comum}
                rotulo="Senha atual"
                value={atual}
                onChangeText={setAtual}
                erro={erros.atual}
                dica={dicaAtual}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="next"
                onSubmitEditing={() => novaRef.current?.focus()}
            />
            <Campo
                {...comum}
                ref={novaRef}
                rotulo="Nova senha"
                value={nova}
                onChangeText={setNova}
                erro={erros.nova}
                dica="Use pelo menos 6 letras ou números."
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => repetirRef.current?.focus()}
            />
            <Campo
                {...comum}
                ref={repetirRef}
                rotulo="Repita a nova senha"
                value={repetir}
                onChangeText={setRepetir}
                erro={erros.repetir}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={enviar}
            />
            <Botao titulo={tituloBotao} grande carregando={enviando} onPress={enviar} style={{ marginTop: 6 }} />
        </>
    )
}
