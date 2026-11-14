import { AdjustableClock } from "../clock/AdjustableClock";
import { JobRunner, ResumoJobs } from "./runner";

export const PASSO_PADRAO_MS = 60 * 60 * 1000

// RN-90: "avançar 14 dias" não pode pular etapas. O relógio anda em passos (1h por padrão) e os jobs
// rodam a cada passo, então D-14, D-7, D-3 e D-0 saem na ordem certa, como aconteceria no tempo real.
export async function avancarRelogioRodandoJobs(relogio: AdjustableClock, runner: JobRunner, ms: number, passoMs = PASSO_PADRAO_MS) {
    if(ms < 0) throw new Error('O relógio só anda para a frente')
    if(passoMs <= 0) throw new Error('O passo precisa ser positivo')

    const de = relogio.now()
    const acumulado: ResumoJobs = {}
    let restante = ms
    let passos = 0

    while(restante > 0) {
        const passo = Math.min(passoMs, restante)
        relogio.avancar(passo)
        restante -= passo
        passos += 1

        const resumo = await runner.rodar()
        for(const [job, contadores] of Object.entries(resumo)) {
            acumulado[job] ??= {}
            for(const [chave, valor] of Object.entries(contadores)) {
                acumulado[job][chave] = (acumulado[job][chave] ?? 0) + valor
            }
        }
    }

    return { de, ate: relogio.now(), passos, jobs: acumulado }
}
