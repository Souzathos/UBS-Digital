import { focusManager, QueryClient } from '@tanstack/react-query'
import { AppState, Platform } from 'react-native'

import { ApiErro } from './cliente'

// Cliente do TanStack Query: guarda as respostas da API em memória e decide quando buscar de novo.
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Dado com menos de 30 s não é buscado de novo ao voltar para a tela.
            staleTime: 30_000,
            // Erro 4xx é resposta definitiva da API (não adianta repetir). Só a falta de conexão
            // (status 0) e erro do servidor ganham mais uma tentativa.
            retry: (tentativas, erro) => {
                if (erro instanceof ApiErro && erro.status >= 400 && erro.status < 500) return false
                return tentativas < 1
            }
        },
        mutations: { retry: false }
    }
})

// No celular não existe "foco da janela": o app volta do segundo plano. Quando volta, as listas
// vencidas são buscadas de novo (ex.: a pessoa confirmou pelo link do WhatsApp e voltou ao app).
if (Platform.OS !== 'web') {
    focusManager.setEventListener(definirFoco => {
        const assinatura = AppState.addEventListener('change', estado => definirFoco(estado === 'active'))
        return () => assinatura.remove()
    })
}

// Chaves das consultas, num lugar só, para invalidar sempre a lista certa depois de uma ação.
export const chaves = {
    meusAtendimentos: ['agendamentos', 'meus'] as const
}
