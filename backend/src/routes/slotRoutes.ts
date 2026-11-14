import { Router } from "express";
import { SlotController } from "../controllers/SlotController";
import { CriarSlotsEmLoteDTO, ListarSlotsDTO } from "../dtos/slot";
import { PerfilEquipe } from "../models/enums";
import { authEquipe, authEquipeOuPaciente } from "../middlewares/auth";
import { validateBody, validateQuery } from "../middlewares/validateBody";

const slotRoutes = Router()
const slot = new SlotController()

slotRoutes.get('/', authEquipeOuPaciente, validateQuery(ListarSlotsDTO), slot.listar.bind(slot))
slotRoutes.post('/lote', authEquipe(PerfilEquipe.RECEPCAO, PerfilEquipe.GESTOR), validateBody(CriarSlotsEmLoteDTO), slot.criarEmLote.bind(slot))

export default slotRoutes
