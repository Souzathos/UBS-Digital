import { Router } from "express";
import { LinkController } from "../controllers/LinkController";

// Página do link de ação: sem login, o token na URL é a credencial (RN-70)
const linkRoutes = Router()
const link = new LinkController()

linkRoutes.get('/:token', link.abrir.bind(link))
linkRoutes.post('/:token/confirmar', link.confirmar.bind(link))
linkRoutes.get('/:token/cancelar', link.telaCancelar.bind(link))
linkRoutes.post('/:token/cancelar', link.cancelar.bind(link))
linkRoutes.get('/:token/remarcar', link.telaRemarcar.bind(link))
linkRoutes.post('/:token/remarcar', link.remarcar.bind(link))

export default linkRoutes
