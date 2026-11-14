import { Botao } from '@/componentes/Botao'
import { Vazio } from '@/componentes/Estados'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useEquipeLogada, useSessao } from '@/sessao/SessaoProvider'
import { rotuloPerfil } from '@/utils/rotulos'

// Agenda de hoje. Parte 1: quem está logado e Sair. A agenda (GET /equipe/agenda) entra na Parte 5.
export default function Agenda() {
    const usuario = useEquipeLogada()
    const { sair } = useSessao()

    return (
        <Tela titulo="Agenda de hoje" leitura={`${usuario.nome}, ${rotuloPerfil(usuario.perfil)}.`}>
            <Texto variante="subtitulo">{usuario.nome}</Texto>
            <Texto cor="textoSuave">{rotuloPerfil(usuario.perfil)}</Texto>
            <Vazio texto="A agenda do dia chega na Parte 5 do app." />
            <Botao titulo="Sair" variante="contorno" onPress={sair} />
        </Tela>
    )
}
