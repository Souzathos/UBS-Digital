import { Router } from "express";
import authRoutes from "./authRoutes";
import devRoutes from "./devRoutes";
import pacienteRoutes from "./pacienteRoutes";

const routes = Router()

routes.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))
routes.use('/auth', authRoutes)
routes.use('/pacientes', pacienteRoutes)
routes.use('/dev', devRoutes)

export default routes
