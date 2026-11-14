import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Campo } from '@/componentes/Campo'
import { Carregando, ErroTela, Vazio } from '@/componentes/Estados'
import { EtiquetaCategoria, EtiquetaStatus } from '@/componentes/Etiqueta'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { ThemeProvider, type Variante } from '@/tema/ThemeProvider'
import { dataPorExtenso, formatarDataHora } from '@/utils/datas'
import { mascararCpf } from '@/utils/cpf'

// Vitrine de desenvolvimento: todos os componentes base nas duas paletas, para conferir o tema,
// o tamanho da letra e o alto contraste sem depender da API.
const EXEMPLO_ISO = '2026-12-10T12:00:00.000Z' // quinta, 10/12, 9h em São Paulo

export default function Vitrine() {
    // ?variante=equipe abre direto na paleta escura (útil para conferir no navegador).
    const parametros = useLocalSearchParams<{ variante?: string }>()
    const [variante, setVariante] = useState<Variante>(parametros.variante === 'equipe' ? 'equipe' : 'paciente')
    return (
        <ThemeProvider variante={variante}>
            <Conteudo variante={variante} trocar={() => setVariante(v => (v === 'paciente' ? 'equipe' : 'paciente'))} />
        </ThemeProvider>
    )
}

function Conteudo({ variante, trocar }: { variante: Variante; trocar: () => void }) {
    const [cpf, setCpf] = useState('')
    const publico = variante === 'paciente' ? 'paciente' : 'equipe'

    return (
        <Tela titulo="Vitrine" exemplo leitura={`Consulta. Consulta clínica geral. ${dataPorExtenso(EXEMPLO_ISO)}. Falta confirmar.`}>
            <Botao titulo={variante === 'paciente' ? 'Ver paleta da equipe' : 'Ver paleta do paciente'} variante="contorno" onPress={trocar} />

            <Texto variante="secao" cor="textoSuave" titulo>
                Etiquetas
            </Texto>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <EtiquetaCategoria categoria="CONSULTA" grande />
                <EtiquetaCategoria categoria="PROCEDIMENTO" grande />
                <EtiquetaStatus status="PENDENTE" publico={publico} grande />
                <EtiquetaStatus status="CONFIRMADO" publico={publico} />
                <EtiquetaStatus status="REMARCADO" publico={publico} />
                <EtiquetaStatus status="CANCELADO_PACIENTE" publico={publico} />
                <EtiquetaStatus status="COMPARECEU" publico={publico} />
                <EtiquetaStatus status="FALTOU" publico={publico} />
            </View>

            <Texto variante="secao" cor="textoSuave" titulo>
                Textos
            </Texto>
            <Texto variante="subtitulo">Consulta clínica geral</Texto>
            <Texto variante="dataGrande" numeros>
                {formatarDataHora(EXEMPLO_ISO)}
            </Texto>
            <Texto cor="textoSuave">Dra. Helena · UBS Feitoria</Texto>

            <Texto variante="secao" cor="textoSuave" titulo>
                Botões
            </Texto>
            <Botao titulo="Confirmar presença" variante="sucesso" grande icone="visto" onPress={() => {}} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <Botao titulo="Remarcar" variante="contorno" onPress={() => {}} style={{ flex: 1 }} />
                <Botao titulo="Cancelar" variante="perigo" onPress={() => {}} style={{ flex: 1 }} />
            </View>
            <Botao titulo="Entrar" grande onPress={() => {}} />
            <Botao titulo="Salvando" carregando onPress={() => {}} />
            <Botao titulo="Esqueci minha senha" variante="texto" onPress={() => {}} />

            <Texto variante="secao" cor="textoSuave" titulo>
                Campos
            </Texto>
            <Campo rotulo="CPF" mono keyboardType="number-pad" placeholder="000.000.000-00" value={cpf} onChangeText={t => setCpf(mascararCpf(t))} />
            <Campo rotulo="Senha" mono senha erro="CPF ou senha inválidos" />

            <Texto variante="secao" cor="textoSuave" titulo>
                Avisos e estados
            </Texto>
            <Aviso tipo="info" titulo="Seu médico: Dra. Helena (pela sua rua)">
                Rua das Flores. Mudou de endereço? Avise a recepção.
            </Aviso>
            <Aviso tipo="aviso" titulo="Tem certeza?">
                A vaga será oferecida a outra pessoa.
            </Aviso>
            <Carregando />
            <Vazio texto="Nenhum atendimento marcado." />
            <ErroTela mensagem="Não foi possível falar com a UBS. Confira a internet." tentarDeNovo={() => {}} />
        </Tela>
    )
}
