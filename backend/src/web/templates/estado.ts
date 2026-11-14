import { pagina } from "./layout";

// RN-70: token desconhecido ou vencido (o token expira no horário da consulta)
export function paginaLinkExpirado(expirado: boolean) {
    return pagina({
        titulo: 'Link expirado',
        conteudo: `<h1>${expirado ? 'Este link expirou' : 'Link inválido ou expirado'}</h1>
<div class="caixa alerta"><p>Não é possível usar este link. Se precisar falar sobre a sua consulta, procure a sua UBS ou abra o aplicativo.</p></div>`
    })
}
