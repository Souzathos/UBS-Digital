import { requisitar } from '@/api/cliente'
import type { AgendamentoEquipe, Categoria, PacienteEquipe } from '@/api/tipos'

// Painel da UBS (SPEC, seção 14, "Painel da UBS"). Recepção e gestor fazem tudo; o ACS vê a
// agenda e os pacientes, e a API responde 403 se ele tentar cadastrar ou agendar.
export interface AgendaEquipeServico {
    agenda(data: string, categoria?: Categoria): Promise<AgendamentoEquipe[]>
    presenca(id: number, resultado: 'COMPARECEU' | 'FALTOU'): Promise<AgendamentoEquipe>
    confirmar(id: number): Promise<AgendamentoEquipe>
    cancelar(id: number): Promise<AgendamentoEquipe>
    remarcar(id: number, slotId: number): Promise<AgendamentoEquipe>
    agendar(pacienteId: number, slotId: number): Promise<AgendamentoEquipe>
}

export const agendaEquipeApi: AgendaEquipeServico = {
    agenda: (data, categoria) => requisitar('GET', '/equipe/agenda', { query: { data, categoria } }),
    presenca: (id, resultado) => requisitar('POST', `/equipe/agendamentos/${id}/presenca`, { corpo: { resultado } }),
    confirmar: id => requisitar('POST', `/equipe/agendamentos/${id}/confirmar`),
    cancelar: id => requisitar('POST', `/equipe/agendamentos/${id}/cancelar`),
    remarcar: (id, slotId) => requisitar('POST', `/equipe/agendamentos/${id}/remarcar`, { corpo: { slotId } }),
    agendar: (pacienteId, slotId) => requisitar('POST', '/equipe/agendamentos', { corpo: { pacienteId, slotId } })
}

export type NovoPaciente = {
    nome: string
    cpf: string
    dataNascimento: string
    ruaId: number
    numero: string
    cns?: string
    telefone?: string
    email?: string
    possuiCelular: boolean
    consentimentoCanais: string[]
}

export interface PacientesServico {
    buscar(q: string): Promise<PacienteEquipe[]>
    obter(id: number): Promise<PacienteEquipe>
    // A senha provisória só aparece nesta resposta.
    cadastrar(dados: NovoPaciente): Promise<{ paciente: PacienteEquipe; senhaProvisoria: string }>
    atualizarEndereco(id: number, ruaId: number, numero: string): Promise<PacienteEquipe>
    redefinirSenha(id: number): Promise<{ paciente: PacienteEquipe; senhaProvisoria: string }>
}

export const pacientesApi: PacientesServico = {
    buscar: q => requisitar('GET', '/pacientes', { query: { q } }),
    obter: id => requisitar('GET', `/pacientes/${id}`),
    cadastrar: dados => requisitar('POST', '/pacientes', { corpo: dados }),
    atualizarEndereco: (id, ruaId, numero) => requisitar('PATCH', `/pacientes/${id}/endereco`, { corpo: { ruaId, numero } }),
    redefinirSenha: id => requisitar('POST', `/pacientes/${id}/redefinir-senha`)
}
