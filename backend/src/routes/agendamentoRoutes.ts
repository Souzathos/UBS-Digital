import { Router } from "express";
import { AgendamentoController } from "../controllers/AgendamentoController";
import { CriarAgendamentoDTO } from "../dtos/agendamento";
import { authPaciente } from "../middlewares/auth";
import { validateBody } from "../middlewares/validateBody";

// Rotas do paciente (app)
const agendamentoRoutes = Router()
const agendamento = new AgendamentoController()

agendamentoRoutes.use(authPaciente())

agendamentoRoutes.post('/', validateBody(CriarAgendamentoDTO), agendamento.criar.bind(agendamento))
agendamentoRoutes.get('/meus', agendamento.meus.bind(agendamento))

export default agendamentoRoutes
