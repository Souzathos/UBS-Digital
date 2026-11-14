// Página do link: HTML puro, sem JavaScript, fonte grande e alto contraste, para celulares simples (seção 6)

export function esc(texto: unknown) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

const ESTILO = `
*{box-sizing:border-box}
body{margin:0;background:#fff;color:#111;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;font-size:20px;line-height:1.5}
main{max-width:560px;margin:0 auto;padding:16px}
header{border-bottom:3px solid #0b4f2a;padding-bottom:8px;margin-bottom:16px}
.ubs{font-size:24px;font-weight:700;color:#0b4f2a;margin:0}
.sub{margin:0;color:#333;font-size:17px}
h1{font-size:26px;margin:16px 0 8px}
.quando{font-size:28px;font-weight:700;margin:8px 0}
.caixa{border:2px solid #111;border-radius:8px;padding:12px 16px;margin:16px 0}
.ok{border-color:#0b4f2a;background:#e7f5ec}
.alerta{border-color:#8a1c1c;background:#fdecec}
.preparo{border-color:#7a5200;background:#fff6e0}
form{margin:12px 0}
button,.botao{display:block;width:100%;min-height:56px;font-size:22px;font-weight:700;border:3px solid #111;border-radius:8px;padding:12px;cursor:pointer;text-align:center;text-decoration:none}
.confirmar{background:#0b4f2a;color:#fff;border-color:#0b4f2a}
.cancelar{background:#fff;color:#8a1c1c;border-color:#8a1c1c}
.remarcar,.voltar{background:#fff;color:#111}
.dia{font-size:20px;margin:20px 0 4px}
.horario{min-height:48px;font-size:20px;background:#fff;color:#111}
footer{margin-top:24px;font-size:16px;color:#333}
`

export function pagina(opcoes: { titulo: string, ubs?: { nome: string, endereco: string, telefone: string } | null, conteudo: string }) {
    const { titulo, ubs, conteudo } = opcoes
    // RN-73: o nome da UBS é a primeira coisa da página, para o paciente reconhecer de onde vem
    const cabecalho = ubs
        ? `<header><p class="ubs">${esc(ubs.nome)}</p><p class="sub">${esc(ubs.endereco)} · ${esc(ubs.telefone)}</p></header>`
        : ''
    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(titulo)}</title>
<style>${ESTILO}</style>
</head>
<body>
<main>
${cabecalho}
${conteudo}
</main>
</body>
</html>`
}

export function botao(acao: string, texto: string, classe: string, campos: Record<string, string | number> = {}) {
    const ocultos = Object.entries(campos).map(([nome, valor]) => `<input type="hidden" name="${esc(nome)}" value="${esc(valor)}">`).join('')
    return `<form method="post" action="${esc(acao)}">${ocultos}<button type="submit" class="${classe}">${esc(texto)}</button></form>`
}
