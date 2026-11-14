import { View } from 'react-native'

import { Botao } from '@/componentes/Botao'
import { FormularioSenha } from '@/componentes/FormularioSenha'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useSessao } from '@/sessao/SessaoProvider'
import { useTheme } from '@/tema/ThemeProvider'

// "Crie sua senha": a única tela possível enquanto a senha for provisória (handoff, seção 3).
// A guarda do layout raiz não deixa abrir nenhuma outra. Design: paciente/crie-sua-senha.
export default function TrocarSenhaProvisoria() {
    const { trocarSenha, sair } = useSessao()
    const tema = useTheme()

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
            {/* Deu certo: a sessão passa a ter o token liberado e as guardas abrem o app. */}
            <FormularioSenha aoSalvar={trocarSenha} dicaAtual="É a senha que a recepção entregou." tituloBotao="Salvar e entrar" />
            <Botao titulo="Não sou eu: sair" variante="texto" onPress={sair} />
        </Tela>
    )
}
