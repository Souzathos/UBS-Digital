import { Clock } from "./Clock";

// Relógio real, usado em produção
export class SystemClock implements Clock {
    now() {
        return new Date()
    }
}
