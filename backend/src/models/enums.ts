// Enums da seção 5 da spec. Os nomes em PG (enumName) são compartilhados entre tabelas.

export enum StatusAgendamento {
    PENDENTE = 'PENDENTE',
    CONFIRMADO = 'CONFIRMADO',
    CANCELADO_PACIENTE = 'CANCELADO_PACIENTE',
    CANCELADO_AUTO = 'CANCELADO_AUTO',
    REMARCADO = 'REMARCADO',
    COMPARECEU = 'COMPARECEU',
    FALTOU = 'FALTOU'
}

// Estados em que o agendamento ainda ocupa a vaga (restrição do slot, RN-31)
export const STATUS_AGENDAMENTO_ATIVOS = [StatusAgendamento.PENDENTE, StatusAgendamento.CONFIRMADO] as const

export enum OrigemAgendamento {
    RECEPCAO = 'RECEPCAO',
    APP = 'APP',
    REMARCACAO = 'REMARCACAO',
    ADIANTAMENTO = 'ADIANTAMENTO'
}

export enum OrigemSlot {
    RECEPCAO = 'RECEPCAO',
    APP = 'APP'
}

export enum StatusSlot {
    LIVRE = 'LIVRE',
    OCUPADO = 'OCUPADO',
    BLOQUEADO = 'BLOQUEADO'
}

export enum CategoriaAtendimento {
    CONSULTA = 'CONSULTA',
    EXAME = 'EXAME'
}

export enum EtapaNotificacao {
    D14 = 'D14',
    D7 = 'D7',
    D3 = 'D3',
    D0 = 'D0',
    PRE_AVISO = 'PRE_AVISO',
    OFERTA = 'OFERTA',
    CONFIRMACAO_AGENDAMENTO = 'CONFIRMACAO_AGENDAMENTO'
}

export enum Canal {
    PUSH = 'PUSH',
    WHATSAPP = 'WHATSAPP',
    SMS = 'SMS',
    EMAIL = 'EMAIL'
}

export enum StatusNotificacao {
    AGENDADA = 'AGENDADA',
    ENVIADA = 'ENVIADA',
    ENTREGUE = 'ENTREGUE',
    FALHOU = 'FALHOU',
    RESPONDIDA = 'RESPONDIDA',
    CANCELADA = 'CANCELADA'
}

export enum StatusOferta {
    PENDENTE = 'PENDENTE',
    ACEITA = 'ACEITA',
    RECUSADA = 'RECUSADA',
    EXPIRADA = 'EXPIRADA',
    CANCELADA = 'CANCELADA'
}

export enum TipoAutor {
    PACIENTE = 'PACIENTE',
    CONTATO = 'CONTATO',
    EQUIPE = 'EQUIPE',
    SISTEMA = 'SISTEMA'
}

export enum PerfilEquipe {
    RECEPCAO = 'RECEPCAO',
    ACS = 'ACS',
    GESTOR = 'GESTOR'
}

export enum StatusAlerta {
    ABERTO = 'ABERTO',
    EM_CONTATO = 'EM_CONTATO',
    RESOLVIDO = 'RESOLVIDO'
}
