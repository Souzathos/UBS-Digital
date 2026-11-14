import { Router } from "express";
import { DevController } from "../controllers/DevController";
import { AvancarRelogioDTO, DefinirRelogioDTO } from "../dtos/dev";
import { apenasDev } from "../middlewares/apenasDev";
import { authEquipe } from "../middlewares/auth";
import { validateBody } from "../middlewares/validateBody";

const devRoutes = Router()
const dev = new DevController()

// Só fora de produção e só para a equipe logada
devRoutes.use(apenasDev, authEquipe())

devRoutes.get('/relogio', dev.relogioAtual.bind(dev))
devRoutes.post('/relogio/avancar', validateBody(AvancarRelogioDTO), dev.avancar.bind(dev))
devRoutes.post('/relogio/definir', validateBody(DefinirRelogioDTO), dev.definir.bind(dev))
devRoutes.post('/relogio/zerar', dev.zerar.bind(dev))
devRoutes.post('/jobs/rodar', dev.rodarJobs.bind(dev))
devRoutes.get('/envios', dev.envios.bind(dev))
devRoutes.delete('/envios', dev.limparEnvios.bind(dev))

export default devRoutes
