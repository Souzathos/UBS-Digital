import { OrigemSlot } from "../models/enums";

export class SlotService {
    // RN-02: reparte a cota do app espalhada pela agenda do profissional (40% → 2 de cada 5 slots),
    // em vez de concentrar os slots do app no fim do período. Devolve a origem de cada posição.
    static marcarCota(total: number, percentual: number): OrigemSlot[] {
        if(percentual < 0 || percentual > 100) throw new Error('Percentual da cota deve ficar entre 0 e 100')

        const alvo = Math.round(total * percentual / 100)
        const origens: OrigemSlot[] = []
        let acumulado = 0

        for(let i = 0; i < total; i++) {
            acumulado += alvo
            if(acumulado >= total) {
                acumulado -= total
                origens.push(OrigemSlot.APP)
            } else {
                origens.push(OrigemSlot.RECEPCAO)
            }
        }

        return origens
    }
}
