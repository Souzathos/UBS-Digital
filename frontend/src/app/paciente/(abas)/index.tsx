import { Aviso } from '@/componentes/Aviso'
import { Vazio } from '@/componentes/Estados'
import { Tela } from '@/componentes/Tela'
import { Texto } from '@/componentes/Texto'
import { usePacienteLogado } from '@/sessao/SessaoProvider'

// Meus atendimentos. Parte 1: só a estrutura e o médico de referência (vem da sessão).
// A lista de próximos e histórico (GET /agendamentos/meus) entra na Parte 2.
export default function MeusAtendimentos() {
    const paciente = usePacienteLogado()
    const primeiroNome = paciente.nome.split(' ')[0]

    return (
        <Tela titulo="Meus atendimentos" leitura={`Olá, ${primeiroNome}.`}>
            <Texto variante="subtitulo">Olá, {primeiroNome}.</Texto>
            {paciente.medicoReferencia ? (
                // RN-06: a consulta é sempre com o médico de referência da rua.
                <Aviso tipo="info" titulo={`Seu médico: ${paciente.medicoReferencia.nome} (pela sua rua)`}>
                    {`${paciente.rua?.nome ?? ''}. Mudou de endereço? Avise a recepção.`}
                </Aviso>
            ) : (
                <Aviso tipo="aviso" titulo="Sem endereço cadastrado">
                    Para marcar consulta com o médico, a recepção precisa cadastrar a sua rua.
                </Aviso>
            )}
            <Vazio texto="A lista dos seus atendimentos chega na próxima parte do app." />
        </Tela>
    )
}
