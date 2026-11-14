import { Router } from "express";

const routes = Router()

routes.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))

export default routes
