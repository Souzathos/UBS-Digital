import { Router } from "express";
import { AgendamentoController } from "../controllers/AgendamentoController";
import { CriarAgendamentoDTO, RemarcarDTO } from "../dtos/agendamento";
import { authPaciente } from "../middlewares/auth";
import { validateBody, validateIds } from "../middlewares/validateBody";

// Rotas do paciente (app)
const agendamentoRoutes = Router()
const agendamento = new AgendamentoController()

agendamentoRoutes.use(authPaciente())

agendamentoRoutes.post('/', validateBody(CriarAgendamentoDTO), agendamento.criar.bind(agendamento))
agendamentoRoutes.get('/meus', agendamento.meus.bind(agendamento))
agendamentoRoutes.get('/:id/avisos', validateIds('id'), agendamento.avisosDoAgendamento.bind(agendamento))
agendamentoRoutes.post('/:id/confirmar', validateIds('id'), agendamento.confirmar.bind(agendamento))
agendamentoRoutes.post('/:id/cancelar', validateIds('id'), agendamento.cancelar.bind(agendamento))
agendamentoRoutes.post('/:id/remarcar', validateIds('id'), validateBody(RemarcarDTO), agendamento.remarcar.bind(agendamento))

export default agendamentoRoutes
