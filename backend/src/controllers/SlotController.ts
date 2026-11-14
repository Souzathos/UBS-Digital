import { Request, Response } from "express";
import { ListarSlotsInput } from "../dtos/slot";
import { SlotMapper } from "../mappers/SlotMapper";
import { sessaoEquipe, sessaoPaciente } from "../middlewares/auth";
import { TipoAutor } from "../models/enums";
import { SlotService } from "../services/SlotService";

export class SlotController {
    private service = new SlotService()

    async listar(req: Request, res: Response) {
        const filtros = res.locals.query as ListarSlotsInput
        if(req.auth!.tipo === TipoAutor.PACIENTE) {
            const slots = await this.service.listarParaPaciente(filtros, sessaoPaciente(req))
            return res.status(200).json(slots.map(SlotMapper.paraPaciente))
        }
        const slots = await this.service.listarParaEquipe(filtros, sessaoEquipe(req))
        return res.status(200).json(slots.map(SlotMapper.paraEquipe))
    }

    async criarEmLote(req: Request, res: Response) {
        return res.status(201).json(await this.service.criarEmLote(req.body, sessaoEquipe(req)))
    }
}
