import { Router } from "express";
import { PacienteController } from "../controllers/PacienteController";
import { AtualizarEnderecoDTO, BuscarPacientesDTO, CadastrarPacienteDTO } from "../dtos/paciente";
import { PerfilEquipe } from "../models/enums";
import { authEquipe } from "../middlewares/auth";
import { validateBody, validateIds, validateQuery } from "../middlewares/validateBody";

const pacienteRoutes = Router()
const paciente = new PacienteController()
const recepcaoOuGestor = authEquipe(PerfilEquipe.RECEPCAO, PerfilEquipe.GESTOR)

pacienteRoutes.post('/', recepcaoOuGestor, validateBody(CadastrarPacienteDTO), paciente.cadastrar.bind(paciente))
pacienteRoutes.get('/', authEquipe(), validateQuery(BuscarPacientesDTO), paciente.buscar.bind(paciente))
pacienteRoutes.get('/:id', validateIds('id'), authEquipe(), paciente.obter.bind(paciente))
pacienteRoutes.patch('/:id/endereco', validateIds('id'), recepcaoOuGestor, validateBody(AtualizarEnderecoDTO), paciente.atualizarEndereco.bind(paciente))
pacienteRoutes.post('/:id/redefinir-senha', validateIds('id'), recepcaoOuGestor, paciente.redefinirSenha.bind(paciente))

export default pacienteRoutes
