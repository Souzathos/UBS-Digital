import { addDays, isWeekend, set, startOfDay } from "date-fns";

// Helpers de data em horário local (TZ fixado em config/env.ts). Nenhum deles cria "agora":
// quem precisa do instante atual usa o Clock (RN-90).

export function comHorario(dia: Date, horario: string) {
    const [hora, minuto] = horario.split(':').map(Number)
    return set(dia, { hours: hora, minutes: minuto, seconds: 0, milliseconds: 0 })
}

export function inicioDoDia(data: Date) {
    return startOfDay(data)
}

export function somarDias(data: Date, dias: number) {
    return addDays(data, dias)
}

export function somarMinutos(data: Date, minutos: number) {
    return new Date(data.getTime() + minutos * 60_000)
}

export function ehDiaUtil(data: Date) {
    return !isWeekend(data)
}

export function diasUteisAPartirDe(inicio: Date, quantidadeDias: number) {
    const dias: Date[] = []
    for(let i = 0; i < quantidadeDias; i++) {
        const dia = somarDias(inicioDoDia(inicio), i)
        if(ehDiaUtil(dia)) dias.push(dia)
    }
    return dias
}

export function dataIso(data: Date) {
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
}
