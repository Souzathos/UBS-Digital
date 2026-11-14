import { Clock } from "../clock/Clock";
import { clock as relogioPadrao } from "../clock";

// Cada job recebe o "agora" do relógio injetado e devolve contadores do que fez (ex.: { enviados: 3 })
export interface Job {
    nome: string
    executar(agora: Date): Promise<Record<string, number>>
}

export type ResumoJobs = Record<string, Record<string, number>>

export class JobRunner {
    private jobs: Job[] = []
    private timer: NodeJS.Timeout | null = null
    private emExecucao: Promise<ResumoJobs> | null = null

    constructor(private readonly clock: Clock) {}

    registrar(job: Job) {
        if(this.jobs.some(j => j.nome === job.nome)) throw new Error(`Job "${job.nome}" já registrado`)
        this.jobs.push(job)
    }

    get nomes() {
        return this.jobs.map(j => j.nome)
    }

    // Roda todos os jobs uma vez, no "agora" do relógio, na ordem em que foram registrados.
    // Se já houver uma rodada em andamento (tick + endpoint /dev), espera ela terminar antes.
    async rodar(): Promise<ResumoJobs> {
        while(this.emExecucao) await this.emExecucao.catch(() => undefined)

        this.emExecucao = this.rodarTodos()
        try {
            return await this.emExecucao
        } finally {
            this.emExecucao = null
        }
    }

    private async rodarTodos() {
        const agora = this.clock.now()
        const resumo: ResumoJobs = {}
        for(const job of this.jobs) {
            resumo[job.nome] = await job.executar(agora)
        }
        return resumo
    }

    // Tick periódico. Intervalo 0 desliga (testes e endpoint /dev rodam à mão).
    iniciar(intervaloMs: number) {
        if(intervaloMs <= 0 || this.timer) return
        this.timer = setInterval(() => {
            if(this.emExecucao) return
            this.rodar().catch(error => console.error('Falha ao rodar os jobs:', error))
        }, intervaloMs)
        this.timer.unref()
    }

    parar() {
        if(this.timer) clearInterval(this.timer)
        this.timer = null
    }
}

// Runner da aplicação; os jobs se registram nele em src/jobs/index.ts
export const jobRunner = new JobRunner(relogioPadrao)
