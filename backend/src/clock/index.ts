import { env } from "../config/env";
import { AdjustableClock } from "./AdjustableClock";
import { Clock } from "./Clock";
import { SystemClock } from "./SystemClock";

// Em produção o relógio é o real e não há como ajustá-lo. Fora dela, o mesmo objeto é exposto
// como ajustável para o endpoint /dev e para os testes.
export const relogioAjustavel: AdjustableClock | null = env.NODE_ENV === 'production' ? null : new AdjustableClock()

// Relógio padrão injetado nos services e jobs
export const clock: Clock = relogioAjustavel ?? new SystemClock()

export { Clock, AdjustableClock, SystemClock }
