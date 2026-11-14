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
