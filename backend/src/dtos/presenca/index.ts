import { z } from "zod";
import { StatusAgendamento } from "../../models/enums";

export const RegistrarPresencaDTO = z.object({
    resultado: z.enum([StatusAgendamento.COMPARECEU, StatusAgendamento.FALTOU], { message: 'Use COMPARECEU ou FALTOU' })
})
export type RegistrarPresencaInput = z.infer<typeof RegistrarPresencaDTO>
