// Datas sempre exibidas no horário de São Paulo, venha a API de onde vier (ela manda ISO em UTC).
//
// O Brasil não tem horário de verão desde 2019, então São Paulo é UTC−3 o ano todo. Por isso a
// conversão é uma subtração fixa, sem depender do suporte a fusos do Intl no Hermes (que varia
// entre Android e iOS). Se o horário de verão voltar, só FUSO_MINUTOS precisa virar uma regra.

const FUSO_MINUTOS = -3 * 60

const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export type PartesData = {
    ano: number
    mes: number // 1 a 12
    dia: number
    hora: number
    minuto: number
    diaSemana: number // 0 = domingo
}

export function partesEmSaoPaulo(entrada: string | Date): PartesData {
    const instante = typeof entrada === 'string' ? new Date(entrada) : entrada
    const local = new Date(instante.getTime() + FUSO_MINUTOS * 60_000)
    return {
        ano: local.getUTCFullYear(),
        mes: local.getUTCMonth() + 1,
        dia: local.getUTCDate(),
        hora: local.getUTCHours(),
        minuto: local.getUTCMinutes(),
        diaSemana: local.getUTCDay()
    }
}

const doisDigitos = (n: number) => String(n).padStart(2, '0')

// "9h", "8h20"
export function formatarHora(entrada: string | Date): string {
    const p = partesEmSaoPaulo(entrada)
    return p.minuto === 0 ? `${p.hora}h` : `${p.hora}h${doisDigitos(p.minuto)}`
}

// "Qui"
export function formatarDiaSemana(entrada: string | Date): string {
    return DIAS_CURTOS[partesEmSaoPaulo(entrada).diaSemana]
}

// "10/12", "4/01" (como nas telas: dia sem zero, mês com dois dígitos)
export function formatarDiaMes(entrada: string | Date): string {
    const p = partesEmSaoPaulo(entrada)
    return `${p.dia}/${doisDigitos(p.mes)}`
}

// "Qui, 10/12 · 9h" — o formato padrão de data e hora do app (handoff, seção 3)
export function formatarDataHora(entrada: string | Date): string {
    return `${formatarDiaSemana(entrada)}, ${formatarDiaMes(entrada)} · ${formatarHora(entrada)}`
}

// "quinta-feira, 10 de dezembro, às 9 horas" — para leitores de tela e para "ouvir esta tela"
export function dataPorExtenso(entrada: string | Date): string {
    const p = partesEmSaoPaulo(entrada)
    return `${DIAS_LONGOS[p.diaSemana]}, ${p.dia} de ${MESES[p.mes - 1]}, às ${horaPorExtenso(p.hora, p.minuto)}`
}

function horaPorExtenso(hora: number, minuto: number): string {
    const horas = hora === 1 ? '1 hora' : `${hora} horas`
    if (minuto === 0) return horas
    return `${horas} e ${minuto === 1 ? '1 minuto' : `${minuto} minutos`}`
}

// "2026-11-14": o dia em São Paulo, no formato que a API aceita em ?data= e ?de=
export function diaISO(entrada: string | Date): string {
    const p = partesEmSaoPaulo(entrada)
    return `${p.ano}-${doisDigitos(p.mes)}-${doisDigitos(p.dia)}`
}

// "Ter, 15/12" — cabeçalho de um dia na grade de horários
export function formatarDia(entrada: string | Date): string {
    return `${formatarDiaSemana(entrada)}, ${formatarDiaMes(entrada)}`
}

// Diferença em dias de calendário (São Paulo) entre `agora` e a data. 0 = hoje, 1 = amanhã.
export function diasAte(entrada: string | Date, agora: Date): number {
    const alvo = new Date(`${diaISO(entrada)}T00:00:00Z`).getTime()
    const hoje = new Date(`${diaISO(agora)}T00:00:00Z`).getTime()
    return Math.round((alvo - hoje) / 86_400_000)
}

// "é hoje", "é amanhã", "é em 5 dias", "é em 2 semanas"
export function quandoRelativo(entrada: string | Date, agora: Date): string {
    const dias = diasAte(entrada, agora)
    if (dias === 0) return 'é hoje'
    if (dias === 1) return 'é amanhã'
    if (dias > 1 && dias % 7 === 0) return dias === 7 ? 'é em 1 semana' : `é em ${dias / 7} semanas`
    return `é em ${dias} dias`
}

// "1952-05-03" → "03/05/1952"
export function formatarDataNascimento(iso: string): string {
    const [ano, mes, dia] = iso.slice(0, 10).split('-')
    return `${dia}/${mes}/${ano}`
}

// "03/05/1952" → "1952-05-03" (ou null se incompleta ou impossível)
export function lerDataNascimento(texto: string): string | null {
    const m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!m) return null
    const [, dia, mes, ano] = m
    const data = new Date(`${ano}-${mes}-${dia}T00:00:00Z`)
    if (Number.isNaN(data.getTime()) || data.getUTCDate() !== Number(dia) || data.getUTCMonth() + 1 !== Number(mes)) return null
    return `${ano}-${mes}-${dia}`
}

// Máscara enquanto digita: "03051952" → "03/05/1952"
export function mascararData(texto: string): string {
    const d = texto.replace(/\D/g, '').slice(0, 8)
    if (d.length <= 2) return d
    if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

export function idade(dataNascimento: string, agora: Date): number {
    const [ano, mes, dia] = dataNascimento.slice(0, 10).split('-').map(Number)
    const hoje = partesEmSaoPaulo(agora)
    const fezAniversario = hoje.mes > mes || (hoje.mes === mes && hoje.dia >= dia)
    return hoje.ano - ano - (fezAniversario ? 0 : 1)
}

// "26/11 07:00" — horário curto para listas da equipe
export function formatarDiaHoraCurto(entrada: string | Date): string {
    const p = partesEmSaoPaulo(entrada)
    return `${p.dia}/${String(p.mes).padStart(2, '0')} ${String(p.hora).padStart(2, '0')}:${String(p.minuto).padStart(2, '0')}`
}

// "08:00" — coluna de hora da agenda da equipe
export function formatarHoraRelogio(entrada: string | Date): string {
    const p = partesEmSaoPaulo(entrada)
    return `${String(p.hora).padStart(2, '0')}:${String(p.minuto).padStart(2, '0')}`
}

// Soma dias a um "AAAA-MM-DD"
export function somarDiasISO(dia: string, dias: number): string {
    const d = new Date(`${dia}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + dias)
    return d.toISOString().slice(0, 10)
}

// "Qui, 10/12" a partir de "AAAA-MM-DD" (meio-dia em São Paulo, para não virar o dia)
export function formatarDiaDeISO(dia: string): string {
    return formatarDia(`${dia}T15:00:00Z`)
}
