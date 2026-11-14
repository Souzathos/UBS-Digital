import { Router } from "express";
import devRoutes from "./devRoutes";

const routes = Router()

routes.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))
routes.use('/dev', devRoutes)

export default routes
