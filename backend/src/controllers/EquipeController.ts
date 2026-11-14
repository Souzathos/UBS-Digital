import { Request, Response } from "express";
import { AgendaDoDiaInput, CriarAgendamentoEquipeInput, RemarcarInput } from "../dtos/agendamento";
import { AgendamentoMapper } from "../mappers/AgendamentoMapper";
import { sessaoEquipe } from "../middlewares/auth";
import { RegistrarPresencaInput } from "../dtos/presenca";
import { AgendamentoService } from "../services/AgendamentoService";
import { PresencaService } from "../services/PresencaService";
import { autorEquipe } from "../services/autor";

// Ações da equipe pelo painel da UBS
export class EquipeController {
    private agendamentos = new AgendamentoService()
    private presencas = new PresencaService()

    async agendar(req: Request, res: Response) {
        const { pacienteId, slotId } = req.body as CriarAgendamentoEquipeInput
        const agendamento = await this.agendamentos.criarPelaEquipe(pacienteId, slotId, sessaoEquipe(req))
        return res.status(201).json(AgendamentoMapper.paraEquipe(agendamento, this.agendamentos.acoesDisponiveis(agendamento)))
    }

    async agenda(req: Request, res: Response) {
        const itens = await this.agendamentos.agendaDoDia(res.locals.query as AgendaDoDiaInput, sessaoEquipe(req))
        return res.status(200).json(itens.map(i => AgendamentoMapper.paraEquipe(i.agendamento, i.acoes)))
    }

    async confirmar(req: Request, res: Response) {
        const sessao = sessaoEquipe(req)
        const agendamento = await this.agendamentos.confirmar(Number(req.params.id), autorEquipe(sessao), sessao.ubsId)
        return res.status(200).json(AgendamentoMapper.paraEquipe(agendamento, this.agendamentos.acoesDisponiveis(agendamento)))
    }

    async cancelar(req: Request, res: Response) {
        const sessao = sessaoEquipe(req)
        const agendamento = await this.agendamentos.cancelar(Number(req.params.id), autorEquipe(sessao), sessao.ubsId)
        return res.status(200).json(AgendamentoMapper.paraEquipe(agendamento, this.agendamentos.acoesDisponiveis(agendamento)))
    }

    async remarcar(req: Request, res: Response) {
        const sessao = sessaoEquipe(req)
        const { slotId } = req.body as RemarcarInput
        const agendamento = await this.agendamentos.remarcar(Number(req.params.id), slotId, autorEquipe(sessao), sessao.ubsId)
        return res.status(200).json(AgendamentoMapper.paraEquipe(agendamento, this.agendamentos.acoesDisponiveis(agendamento)))
    }

    // Fluxo C: comparecimento ou falta
    async registrarPresenca(req: Request, res: Response) {
        const sessao = sessaoEquipe(req)
        const { resultado } = req.body as RegistrarPresencaInput
        const agendamento = await this.presencas.registrar(Number(req.params.id), resultado, autorEquipe(sessao), sessao.ubsId)
        return res.status(200).json(AgendamentoMapper.paraEquipe(agendamento, this.agendamentos.acoesDisponiveis(agendamento)))
    }
}
