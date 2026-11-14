import { Canal, EtapaNotificacao, TipoAutor } from "../models/enums";

// Uma mensagem pronta para sair por um canal. O adaptador não decide nada: só entrega.
export interface MensagemSaida {
    notificacaoId: number
    canal: Canal
    destinatarioTipo: TipoAutor
    destinatarioId: number
    // Nome de quem recebe (para o relógio de testes e para a saudação dos canais reais)
    destinatarioNome: string
    // Telefone, e-mail ou push token; null quando o paciente não tem canal próprio (Camada 1, premissa 4)
    destino: string | null
    etapa: EtapaNotificacao
    texto: string
    link: string
    // RN-12: lembrete com ação (PENDENTE em D-14/D-7/D-3) ou só informativo
    exigeResposta: boolean
    enviadaEm: Date
}

export type ResultadoEnvio = { ok: true, idExterno: string } | { ok: false, erro: string }

// Seção 2, componente 3: uma interface única, um adaptador por canal (FCM, WhatsApp, SMS, e-mail).
// Enquanto um canal não estiver integrado (Camada 3), ele usa o MockAdapter.
export interface CanalAdapter {
    readonly canal: Canal
    enviar(mensagem: MensagemSaida): Promise<ResultadoEnvio>
}
