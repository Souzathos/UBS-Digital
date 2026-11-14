import { z } from "zod";

const id = z.coerce.number().int().positive()

export const CriarAgendamentoDTO = z.object({ slotId: id })
export type CriarAgendamentoInput = z.infer<typeof CriarAgendamentoDTO>

export const CriarAgendamentoEquipeDTO = z.object({ pacienteId: id, slotId: id })
export type CriarAgendamentoEquipeInput = z.infer<typeof CriarAgendamentoEquipeDTO>

export const AgendaDoDiaDTO = z.object({
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD'),
    profissionalId: id.optional()
})
export type AgendaDoDiaInput = z.infer<typeof AgendaDoDiaDTO>
