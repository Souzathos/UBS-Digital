import { Router } from "express";
import { EquipeController } from "../controllers/EquipeController";
import { AgendaDoDiaDTO, CriarAgendamentoEquipeDTO, RemarcarDTO } from "../dtos/agendamento";
import { PerfilEquipe } from "../models/enums";
import { authEquipe } from "../middlewares/auth";
import { validateBody, validateIds, validateQuery } from "../middlewares/validateBody";

// Rotas do painel da UBS
const equipeRoutes = Router()
const equipe = new EquipeController()
const recepcaoOuGestor = authEquipe(PerfilEquipe.RECEPCAO, PerfilEquipe.GESTOR)

equipeRoutes.get('/agenda', authEquipe(), validateQuery(AgendaDoDiaDTO), equipe.agenda.bind(equipe))
equipeRoutes.post('/agendamentos', recepcaoOuGestor, validateBody(CriarAgendamentoEquipeDTO), equipe.agendar.bind(equipe))
equipeRoutes.post('/agendamentos/:id/confirmar', validateIds('id'), recepcaoOuGestor, equipe.confirmar.bind(equipe))
equipeRoutes.post('/agendamentos/:id/cancelar', validateIds('id'), recepcaoOuGestor, equipe.cancelar.bind(equipe))
equipeRoutes.post('/agendamentos/:id/remarcar', validateIds('id'), recepcaoOuGestor, validateBody(RemarcarDTO), equipe.remarcar.bind(equipe))

export default equipeRoutes
