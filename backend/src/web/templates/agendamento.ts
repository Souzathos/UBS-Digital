import { StatusAgendamento } from "../../models/enums";
import { formatarData, formatarHora } from "../../notifications/mensagens";
import { PaginaAgendamento } from "../../services/LinkService";
import { botao, esc, pagina } from "./layout";

export type Aviso = 'confirmado' | 'cancelado' | 'remarcado'

const AVISOS: Record<Aviso, string> = {
    confirmado: 'Pronto! Sua presença está confirmada.',
    cancelado: 'Pronto! Sua consulta foi cancelada. A vaga vai para outra pessoa.',
    remarcado: 'Pronto! Sua consulta foi remarcada.'
}

const quando = (data: Date) => `${formatarData(data)} às ${formatarHora(data)}`

// RN-71: a página mostra o estado atual; botões só quando a ação ainda é possível
function situacao(p: PaginaAgendamento) {
    switch(p.status) {
        case StatusAgendamento.PENDENTE: return '<div class="caixa"><p>Você vai a esta consulta? Confirme ou avise se não puder ir.</p></div>'
        case StatusAgendamento.CONFIRMADO: return '<div class="caixa ok"><p><strong>Presença confirmada.</strong> Se não puder ir, cancele ou remarque.</p></div>'
        case StatusAgendamento.REMARCADO: return `<div class="caixa ok"><p><strong>Esta consulta foi remarcada${p.remarcadoPara ? ` para ${esc(quando(p.remarcadoPara))}` : ''}.</strong></p></div>`
        case StatusAgendamento.CANCELADO_PACIENTE:
        case StatusAgendamento.CANCELADO_AUTO: return '<div class="caixa alerta"><p><strong>Esta consulta já foi cancelada.</strong></p></div>'
        default: return '<div class="caixa"><p>Esta consulta já aconteceu.</p></div>'
    }
}

export function paginaAgendamento(base: string, p: PaginaAgendamento, opcoes: { aviso?: Aviso | null, erro?: string | null } = {}) {
    const detalhes = p.tipoAtendimento
        ? `<p>${esc(p.tipoAtendimento.nome)}${p.profissional ? ` com ${esc(p.profissional)}` : ''}</p>`
        : ''
    const preparo = p.tipoAtendimento?.instrucoesPreparo
        ? `<div class="caixa preparo"><p><strong>Preparo:</strong> ${esc(p.tipoAtendimento.instrucoesPreparo)}</p></div>`
        : ''
    const botoes = [
        p.acoes.confirmar ? botao(`${base}/confirmar`, 'Confirmar presença', 'confirmar') : '',
        p.acoes.remarcar ? `<form method="get" action="${esc(base)}/remarcar"><button type="submit" class="remarcar">Remarcar</button></form>` : '',
        p.acoes.cancelar ? `<form method="get" action="${esc(base)}/cancelar"><button type="submit" class="cancelar">Não vou, cancelar</button></form>` : ''
    ].join('')

    return pagina({
        titulo: `Consulta - ${p.ubs.nome}`,
        ubs: p.ubs,
        conteudo: `${opcoes.aviso ? `<div class="caixa ok" role="status"><p>${esc(AVISOS[opcoes.aviso])}</p></div>` : ''}
${opcoes.erro ? `<div class="caixa alerta" role="alert"><p>${esc(opcoes.erro)}</p></div>` : ''}
<h1>Sua consulta</h1>
<p class="quando">${esc(quando(p.inicio))}</p>
${detalhes}
${preparo}
${situacao(p)}
${botoes}
<footer>Dúvidas? Ligue para a UBS: ${esc(p.ubs.telefone)}</footer>`
    })
}

// Passo de confirmação antes de cancelar: um toque errado não pode cancelar a consulta
export function paginaConfirmarCancelamento(base: string, p: PaginaAgendamento) {
    return pagina({
        titulo: `Cancelar consulta - ${p.ubs.nome}`,
        ubs: p.ubs,
        conteudo: `<h1>Cancelar a consulta?</h1>
<p class="quando">${esc(quando(p.inicio))}</p>
<div class="caixa alerta"><p>Se cancelar, a vaga vai para outra pessoa.</p></div>
${botao(`${base}/cancelar`, 'Sim, cancelar', 'cancelar')}
<a class="botao voltar" href="${esc(base)}">Voltar</a>`
    })
}
