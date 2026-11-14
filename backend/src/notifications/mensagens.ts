import { EtapaNotificacao, StatusAgendamento } from "../models/enums";

export interface DadosLembrete {
    etapa: EtapaNotificacao
    status: StatusAgendamento
    ubsNome: string
    pacienteNome: string
    tipoNome: string
    profissionalNome: string
    inicio: Date
    instrucoesPreparo: string | null
    link: string
}

const ETAPAS_COM_ACAO = [EtapaNotificacao.D14, EtapaNotificacao.D7, EtapaNotificacao.D3]

export function formatarData(data: Date) {
    return data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
}

export function formatarHora(data: Date) {
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// RN-12: só pede resposta quando o agendamento ainda está PENDENTE e a etapa é D-14, D-7 ou D-3
export function exigeResposta(etapa: EtapaNotificacao, status: StatusAgendamento) {
    return status === StatusAgendamento.PENDENTE && ETAPAS_COM_ACAO.includes(etapa)
}

// Texto do lembrete. RN-73: começa pelo nome da UBS para não parecer golpe. RN-63: sempre leva o link.
// RN-13: instruções de preparo em todas as etapas.
export function textoLembrete(d: DadosLembrete) {
    const nome = d.pacienteNome.split(' ')[0]
    const quando = `${formatarData(d.inicio)} às ${formatarHora(d.inicio)}`
    let corpo: string

    if(d.etapa === EtapaNotificacao.D0) {
        corpo = `Hoje às ${formatarHora(d.inicio)} você tem ${d.tipoNome} com ${d.profissionalNome}. Não precisa responder. Se não puder ir, avise por aqui: ${d.link}`
    } else if(exigeResposta(d.etapa, d.status)) {
        corpo = `Lembrete: ${d.tipoNome} com ${d.profissionalNome} em ${quando}. Confirme, cancele ou remarque por aqui: ${d.link}`
    } else {
        corpo = `Sua ${d.tipoNome} com ${d.profissionalNome} está confirmada para ${quando}. Se não puder ir, cancele ou remarque por aqui: ${d.link}`
    }

    const preparo = d.instrucoesPreparo ? `\nPreparo: ${d.instrucoesPreparo}` : ''
    return `${d.ubsNome}: olá, ${nome}! ${corpo}${preparo}`
}

// Texto curto para push: a notificação já mostra o nome da UBS no título (RN-73) e tocar abre o app
// no atendimento, então o link não vai junto. RN-13: preparo também no push.
export function textoPush(d: DadosLembrete) {
    const quando = `${formatarData(d.inicio)} às ${formatarHora(d.inicio)}`
    let corpo: string
    if(d.etapa === EtapaNotificacao.D0) {
        corpo = `Hoje às ${formatarHora(d.inicio)} você tem ${d.tipoNome} com ${d.profissionalNome}.`
    } else if(exigeResposta(d.etapa, d.status)) {
        corpo = `Lembrete: ${d.tipoNome} com ${d.profissionalNome} em ${quando}. Toque para confirmar, cancelar ou remarcar.`
    } else {
        corpo = `Sua ${d.tipoNome} com ${d.profissionalNome} está confirmada para ${quando}.`
    }
    return d.instrucoesPreparo ? `${corpo} Preparo: ${d.instrucoesPreparo}` : corpo
}
