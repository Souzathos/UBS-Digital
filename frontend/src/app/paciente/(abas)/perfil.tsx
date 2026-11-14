import { Botao } from '@/componentes/Botao'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useSessao, usePacienteLogado } from '@/sessao/SessaoProvider'
import { mascararCpf } from '@/utils/cpf'

// Perfil. Parte 1: quem está logado e Sair. Canais de aviso e seu médico entram na Parte 4.
export default function Perfil() {
    const paciente = usePacienteLogado()
    const { sair } = useSessao()

    return (
        <Tela titulo="Perfil" leitura={`${paciente.nome}.`}>
            <Texto variante="subtitulo">{paciente.nome}</Texto>
            <Texto cor="textoSuave" numeros>
                CPF {mascararCpf(paciente.cpf)}
            </Texto>
            <Botao titulo="Sair" variante="contorno" onPress={sair} style={{ marginTop: 12 }} />
        </Tela>
    )
}
