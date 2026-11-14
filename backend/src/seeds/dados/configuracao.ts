import { Canal } from "../../models/enums";
import { ChaveConfiguracao, ValorConfiguracao } from "../../services/configuracaoChaves";

// Padrões globais da seção 7. O código lê estes valores da tabela Configuracao
// (ConfiguracaoService), nunca daqui: este arquivo só existe para o seed gravá-los.
export const CONFIGURACAO_PADRAO: { [K in ChaveConfiguracao]: ValorConfiguracao<K> } = {
    'lembrete.etapasDias': [14, 7, 3, 0],                 // RN-10
    'lembrete.d0Hora': '07:00',                           // RN-10
    'semResposta.prazoD3Horas': 48,                       // RN-26
    'agendamento.cotaAppPercentual': 40,                  // RN-02
    'agendamento.confirmadoAutomaticoDias': 3,            // RN-05
    'oferta.antecedenciaMinimaHoras': 1,                  // RN-30
    'oferta.prazoAceite': { maisDe72h: 24, de24a72h: 4, menosDe24h: 1 }, // RN-32
    'oferta.maxCandidatos': 5,                            // RN-32, RN-33
    'pontos.inicial': 100,                                // RN-40
    'pontos.maximo': 100,                                 // RN-40
    'pontos.faltaConfirmada': -30,                        // RN-40
    'pontos.comparecimento': 10,                          // RN-40
    'pontos.limiteOfertas': 50,                           // RN-40
    'canal.escalonamentoHoras': 12,                       // RN-61
    'canal.ordem': [Canal.PUSH, Canal.WHATSAPP, Canal.SMS] // RN-60
}
