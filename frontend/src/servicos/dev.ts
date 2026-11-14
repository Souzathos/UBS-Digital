import { requisitar } from '@/api/cliente'

// Relógio de desenvolvimento (RN-90). As rotas só existem fora de produção e exigem login da equipe.
export type EstadoRelogio = { agora: string; deslocamentoMs: number; congelado: boolean; jobs: string[] }

export type Envio = {
    id: number
    notificacaoId: number
    canal: string
    destinatarioTipo: string
    destinatarioId: number
    destino: string | null
    etapa: string
    texto: string
    link: string
}

export interface DevServico {
    relogio(): Promise<EstadoRelogio>
    // Avança em passos de 1h rodando os jobs (os lembretes saem na ordem certa).
    avancar(tempo: { dias?: number; horas?: number }): Promise<EstadoRelogio>
    zerar(): Promise<EstadoRelogio>
    envios(limite?: number): Promise<Envio[]>
}

export const devApi: DevServico = {
    relogio: () => requisitar('GET', '/dev/relogio'),
    avancar: tempo => requisitar('POST', '/dev/relogio/avancar', { corpo: tempo }),
    zerar: () => requisitar('POST', '/dev/relogio/zerar'),
    envios: (limite = 100) => requisitar('GET', '/dev/envios', { query: { limite } })
}
