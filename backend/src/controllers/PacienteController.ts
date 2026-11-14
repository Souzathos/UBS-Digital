import { Request, Response } from "express";
import { BuscarPacientesInput } from "../dtos/paciente";
import { PacienteMapper } from "../mappers/PacienteMapper";
import { sessaoEquipe } from "../middlewares/auth";
import { PacienteService } from "../services/PacienteService";

export class PacienteController {
    private service = new PacienteService()

    async cadastrar(req: Request, res: Response) {
        const { paciente, senhaProvisoria } = await this.service.cadastrar(req.body, sessaoEquipe(req))
        return res.status(201).json({ paciente: PacienteMapper.paraEquipe(paciente), senhaProvisoria })
    }

    async buscar(_req: Request, res: Response) {
        const pacientes = await this.service.buscar(res.locals.query as BuscarPacientesInput, sessaoEquipe(_req))
        return res.status(200).json(pacientes.map(PacienteMapper.paraEquipe))
    }

    async obter(req: Request, res: Response) {
        const paciente = await this.service.obter(Number(req.params.id), sessaoEquipe(req))
        return res.status(200).json(PacienteMapper.paraEquipe(paciente))
    }

    async redefinirSenha(req: Request, res: Response) {
        const { paciente, senhaProvisoria } = await this.service.redefinirSenha(Number(req.params.id), sessaoEquipe(req))
        return res.status(200).json({ paciente: PacienteMapper.paraEquipe(paciente), senhaProvisoria })
    }
}
