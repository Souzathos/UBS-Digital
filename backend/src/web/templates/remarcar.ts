import { formatarData, formatarHora } from "../../notifications/mensagens";
import { PaginaAgendamento } from "../../services/LinkService";
import { botao, esc, pagina } from "./layout";

// RN-22 pelo link: lista simples de horários livres, agrupada por dia
export function paginaRemarcar(base: string, p: PaginaAgendamento, horarios: { slotId: number, inicio: Date, profissional: string }[], erro?: string | null) {
    const porDia = new Map<string, typeof horarios>()
    for(const h of horarios) {
        const dia = formatarData(h.inicio)
        porDia.set(dia, [...(porDia.get(dia) ?? []), h])
    }

    const lista = horarios.length === 0
        ? '<div class="caixa"><p>Não há horários livres para remarcar agora. Tente mais tarde ou procure a UBS.</p></div>'
        : [...porDia.entries()].map(([dia, itens]) => `<p class="dia"><strong>${esc(dia)}</strong></p>` +
            itens.map(h => botao(`${base}/remarcar`, `${formatarHora(h.inicio)}${p.profissional ? ` · ${h.profissional}` : ''}`, 'horario', { slotId: h.slotId })).join('')
        ).join('')

    return pagina({
        titulo: `Remarcar consulta - ${p.ubs.nome}`,
        ubs: p.ubs,
        conteudo: `${erro ? `<div class="caixa alerta" role="alert"><p>${esc(erro)}</p></div>` : ''}
<h1>Escolha o novo horário</h1>
<p>Toque no horário que prefere. A consulta é remarcada na hora e já fica confirmada.</p>
${lista}
<a class="botao voltar" href="${esc(base)}">Voltar</a>`
    })
}
