// RN-90: todo código que depende de horário recebe um Clock, nunca chama Date.now() direto.
// Assim o fluxo de 14 dias de lembretes roda em minutos no desenvolvimento e nos testes.
export interface Clock {
    now(): Date
}
