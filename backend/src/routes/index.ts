import { Router } from "express";
import agendamentoRoutes from "./agendamentoRoutes";
import authRoutes from "./authRoutes";
import catalogoRoutes from "./catalogoRoutes";
import devRoutes from "./devRoutes";
import equipeRoutes from "./equipeRoutes";
import linkRoutes from "./linkRoutes";
import pacienteRoutes from "./pacienteRoutes";
import slotRoutes from "./slotRoutes";

const routes = Router()

routes.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))
routes.use('/auth', authRoutes)
routes.use('/', catalogoRoutes)
routes.use('/pacientes', pacienteRoutes)
routes.use('/slots', slotRoutes)
routes.use('/agendamentos', agendamentoRoutes)
routes.use('/equipe', equipeRoutes)
routes.use('/l', linkRoutes)
routes.use('/dev', devRoutes)

export default routes
