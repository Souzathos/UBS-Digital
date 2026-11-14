import { z } from "zod";
import { apenasDigitos } from "../../utils/cpf";

export const EntrarEquipeDTO = z.object({
    email: z.string().trim().toLowerCase().email('E-mail inválido'),
    senha: z.string().min(1, 'Informe a senha')
})
export type EntrarEquipeInput = z.infer<typeof EntrarEquipeDTO>

export const EntrarPacienteDTO = z.object({
    cpf: z.string().transform(apenasDigitos).pipe(z.string().length(11, 'CPF deve ter 11 números')),
    senha: z.string().min(1, 'Informe a senha')
})
export type EntrarPacienteInput = z.infer<typeof EntrarPacienteDTO>

export const TrocarSenhaDTO = z.object({
    senhaAtual: z.string().min(1, 'Informe a senha atual'),
    novaSenha: z.string().min(6, 'A nova senha precisa de pelo menos 6 caracteres').max(72, 'Senha longa demais')
}).refine(d => d.senhaAtual !== d.novaSenha, { message: 'A nova senha precisa ser diferente da atual', path: ['novaSenha'] })
export type TrocarSenhaInput = z.infer<typeof TrocarSenhaDTO>
