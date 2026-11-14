import { Request, Response } from "express";
import { CriarAgendamentoInput } from "../dtos/agendamento";
import { AgendamentoMapper } from "../mappers/AgendamentoMapper";
import { sessaoPaciente } from "../middlewares/auth";
import { AgendamentoService } from "../services/AgendamentoService";

// Ações do paciente pelo app
export class AgendamentoController {
    private service = new AgendamentoService()

    async criar(req: Request, res: Response) {
        const { slotId } = req.body as CriarAgendamentoInput
        const agendamento = await this.service.criarPeloPaciente(slotId, sessaoPaciente(req))
        return res.status(201).json(AgendamentoMapper.paraPaciente(agendamento, this.service.acoesDisponiveis(agendamento)))
    }

    async meus(req: Request, res: Response) {
        const { proximos, historico } = await this.service.listarDoPaciente(sessaoPaciente(req))
        return res.status(200).json({
            proximos: proximos.map(i => AgendamentoMapper.paraPaciente(i.agendamento, i.acoes)),
            historico: historico.map(i => AgendamentoMapper.paraPaciente(i.agendamento, i.acoes))
        })
    }
}
