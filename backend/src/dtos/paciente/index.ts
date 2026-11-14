import { z } from "zod";
import { Canal } from "../../models/enums";
import { apenasDigitos, cpfValido } from "../../utils/cpf";

const digitos = (min: number, max: number, mensagem: string) =>
    z.string().transform(apenasDigitos).pipe(z.string().min(min, mensagem).max(max, mensagem))

export const CadastrarPacienteDTO = z.object({
    nome: z.string().trim().min(3, 'Nome deve ter pelo menos 3 letras').max(120),
    cpf: z.string().transform(apenasDigitos).refine(cpfValido, 'CPF inválido'),
    cns: digitos(15, 15, 'CNS deve ter 15 números').optional().nullable(),
    dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD'),
    telefone: digitos(10, 11, 'Telefone deve ter DDD + número').optional().nullable(),
    email: z.string().trim().toLowerCase().email('E-mail inválido').optional().nullable(),
    possuiCelular: z.boolean().default(false),
    // RN-80: canais em que o paciente aceitou receber mensagens
    consentimentoCanais: z.array(z.enum(Canal)).default([])
})
export type CadastrarPacienteInput = z.infer<typeof CadastrarPacienteDTO>

export const BuscarPacientesDTO = z.object({
    q: z.string().trim().max(120).default('')
})
export type BuscarPacientesInput = z.infer<typeof BuscarPacientesDTO>
