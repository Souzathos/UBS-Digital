import { Canal, Paciente } from "../models";
import { CanalAdapter, MensagemSaida, ResultadoEnvio } from "./CanalAdapter";
import { env } from "../config/env";
import { ExpoPushAdapter } from "./adapters/ExpoPushAdapter";
import { MockAdapter } from "./adapters/MockAdapter";

export type CanalDeEnvio = Exclude<Canal, Canal.EMAIL>

// RN-80: só usa canal com consentimento registrado. Push depende do app instalado (token válido).
function canalDisponivel(paciente: Paciente, canal: CanalDeEnvio) {
    const consentimento = paciente.consentimentoCanais?.[canal]
    // Canal desligado no Perfil nunca é usado, nem o push
    if(consentimento?.aceito === false) return false
    const consentiu = consentimento?.aceito === true
    if(canal === Canal.PUSH) return Boolean(paciente.pushToken)
    return consentiu && Boolean(paciente.telefone) && paciente.possuiCelular
}

function destinoDoCanal(paciente: Paciente, canal: Canal) {
    if(canal === Canal.PUSH) return paciente.pushToken
    if(canal === Canal.EMAIL) return paciente.email
    return paciente.telefone
}

// Escolhe o canal e entrega a mensagem ao adaptador certo
export class Despachante {
    private adaptadores: Map<Canal, CanalAdapter>

    constructor(adaptadores?: CanalAdapter[]) {
        // Push real só com PUSH_EXPO=true; os outros canais seguem no mock até a Camada 3.
        const lista = adaptadores ?? [
            env.PUSH_EXPO ? new ExpoPushAdapter() : new MockAdapter(Canal.PUSH),
            ...[Canal.WHATSAPP, Canal.SMS, Canal.EMAIL].map(c => new MockAdapter(c))
        ]
        this.adaptadores = new Map(lista.map(a => [a.canal, a]))
    }

    // RN-60: primeiro canal da ordem configurada que o paciente tem. Sem nenhum, devolve o primeiro da
    // ordem com alcancavel=false (Camada 1: o mock registra; contato vinculado e equipe entram na Camada 2).
    escolherCanal(paciente: Paciente, ordem: CanalDeEnvio[]): { canal: CanalDeEnvio, destino: string | null, alcancavel: boolean } {
        const canal = ordem.find(c => canalDisponivel(paciente, c))
        if(canal) return { canal, destino: destinoDoCanal(paciente, canal), alcancavel: true }
        return { canal: ordem[0], destino: null, alcancavel: false }
    }

    async enviar(mensagem: MensagemSaida): Promise<ResultadoEnvio> {
        const adaptador = this.adaptadores.get(mensagem.canal)
        if(!adaptador) return { ok: false, erro: `Sem adaptador para ${mensagem.canal}` }
        try {
            return await adaptador.enviar(mensagem)
        } catch(error) {
            return { ok: false, erro: error instanceof Error ? error.message : String(error) }
        }
    }
}

export const despachante = new Despachante()
