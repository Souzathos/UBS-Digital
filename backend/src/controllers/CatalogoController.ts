import { Request, Response } from "express";
import { CatalogoMapper } from "../mappers/CatalogoMapper";
import { CatalogoService } from "../services/CatalogoService";

export class CatalogoController {
    private service = new CatalogoService()

    async tipos(req: Request, res: Response) {
        const tipos = await this.service.listarTipos(req.auth!)
        return res.status(200).json(tipos.map(CatalogoMapper.tipo))
    }

    async ruas(req: Request, res: Response) {
        const ruas = await this.service.listarRuas(req.auth!)
        return res.status(200).json(ruas.map(CatalogoMapper.rua))
    }

    async profissionais(req: Request, res: Response) {
        const profissionais = await this.service.listarProfissionais(req.auth!)
        return res.status(200).json(profissionais.map(CatalogoMapper.profissional))
    }
}
