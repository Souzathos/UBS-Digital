import { z } from "zod";
import { Canal } from "../models/enums";

// Formato de cada chave da seção 7. O valor fica na tabela Configuracao como JSON em texto e é
// validado na leitura: valor malformado no banco vira erro claro, não comportamento estranho.
export const CHAVES_CONFIGURACAO = {
    'lembrete.etapasDias': z.array(z.number().int().min(0)).min(1),                        // RN-10
    'lembrete.d0Hora': z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),                      // RN-10
    'semResposta.prazoD3Horas': z.number().int().positive(),                               // RN-26
    'agendamento.cotaAppPercentual': z.number().min(0).max(100),                           // RN-02
    'agendamento.confirmadoAutomaticoDias': z.number().min(0),                             // RN-05
    'oferta.antecedenciaMinimaHoras': z.number().min(0),                                   // RN-30
    'oferta.prazoAceite': z.object({                                                       // RN-32
        maisDe72h: z.number().positive(),
        de24a72h: z.number().positive(),
        menosDe24h: z.number().positive()
    }),
    'oferta.maxCandidatos': z.number().int().positive(),                                   // RN-32, RN-33
    'pontos.inicial': z.number().int(),                                                    // RN-40
    'pontos.maximo': z.number().int(),                                                     // RN-40
    'pontos.faltaConfirmada': z.number().int(),                                            // RN-40
    'pontos.comparecimento': z.number().int(),                                             // RN-40
    'pontos.limiteOfertas': z.number().int(),                                              // RN-40
    'canal.escalonamentoHoras': z.number().positive(),                                     // RN-61
    'canal.ordem': z.array(z.enum([Canal.PUSH, Canal.WHATSAPP, Canal.SMS])).min(1)         // RN-60
}

export type ChaveConfiguracao = keyof typeof CHAVES_CONFIGURACAO
export type ValorConfiguracao<K extends ChaveConfiguracao> = z.infer<typeof CHAVES_CONFIGURACAO[K]>
