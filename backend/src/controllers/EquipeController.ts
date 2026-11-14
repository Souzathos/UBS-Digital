import { Request, Response } from "express";
import { AgendaDoDiaInput, CriarAgendamentoEquipeInput } from "../dtos/agendamento";
import { AgendamentoMapper } from "../mappers/AgendamentoMapper";
import { sessaoEquipe } from "../middlewares/auth";
import { AgendamentoService } from "../services/AgendamentoService";

// Ações da equipe pelo painel da UBS
export class EquipeController {
    private agendamentos = new AgendamentoService()

    async agendar(req: Request, res: Response) {
        const { pacienteId, slotId } = req.body as CriarAgendamentoEquipeInput
        const agendamento = await this.agendamentos.criarPelaEquipe(pacienteId, slotId, sessaoEquipe(req))
        return res.status(201).json(AgendamentoMapper.paraEquipe(agendamento, this.agendamentos.acoesDisponiveis(agendamento)))
    }

    async agenda(req: Request, res: Response) {
        const itens = await this.agendamentos.agendaDoDia(res.locals.query as AgendaDoDiaInput, sessaoEquipe(req))
        return res.status(200).json(itens.map(i => AgendamentoMapper.paraEquipe(i.agendamento, i.acoes)))
    }
}
