import { Canal } from "../../models/enums";
import { CanalAdapter, MensagemSaida, ResultadoEnvio } from "../CanalAdapter";

export interface EnvioRegistrado extends MensagemSaida {
    id: number
}

const LIMITE = 500

// Caixa de saída em memória: é onde os envios "chegam" enquanto os canais não estão integrados.
// GET /dev/envios mostra o conteúdo, para conferir texto e link de cada etapa.
export class CaixaDeSaida {
    private envios: EnvioRegistrado[] = []
    private sequencia = 0

    registrar(mensagem: MensagemSaida) {
        this.sequencia += 1
        const envio = { ...mensagem, id: this.sequencia }
        this.envios.push(envio)
        if(this.envios.length > LIMITE) this.envios.shift()
        return envio
    }

    // Mais recentes primeiro
    listar(limite = 100) {
        return this.envios.slice(-limite).reverse()
    }

    limpar() {
        this.envios = []
    }
}

export const caixaDeSaida = new CaixaDeSaida()

export class MockAdapter implements CanalAdapter {
    constructor(readonly canal: Canal, private readonly caixa: CaixaDeSaida = caixaDeSaida, private readonly logar = process.env.NODE_ENV === 'development') {}

    async enviar(mensagem: MensagemSaida): Promise<ResultadoEnvio> {
        const envio = this.caixa.registrar(mensagem)
        if(this.logar) console.log(`[mock ${this.canal}] para ${mensagem.destino ?? '(sem canal próprio)'}: ${mensagem.texto}`)
        return { ok: true, idExterno: `mock-${envio.id}` }
    }
}
