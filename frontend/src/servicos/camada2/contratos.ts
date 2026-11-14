import type { Agendamento, Canal, Categoria, Referencia } from '@/api/tipos'

// Contratos PROVISÓRIOS da Camada 2. O backend ainda não tem estas rotas: as telas usam as
// implementações falsas (./falsos) atrás destas interfaces. Quando cada rota sair, uma
// implementação real entra em servicos/index.ts no lugar da falsa e as telas não mudam.
// Estes tipos são também a proposta de contrato para o backend (ver SPEC, seção 6).

// --- Avisos de um agendamento (RN-10 a RN-13, RN-25, RN-26) ---
// JÁ EXISTE no backend desde 14/11: GET /agendamentos/:id/avisos e GET /equipe/agendamentos/:id/avisos
// (implementação real em servicos/avisos.ts). `prazoResposta` vem null até a RN-26 existir.

export type EtapaAviso = 'D14' | 'D7' | 'D3' | 'D0'

export type AvisoConsulta = {
    etapa: EtapaAviso
    // Quando sai (ou saiu).
    data: string
    // agendado: ainda vai sair · enviado: saiu e espera resposta · respondido: a pessoa respondeu
    // · lembrete: saiu só para lembrar (RN-12) · semResposta: saiu e ninguém respondeu.
    estado: 'agendado' | 'enviado' | 'respondido' | 'lembrete' | 'semResposta'
    canais: Canal[]
}

export type AvisosDaConsulta = {
    avisos: AvisoConsulta[]
    // RN-26: prazo para responder antes do cancelamento automático (null se já confirmado).
    prazoResposta: string | null
    // RN-26: quando o agendamento foi cancelado por falta de resposta.
    canceladoAutomaticamenteEm: string | null
}

export interface AvisosServico {
    // A implementação real só usa o id; a falsa precisa das datas para montar o exemplo.
    listar(agendamento: Pick<Agendamento, 'id' | 'inicio' | 'status' | 'criadoEm' | 'confirmadoEm'>, publico?: 'paciente' | 'equipe'): Promise<AvisosDaConsulta>
}

// --- Ofertas de vaga mais cedo para o paciente (RN-30 a RN-35) ---
// Rotas propostas: GET /ofertas/minhas · POST /ofertas/:id/aceitar · POST /ofertas/:id/manter

export type OfertaPaciente = {
    id: number
    status: 'PENDENTE' | 'ACEITA' | 'RECUSADA' | 'EXPIRADA'
    vaga: { inicio: string; tipoAtendimento: { nome: string; categoria: Categoria }; profissional: Referencia; ubs: string }
    agendamentoAtual: { id: number; inicio: string }
    expiraEm: string
    // RN-32: menos de 24h para a vaga = oferta simultânea para os 5 primeiros.
    simultanea: boolean
}

export interface OfertasServico {
    minhas(): Promise<OfertaPaciente[]>
    // RN-34: aceitar move o agendamento para a vaga (mesmo efeito da remarcação).
    aceitar(id: number): Promise<OfertaPaciente>
    // RN-35: recusar não tem penalidade.
    manter(id: number): Promise<OfertaPaciente>
}

// --- Compromisso e suplentes (RN-36, RN-40) ---
// Rotas propostas: GET /pacientes/eu/compromisso · GET/POST/DELETE /suplentes

// Nunca traz a pontuação em número (seção 6): só se a pessoa recebe ofertas ou não.
export type Compromisso = { recebeOfertas: boolean }

export type Suplencia = { tipoAtendimento: { id: number; nome: string; categoria: Categoria }; ativo: boolean }

export interface CompromissoServico {
    situacao(): Promise<Compromisso>
    suplencias(): Promise<Suplencia[]>
    entrarNaLista(tipoAtendimentoId: number): Promise<Suplencia>
    sairDaLista(tipoAtendimentoId: number): Promise<Suplencia>
}

// --- Painel: ofertas em andamento (RN-30 a RN-34) ---
// Rota proposta: GET /equipe/ofertas

export type CandidatoOferta = {
    ordem: number | null
    nome: string
    nota: string
    estado: 'aguardando' | 'proximo' | 'depois' | 'recusou' | 'expirou' | 'abaixoDoLimite'
    prazo?: string
}

export type VagaEmOferta = {
    id: number
    vaga: { inicio: string; tipoAtendimento: { nome: string; categoria: Categoria }; profissional: Referencia }
    liberadaPor: string
    liberadaEm: string
    simultanea: boolean
    prazo: string
    fila: CandidatoOferta[]
}

export interface OfertasEquipeServico {
    emAndamento(): Promise<VagaEmOferta[]>
    // Indicador da agenda: vagas liberadas e ocupadas por adiantamento no dia.
    reaproveitadas(data: string): Promise<number>
}

// --- Painel: alertas de vulneráveis (RN-27) ---
// Rotas propostas: GET /equipe/alertas · POST /equipe/alertas/:id/atribuir · POST /equipe/alertas/:id/resolver

export type StatusAlerta = 'ABERTO' | 'EM_CONTATO' | 'RESOLVIDO'

export type Alerta = {
    id: number
    paciente: { id: number; nome: string; idade: number }
    consulta: string
    motivo: string
    status: StatusAlerta
    responsavel: string | null
    atualizadoEm: string
}

export interface AlertasServico {
    listar(): Promise<Alerta[]>
    atribuirAoAcs(id: number): Promise<Alerta>
    resolver(id: number): Promise<Alerta>
}

// --- Painel: contato vinculado e selo (RN-50, RN-55, RN-57, RN-80) ---
// Rotas propostas: GET/POST /pacientes/:id/contatos · PATCH /pacientes/:id/selo

export type ContatoVinculado = {
    id: number
    nome: string
    relacao: string
    telefone: string | null
    canais: Canal[]
    consentimentoEm: string | null
    consentimentoForma: string | null
    recebeNotificacoes: boolean
}

export type Selo = { vulneravel: boolean; atribuidoPor: string | null; em: string | null }

export interface FichaCamada2Servico {
    contatos(pacienteId: number): Promise<ContatoVinculado[]>
    alternarCanalContato(contatoId: number, canal: Canal): Promise<ContatoVinculado>
    alternarConsentimento(contatoId: number): Promise<ContatoVinculado>
    // RN-50: só a equipe atribui ou remove; registra quem e quando.
    selo(pacienteId: number, atual: boolean): Promise<Selo>
    definirSelo(pacienteId: number, vulneravel: boolean, quem: string): Promise<Selo>
}
