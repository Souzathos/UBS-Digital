import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { PacienteController } from "../controllers/PacienteController";
import { AtualizarCanaisDTO } from "../dtos/paciente";
import { EntrarEquipeDTO, EntrarPacienteDTO, TrocarSenhaDTO } from "../dtos/auth";
import { authPaciente, authQualquer } from "../middlewares/auth";
import { validateBody } from "../middlewares/validateBody";

const authRoutes = Router()
const auth = new AuthController()
const paciente = new PacienteController()

authRoutes.post('/equipe/entrar', validateBody(EntrarEquipeDTO), auth.entrarEquipe.bind(auth))
authRoutes.post('/paciente/entrar', validateBody(EntrarPacienteDTO), auth.entrarPaciente.bind(auth))
authRoutes.post('/paciente/trocar-senha', authPaciente({ permitirSenhaProvisoria: true }), validateBody(TrocarSenhaDTO), auth.trocarSenha.bind(auth))
authRoutes.get('/eu', authQualquer, auth.eu.bind(auth))
// Perfil do paciente: canais de aviso autorizados (RN-80)
authRoutes.patch('/paciente/canais', authPaciente(), validateBody(AtualizarCanaisDTO), paciente.atualizarCanais.bind(paciente))

export default authRoutes
