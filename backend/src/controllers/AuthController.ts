import { Request, Response } from "express";
import { EquipeMapper } from "../mappers/EquipeMapper";
import { PacienteMapper } from "../mappers/PacienteMapper";
import { UbsMapper } from "../mappers/UbsMapper";
import { sessaoPaciente } from "../middlewares/auth";
import { TipoAutor } from "../models/enums";
import { AuthService } from "../services/AuthService";

export class AuthController {
    private service = new AuthService()

    async entrarEquipe(req: Request, res: Response) {
        const { token, usuario } = await this.service.entrarEquipe(req.body)
        return res.status(200).json({ token, usuario: EquipeMapper.toResponse(usuario), ubs: UbsMapper.toResponse(await this.service.ubsDa(usuario.ubsId)) })
    }

    async entrarPaciente(req: Request, res: Response) {
        const { token, paciente } = await this.service.entrarPaciente(req.body)
        return res.status(200).json({ token, deveTrocarSenha: paciente.deveTrocarSenha, paciente: PacienteMapper.paraPaciente(paciente), ubs: UbsMapper.toResponse(await this.service.ubsDa(paciente.ubsId)) })
    }

    async trocarSenha(req: Request, res: Response) {
        const { token, paciente } = await this.service.trocarSenhaPaciente(sessaoPaciente(req), req.body)
        return res.status(200).json({ token, deveTrocarSenha: false, paciente: PacienteMapper.paraPaciente(paciente), ubs: UbsMapper.toResponse(await this.service.ubsDa(paciente.ubsId)) })
    }

    async eu(req: Request, res: Response) {
        const resultado = await this.service.eu(req.auth!)
        const ubs = UbsMapper.toResponse(await this.service.ubsDa(req.auth!.ubsId))
        if(resultado.tipo === TipoAutor.EQUIPE) return res.status(200).json({ tipo: resultado.tipo, usuario: EquipeMapper.toResponse(resultado.usuario), ubs })
        return res.status(200).json({ tipo: resultado.tipo, paciente: PacienteMapper.paraPaciente(resultado.paciente), ubs })
    }
}
