import { Router } from "express";
import { EquipeController } from "../controllers/EquipeController";
import { AgendaDoDiaDTO, CriarAgendamentoEquipeDTO } from "../dtos/agendamento";
import { PerfilEquipe } from "../models/enums";
import { authEquipe } from "../middlewares/auth";
import { validateBody, validateQuery } from "../middlewares/validateBody";

// Rotas do painel da UBS
const equipeRoutes = Router()
const equipe = new EquipeController()
const recepcaoOuGestor = authEquipe(PerfilEquipe.RECEPCAO, PerfilEquipe.GESTOR)

equipeRoutes.get('/agenda', authEquipe(), validateQuery(AgendaDoDiaDTO), equipe.agenda.bind(equipe))
equipeRoutes.post('/agendamentos', recepcaoOuGestor, validateBody(CriarAgendamentoEquipeDTO), equipe.agendar.bind(equipe))

export default equipeRoutes
