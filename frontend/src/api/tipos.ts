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
