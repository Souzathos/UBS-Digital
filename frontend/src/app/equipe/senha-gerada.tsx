import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Cartao } from '@/componentes/Cartao'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { lerSenhaGerada } from '@/hooks/senhaGerada'
import { useTheme } from '@/tema/ThemeProvider'
import { mascararCpf } from '@/utils/cpf'

// Senha provisória gerada (cadastro ou redefinição). Ela só aparece aqui, uma vez: se a tela for
// recarregada, a senha não volta (para outra, use "Redefinir senha" na ficha).
// Design: equipe/senha-provisoria-gerada.
export default function SenhaGerada() {
    const tema = useTheme()
    // Lê uma vez ao montar e apaga da memória.
    const [dados] = useState(lerSenhaGerada)

    if (!dados) {
        return (
            <Tela cabecalho="voltar" titulo="Senha provisória">
                <Aviso tipo="aviso" titulo="A senha não pode ser mostrada de novo">
                    Por segurança, ela aparece uma vez só. Para uma nova, use “Redefinir senha” na ficha do paciente.
                </Aviso>
                <Botao titulo="Ir para pacientes" onPress={() => router.navigate('/equipe/pacientes')} />
            </Tela>
        )
    }

    const digitos = dados.senha.split('').join(' ')

    return (
        <Tela cabecalho="simples" titulo={dados.novo ? 'Paciente cadastrado' : 'Senha redefinida'} leitura={`Senha provisória de ${dados.nome}: ${digitos}.`}>
            <Cartao>
                <Texto variante="subtitulo">{dados.nome}</Texto>
                <Texto cor="textoSuave" numeros>
                    CPF {mascararCpf(dados.cpf)}
                </Texto>
                <Texto cor="textoSuave">{dados.endereco}</Texto>
                <Texto cor="textoSuave">{dados.medico ? `Médico de referência: ${dados.medico}` : 'Sem médico de referência'}</Texto>
            </Cartao>
            <View style={{ gap: 6, padding: 16, borderRadius: tema.raio.lg, borderWidth: 2, borderColor: tema.cores.aviso, alignItems: 'center' }} accessible accessibilityLabel={`Senha provisória: ${digitos}`}>
                <Texto variante="secao" cor="textoSuave">
                    Senha provisória
                </Texto>
                <Texto variante="mono" peso="700" selectable style={{ fontSize: tema.fonte(40), lineHeight: tema.fonte(46), letterSpacing: 6 }}>
                    {dados.senha}
                </Texto>
            </View>
            <Texto variante="corpoForte">Entregue esta senha ao paciente. Ela aparece só agora.</Texto>
            <Texto cor="textoSuave">No primeiro acesso, o app pede para ele criar uma senha dele.</Texto>
            <Botao titulo="Pronto" grande onPress={() => router.replace({ pathname: '/equipe/paciente/[id]', params: { id: String(dados.pacienteId) } })} />
        </Tela>
    )
}
