import { router } from 'expo-router'
import { useState } from 'react'

import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { FormularioSenha } from '@/componentes/FormularioSenha'
import { Tela } from '@/componentes/Tela'
import { useSessao } from '@/sessao/SessaoProvider'

// Trocar senha pelo Perfil (mesma rota da API da senha provisória).
export default function TrocarSenha() {
    const { trocarSenha } = useSessao()
    const [feito, setFeito] = useState(false)

    if (feito) {
        return (
            <Tela cabecalho="voltar" titulo="Senha trocada">
                <Aviso tipo="sucesso" titulo="Pronto">Na próxima vez, entre com a senha nova.</Aviso>
                <Botao titulo="Voltar ao perfil" onPress={() => router.back()} />
            </Tela>
        )
    }

    return (
        <Tela cabecalho="voltar" titulo="Trocar senha" leitura="Digite a senha atual e a nova senha duas vezes.">
            <FormularioSenha
                tituloBotao="Salvar nova senha"
                aoSalvar={async (atual, nova) => {
                    await trocarSenha(atual, nova)
                    setFeito(true)
                }}
            />
        </Tela>
    )
}
