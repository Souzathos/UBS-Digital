import { Clock } from "./Clock";

// Relógio de desenvolvimento e testes. Dois modos:
// - fluindo (padrão): acompanha o relógio real somado a um deslocamento; "avançar 14 dias" soma ao deslocamento
// - congelado: fica parado num instante até alguém avançar ou definir; é o modo dos testes
// Junto com SystemClock, é o único lugar onde ler o relógio do sistema é permitido.
export class AdjustableClock implements Clock {
    private deslocamentoMs = 0
    private congeladoEm: Date | null = null

    now() {
        if(this.congeladoEm) return new Date(this.congeladoEm)
        return new Date(Date.now() + this.deslocamentoMs)
    }

    avancar(ms: number) {
        if(ms < 0) throw new Error('O relógio só anda para a frente')
        if(this.congeladoEm) this.congeladoEm = new Date(this.congeladoEm.getTime() + ms)
        else this.deslocamentoMs += ms
    }

    // Leva o relógio para um instante, mantendo o modo atual
    definir(data: Date) {
        if(this.congeladoEm) this.congeladoEm = new Date(data)
        else this.deslocamentoMs = data.getTime() - Date.now()
    }

    // Para o relógio num instante (testes determinísticos)
    congelar(data: Date) {
        this.congeladoEm = new Date(data)
    }

    // Volta ao relógio real, sem deslocamento
    zerar() {
        this.deslocamentoMs = 0
        this.congeladoEm = null
    }

    get congelado() {
        return this.congeladoEm !== null
    }

    get deslocamento() {
        return this.congeladoEm ? this.congeladoEm.getTime() - Date.now() : this.deslocamentoMs
    }
}
