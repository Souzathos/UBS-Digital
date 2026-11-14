// Tipos do contrato da API (backend/docs/SPEC.md, seção 14). Escritos à mão a partir do contrato:
// se o backend mudar uma resposta, este arquivo muda junto.

export type Categoria = 'CONSULTA' | 'PROCEDIMENTO'

export type StatusAgendamento =
    | 'PENDENTE'
    | 'CONFIRMADO'
    | 'CANCELADO_PACIENTE'
    | 'CANCELADO_AUTO'
    | 'REMARCADO'
    | 'COMPARECEU'
    | 'FALTOU'

export type OrigemAgendamento = 'RECEPCAO' | 'APP' | 'REMARCACAO' | 'ADIANTAMENTO'
export type Canal = 'PUSH' | 'WHATSAPP' | 'SMS' | 'EMAIL'
export type PerfilEquipe = 'RECEPCAO' | 'ACS' | 'GESTOR'
export type TipoAutor = 'PACIENTE' | 'CONTATO' | 'EQUIPE' | 'SISTEMA'

export type Referencia = { id: number; nome: string }

export type ConsentimentoCanais = Partial<Record<Canal, { aceito: boolean; em: string }>>

// O que o próprio paciente vê de si. RN-52: sem selo de vulnerável e sem pontuação. Como estes
// campos não existem no tipo, nenhuma tela do paciente consegue mostrá-los por engano.
export type PacienteProprio = {
    id: number
    ubsId: number
    nome: string
    cpf: string
    cns: string | null
    dataNascimento: string
    rua: Referencia | null
    numero: string | null
    // "Seu médico: Dra. Helena (pela sua rua)" (RN-06)
    medicoReferencia: Referencia | null
    telefone: string | null
    email: string | null
    possuiCelular: boolean
    consentimentoCanais: ConsentimentoCanais
    deveTrocarSenha: boolean
}

// O que a equipe vê do paciente: o mesmo mais selo e pontuação (RN-52, só no painel).
export type PacienteEquipe = PacienteProprio & {
    pontuacao: number
    vulneravel: boolean
    vulneravelEm: string | null
}

export type UsuarioEquipe = {
    id: number
    ubsId: number
    nome: string
    email: string
    perfil: PerfilEquipe
}

export type TipoAtendimento = {
    id: number
    nome: string
    categoria: Categoria
    duracaoMin: number
    antecedenciaMaximaDias: number
    permiteAgendamentoApp: boolean
    instrucoesPreparo: string | null
}

export type Profissional = { id: number; nome: string; funcao: string; categoria?: Categoria }

export type Rua = { id: number; nome: string; medicoReferencia: Referencia }

export type Slot = {
    id: number
    inicio: string
    fim: string
    profissional: Profissional
    tipoAtendimento: TipoAtendimento
    // Só para a equipe:
    origem?: 'RECEPCAO' | 'APP'
    status?: 'LIVRE' | 'OCUPADO' | 'BLOQUEADO'
}

// Quais botões mostrar. A API decide; o app só obedece (e a API valida de novo em cada ação).
export type AcoesAgendamento = { confirmar: boolean; cancelar: boolean; remarcar: boolean }

export type Agendamento = {
    id: number
    status: StatusAgendamento
    origem: OrigemAgendamento
    inicio: string
    fim: string
    remarcadoDeId: number | null
    confirmadoEm: string | null
    canceladoEm: string | null
    criadoEm: string
    tipoAtendimento: Pick<TipoAtendimento, 'id' | 'nome' | 'categoria' | 'instrucoesPreparo'>
    profissional: Profissional
    ubs: { nome: string; endereco: string; telefone: string }
    acoes: AcoesAgendamento
}

// O agendamento visto pela equipe: o do paciente mais dados de gestão e o paciente (com selo).
export type AgendamentoEquipe = Agendamento & {
    slotId: number
    criadoPorTipo: TipoAutor
    canceladoPorTipo: TipoAutor | null
    presencaRegistradaEm: string | null
    paciente: { id: number; nome: string; cpf: string; telefone: string | null; vulneravel: boolean }
}

// --- Respostas de autenticação ---

export type RespostaEntrarPaciente = { token: string; deveTrocarSenha: boolean; paciente: PacienteProprio }
export type RespostaEntrarEquipe = { token: string; usuario: UsuarioEquipe }
export type RespostaEu = { tipo: 'EQUIPE'; usuario: UsuarioEquipe } | { tipo: 'PACIENTE'; paciente: PacienteProprio }

// --- Erros ---

// Corpo de todo erro da API. `errors` só vem em erro de validação (400).
export type CorpoErro = { message: string; errors?: { campo: string; mensagem: string }[] }
