import { Router } from "express";
import { CatalogoController } from "../controllers/CatalogoController";
import { authEquipe, authEquipeOuPaciente } from "../middlewares/auth";

const catalogoRoutes = Router()
const catalogo = new CatalogoController()

catalogoRoutes.get('/tipos-atendimento', authEquipeOuPaciente, catalogo.tipos.bind(catalogo))
catalogoRoutes.get('/ruas', authEquipe(), catalogo.ruas.bind(catalogo))
catalogoRoutes.get('/profissionais', authEquipeOuPaciente, catalogo.profissionais.bind(catalogo))

export default catalogoRoutes
