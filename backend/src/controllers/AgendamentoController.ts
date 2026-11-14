import { Request, Response } from "express";
import { CriarAgendamentoInput, RemarcarInput } from "../dtos/agendamento";
import { AgendamentoMapper } from "../mappers/AgendamentoMapper";
import { sessaoPaciente } from "../middlewares/auth";
import { AgendamentoService } from "../services/AgendamentoService";
import { AvisoService } from "../services/AvisoService";
import { autorPaciente } from "../services/autor";

// Ações do paciente pelo app
export class AgendamentoController {
    private service = new AgendamentoService()
    private avisos = new AvisoService()

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

    async confirmar(req: Request, res: Response) {
        const sessao = sessaoPaciente(req)
        const agendamento = await this.service.confirmar(Number(req.params.id), autorPaciente(sessao), sessao.ubsId)
        return res.status(200).json(AgendamentoMapper.paraPaciente(agendamento, this.service.acoesDisponiveis(agendamento)))
    }

    async cancelar(req: Request, res: Response) {
        const sessao = sessaoPaciente(req)
        const agendamento = await this.service.cancelar(Number(req.params.id), autorPaciente(sessao), sessao.ubsId)
        return res.status(200).json(AgendamentoMapper.paraPaciente(agendamento, this.service.acoesDisponiveis(agendamento)))
    }

    async remarcar(req: Request, res: Response) {
        const sessao = sessaoPaciente(req)
        const { slotId } = req.body as RemarcarInput
        const agendamento = await this.service.remarcar(Number(req.params.id), slotId, autorPaciente(sessao), sessao.ubsId)
        return res.status(200).json(AgendamentoMapper.paraPaciente(agendamento, this.service.acoesDisponiveis(agendamento)))
    }

    // "Avisos desta consulta": linha do tempo D-14, D-7, D-3 e D-0 (RN-10 a RN-12)
    async avisosDoAgendamento(req: Request, res: Response) {
        const sessao = sessaoPaciente(req)
        return res.status(200).json(await this.avisos.doAgendamento(Number(req.params.id), autorPaciente(sessao), sessao.ubsId))
    }
}
