import { Canal } from "../../models/enums";
import { CanalAdapter, MensagemSaida, ResultadoEnvio } from "../CanalAdapter";
import { CaixaDeSaida, caixaDeSaida } from "./MockAdapter";

const URL_EXPO_PUSH = 'https://exp.host/--/api/v2/push/send'

type Enviar = (url: string, init: RequestInit) => Promise<Response>

// Push pelo serviço de notificações do Expo (seção 2, componente 3; RN-60). O app registra o
// ExpoPushToken do aparelho (PATCH /auth/paciente/push-token) e o job de lembretes manda por aqui.
// O envio também fica na caixa de saída de dev, para o relógio de testes continuar mostrando tudo.
export class ExpoPushAdapter implements CanalAdapter {
    readonly canal = Canal.PUSH

    constructor(private readonly enviarHttp: Enviar = fetch, private readonly caixa: CaixaDeSaida = caixaDeSaida) {}

    async enviar(mensagem: MensagemSaida): Promise<ResultadoEnvio> {
        this.caixa.registrar(mensagem)
        if(!mensagem.destino) return { ok: false, erro: 'Paciente sem token de push' }

        const resposta = await this.enviarHttp(URL_EXPO_PUSH, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: mensagem.destino,
                title: mensagem.titulo ?? 'UBS',
                body: mensagem.textoCurto ?? mensagem.texto,
                sound: 'default',
                data: { agendamentoId: mensagem.agendamentoId ?? null, etapa: mensagem.etapa, link: mensagem.link }
            })
        })
        if(!resposta.ok) return { ok: false, erro: `Serviço de push respondeu ${resposta.status}` }

        // Resposta: { data: { status: 'ok', id } } ou { data: { status: 'error', message, details } }
        const corpo = await resposta.json() as { data?: { status?: string, id?: string, message?: string } }
        if(corpo.data?.status !== 'ok') return { ok: false, erro: corpo.data?.message ?? 'Falha no envio do push' }
        return { ok: true, idExterno: corpo.data.id ?? 'expo' }
    }
}
