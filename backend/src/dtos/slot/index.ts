import { z } from "zod";
import { StatusSlot } from "../../models/enums";

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD')
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora no formato HH:MM')
const id = z.coerce.number().int().positive()

export const CriarSlotsEmLoteDTO = z.object({
    profissionalId: id,
    tipoAtendimentoId: id,
    dataInicio: data,
    dataFim: data,
    horaInicio: hora,
    horaFim: hora,
    apenasDiasUteis: z.boolean().default(true)
}).refine(d => d.horaInicio < d.horaFim, { message: 'A hora final deve ser depois da inicial', path: ['horaFim'] })
export type CriarSlotsEmLoteInput = z.infer<typeof CriarSlotsEmLoteDTO>

export const ListarSlotsDTO = z.object({
    tipoAtendimentoId: id.optional(),
    profissionalId: id.optional(),
    // Só a equipe usa: aplica a regra do médico pela rua desse paciente
    pacienteId: id.optional(),
    de: data.optional(),
    ate: data.optional(),
    // Só a equipe usa: por padrão LIVRE
    status: z.enum(StatusSlot).optional()
})
export type ListarSlotsInput = z.infer<typeof ListarSlotsDTO>
