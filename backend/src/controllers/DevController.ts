import { Request, Response } from "express";
import { relogioAjustavel } from "../clock";
import { AvancarRelogioInput, DefinirRelogioInput } from "../dtos/dev";
import { jobRunner } from "../jobs";
import { avancarRelogioRodandoJobs } from "../jobs/relogioDev";

// Endpoints de desenvolvimento (RN-90). Só existem fora de produção (ver apenasDev).
export class DevController {
    private get relogio() {
        if(!relogioAjustavel) throw new Error('Relógio ajustável indisponível em produção')
        return relogioAjustavel
    }

    private estado() {
        return {
            agora: this.relogio.now(),
            deslocamentoMs: this.relogio.deslocamento,
            congelado: this.relogio.congelado,
            jobs: jobRunner.nomes
        }
    }

    async relogioAtual(_req: Request, res: Response) {
        return res.status(200).json(this.estado())
    }

    async avancar(req: Request, res: Response) {
        const { dias = 0, horas = 0, minutos = 0 } = req.body as AvancarRelogioInput
        const ms = ((dias * 24 + horas) * 60 + minutos) * 60 * 1000

        const resultado = await avancarRelogioRodandoJobs(this.relogio, jobRunner, ms)

        return res.status(200).json({ ...this.estado(), de: resultado.de, passos: resultado.passos, resultadoJobs: resultado.jobs })
    }

    async definir(req: Request, res: Response) {
        const { para } = req.body as DefinirRelogioInput
        this.relogio.definir(new Date(para))

        return res.status(200).json(this.estado())
    }

    async zerar(_req: Request, res: Response) {
        this.relogio.zerar()

        return res.status(200).json(this.estado())
    }

    async rodarJobs(_req: Request, res: Response) {
        const resumo = await jobRunner.rodar()

        return res.status(200).json({ ...this.estado(), resultadoJobs: resumo })
    }
}
