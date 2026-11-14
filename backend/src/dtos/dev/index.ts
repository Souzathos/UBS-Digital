import { z } from "zod";

export const AvancarRelogioDTO = z.object({
    dias: z.number().int().min(0).max(365).optional(),
    horas: z.number().int().min(0).max(24 * 365).optional(),
    minutos: z.number().int().min(0).max(60 * 24 * 365).optional()
}).refine(d => (d.dias ?? 0) + (d.horas ?? 0) + (d.minutos ?? 0) > 0, { message: 'Informe dias, horas ou minutos', path: ['dias'] })

export type AvancarRelogioInput = z.infer<typeof AvancarRelogioDTO>

export const DefinirRelogioDTO = z.object({
    para: z.string().min(1).refine(v => !Number.isNaN(Date.parse(v)), 'Data inválida (use ISO 8601, ex.: 2026-11-20T07:00:00-03:00)')
})

export type DefinirRelogioInput = z.infer<typeof DefinirRelogioDTO>
