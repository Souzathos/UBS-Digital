import { View } from 'react-native'

import { mensagemDeErro } from '@/api/cliente'
import { Aviso } from '@/componentes/Aviso'
import { Botao } from '@/componentes/Botao'
import { Cartao } from '@/componentes/Cartao'
import { Carregando, ErroTela } from '@/componentes/Estados'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { useAlternarSuplencia, useCompromisso, useSuplencias } from '@/hooks/camada2'
import { rotuloCategoria } from '@/utils/rotulos'

const REGRAS = [
    'A vaga vai primeiro para quem tem consulta mais perto da data. Depois, para os suplentes.',
    'Cada pessoa tem um prazo para responder. Sem resposta, a vaga passa para a próxima, sem penalidade.',
    'Cancelar ou remarcar não prejudica você.',
    'Só deixa de receber ofertas quem confirma e não comparece.',
    'Sua consulta marcada nunca é afetada.'
]

// Ofertas de vaga mais cedo e lista de suplentes (RN-30 a RN-36, RN-40). A pontuação NUNCA
// aparece em número para o paciente (seção 6): só o aviso de que ele está sem ofertas.
// Camada 2: dados de exemplo. Design: paciente/ofertas-e-suplentes-pontuacao-sem-numero.
export default function Ofertas() {
    const compromisso = useCompromisso()
    const suplencias = useSuplencias()
    const alternar = useAlternarSuplencia()
    const recebe = compromisso.data?.recebeOfertas ?? true

    return (
        <Tela cabecalho="voltar" exemplo titulo="Ofertas de vaga mais cedo" leitura={`Quando alguém cancela, a vaga é oferecida a quem tem consulta marcada depois. ${REGRAS.join(' ')}`}>
            <Texto cor="textoSuave" style={{ marginTop: -6 }}>
                Quando alguém cancela, a vaga é oferecida a quem tem consulta marcada depois.
            </Texto>

            {compromisso.isPending ? (
                <Carregando />
            ) : recebe ? (
                <Aviso tipo="sucesso" titulo="Você recebe ofertas">
                    Avisamos quando abrir uma vaga antes da sua consulta. Você aceita ou mantém seu horário.
                </Aviso>
            ) : (
                <Aviso tipo="aviso" titulo="Sem ofertas por enquanto">
                    Comparecendo às próximas consultas você volta a receber ofertas de adiantamento. Sua consulta marcada continua garantida.
                </Aviso>
            )}

            <Texto variante="subtitulo" titulo>
                Como funciona
            </Texto>
            <Cartao>
                {REGRAS.map(r => (
                    <Texto key={r}>• {r}</Texto>
                ))}
            </Cartao>

            <Texto variante="subtitulo" titulo>
                Lista de suplentes
            </Texto>
            <Texto cor="textoSuave">Avisamos se abrir vaga, mesmo sem consulta marcada.</Texto>
            {suplencias.isPending ? (
                <Carregando />
            ) : suplencias.isError ? (
                <ErroTela mensagem={mensagemDeErro(suplencias.error)} tentarDeNovo={() => suplencias.refetch()} />
            ) : (
                (suplencias.data ?? []).map(s => (
                    <Cartao key={s.tipoAtendimento.id}>
                        <Texto variante="corpoForte">
                            {rotuloCategoria(s.tipoAtendimento.categoria)} · {s.tipoAtendimento.nome}
                        </Texto>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <Texto cor="textoSuave" style={{ flex: 1 }}>
                                {!recebe ? 'Volta quando você comparecer às próximas consultas' : s.ativo ? 'Você está na lista' : 'Você não está na lista'}
                            </Texto>
                            <Botao
                                titulo={s.ativo ? 'Sair' : 'Entrar'}
                                variante={s.ativo ? 'contorno' : 'primario'}
                                desabilitado={!recebe}
                                carregando={alternar.isPending && alternar.variables?.id === s.tipoAtendimento.id}
                                onPress={() => alternar.mutate({ id: s.tipoAtendimento.id, entrar: !s.ativo })}
                            />
                        </View>
                    </Cartao>
                ))
            )}
        </Tela>
    )
}
