import { View } from 'react-native'

import type { Canal, PacienteEquipe } from '@/api/tipos'
import { useAcoesFicha, useContatos, useSelo } from '@/hooks/camada2'
import { useEquipeLogada } from '@/sessao/SessaoProvider'
import { formatarTelefone } from '@/utils/cpf'
import { formatarDataHora, formatarDiaMes } from '@/utils/datas'
import { rotuloPerfil } from '@/utils/rotulos'
import { Cartao } from './Cartao'
import { Carregando, EtiquetaExemplo } from './Estados'
import { Filtro } from './Filtro'
import { Interruptor } from './Interruptor'
import { Texto } from './Texto'

const CANAIS_CONTATO: { canal: Canal; nome: string }[] = [
    { canal: 'WHATSAPP', nome: 'WhatsApp' },
    { canal: 'SMS', nome: 'SMS' }
]

// Contato vinculado (RN-55 a RN-58, RN-80) e selo de vulnerável (RN-50 a RN-52) na ficha do
// paciente. Camada 2: dados de exemplo (as mudanças ficam só na memória do app).
// Design: equipe/contato-consentimento-e-selo.
export function FichaCamada2({ paciente, podeAgir }: { paciente: PacienteEquipe; podeAgir: boolean }) {
    const usuario = useEquipeLogada()
    const contatos = useContatos(paciente.id)
    const selo = useSelo(paciente.id, paciente.vulneravel)
    const { alternarCanal, alternarConsentimento, definirSelo } = useAcoesFicha(paciente.id)
    const primeiroNome = paciente.nome.split(' ')[0]

    return (
        <View style={{ gap: 14 }}>
            <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Texto variante="subtitulo" titulo>
                        Pessoa de contato
                    </Texto>
                    <EtiquetaExemplo />
                </View>
                {contatos.isPending ? (
                    <Carregando />
                ) : (
                    (contatos.data ?? []).map(c => (
                        <Cartao key={c.id}>
                            <Texto variante="corpoForte">
                                {c.nome} · {c.relacao}
                            </Texto>
                            {c.telefone ? <Texto cor="textoSuave">{formatarTelefone(c.telefone)}</Texto> : null}
                            <Texto variante="rotulo" cor="textoSuave">
                                Canais que ela autorizou
                            </Texto>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                {CANAIS_CONTATO.map(k => (
                                    <Filtro key={k.canal} multiplo rotulo={k.nome} selecionado={c.canais.includes(k.canal)} onPress={() => podeAgir && alternarCanal.mutate({ contatoId: c.id, canal: k.canal })} />
                                ))}
                            </View>
                            <Interruptor
                                rotulo={`${primeiroNome} autorizou avisar ${c.nome.split(' ')[0]}`}
                                detalhe={c.recebeNotificacoes && c.consentimentoEm ? `Registrado em ${formatarDiaMes(c.consentimentoEm)} (${c.consentimentoForma})` : 'Sem autorização, nenhum aviso é enviado.'}
                                ligado={c.recebeNotificacoes}
                                desabilitado={!podeAgir}
                                salvando={alternarConsentimento.isPending}
                                alternar={() => alternarConsentimento.mutate(c.id)}
                            />
                            {/* RN-57: o contato recebe só nome, UBS, data e hora. */}
                            <Texto variante="legenda" cor="textoSuave">
                                Ela recebe só UBS, data e horário, nunca o tipo de atendimento.
                            </Texto>
                        </Cartao>
                    ))
                )}
            </View>

            <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Texto variante="subtitulo" titulo>
                        Selo de vulnerável
                    </Texto>
                    <EtiquetaExemplo />
                </View>
                <Cartao>
                    {selo.data ? (
                        <>
                            <Interruptor
                                rotulo="Selo de vulnerável"
                                detalhe={selo.data.vulneravel ? (selo.data.atribuidoPor && selo.data.em ? `Ativo · por ${selo.data.atribuidoPor} em ${formatarDataHora(selo.data.em)}` : 'Ativo') : 'Inativo'}
                                ligado={selo.data.vulneravel}
                                desabilitado={!podeAgir}
                                salvando={definirSelo.isPending}
                                alternar={() => definirSelo.mutate({ vulneravel: !selo.data!.vulneravel, quem: `${usuario.nome.split(' ')[0]} (${rotuloPerfil(usuario.perfil).toLowerCase()})` })}
                            />
                            <Texto cor="textoSuave">
                                {selo.data.vulneravel
                                    ? 'Não perde pontos e não tem cancelamento automático. Sem resposta, vira alerta para a recepção e o ACS. Só a equipe vê o selo.'
                                    : 'Sem o selo, vale a regra geral: sem resposta no prazo, a consulta é cancelada.'}
                            </Texto>
                        </>
                    ) : (
                        <Carregando />
                    )}
                </Cartao>
            </View>
        </View>
    )
}
