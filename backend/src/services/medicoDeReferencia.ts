import { EntityManager } from "typeorm";
import { BadRequestError, ForbiddenError } from "../errors";
import { CategoriaAtendimento, Paciente, Profissional, Rua } from "../models";

export const MENSAGEM_SEM_RUA = 'Cadastre a rua do paciente na recepção para agendar consulta médica'
export const MENSAGEM_OUTRO_MEDICO = 'Este horário é de outro médico. Consultas médicas são com o médico da sua rua'

// Decisão de 14/11: consulta médica é sempre com o médico de referência da rua do paciente
// (o paciente e a recepção não escolhem o médico). Procedimentos de enfermagem não dependem da rua.
export async function medicoDeReferencia(manager: EntityManager, paciente: Pick<Paciente, 'ruaId'>): Promise<Profissional | null> {
    if(!paciente.ruaId) return null
    const rua = await manager.getRepository(Rua).findOne({ where: { id: paciente.ruaId }, relations: { medicoReferencia: true } })
    return rua?.medicoReferencia ?? null
}

// Médico que pode atender o paciente neste tipo de atendimento: o de referência para CONSULTA,
// ninguém em particular (null) para PROCEDIMENTO. Sem rua cadastrada, consulta médica é recusada.
export async function exigirMedicoDaRua(manager: EntityManager, paciente: Pick<Paciente, 'ruaId'>, categoria: CategoriaAtendimento) {
    if(categoria !== CategoriaAtendimento.CONSULTA) return null
    const medico = await medicoDeReferencia(manager, paciente)
    if(!medico) throw new BadRequestError(MENSAGEM_SEM_RUA)
    return medico
}

export function validarMedicoDoSlot(medico: Profissional | null, profissionalIdDoSlot: number) {
    if(medico && medico.id !== profissionalIdDoSlot) throw new ForbiddenError(MENSAGEM_OUTRO_MEDICO)
}
