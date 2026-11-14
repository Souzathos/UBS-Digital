import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { Platform } from 'react-native'

import { chaves, queryClient } from '@/api/consultas'
import { servicos } from '@/servicos'

// Push do paciente (RN-60). O backend manda os lembretes pelo serviço de push do Expo para o token
// que este aparelho registra aqui. No Expo Go funciona no iPhone; no Android precisa de um build
// de desenvolvimento (limitação do Expo a partir do SDK 53).

// Com o app aberto, a notificação também aparece como banner. Na web não há push: nada a fazer.
if (Platform.OS !== 'web') {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true
        })
    })
}

// Pede permissão e devolve o ExpoPushToken, ou null quando não dá (web, permissão negada, sem
// projectId do EAS). Nunca lança: o app funciona normalmente sem push.
export async function obterTokenDePush(): Promise<string | null> {
    if (Platform.OS === 'web') return null
    try {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('lembretes', {
                name: 'Lembretes de consulta',
                // O enum é exportado pelo pacote (export *); a regra import/namespace não segue esse caminho.
                // eslint-disable-next-line import/namespace
                importance: Notifications.AndroidImportance.HIGH
            })
        }
        const atual = await Notifications.getPermissionsAsync()
        const status = atual.status === 'granted' ? atual.status : (await Notifications.requestPermissionsAsync()).status
        if (status !== 'granted') return null

        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
        if (!projectId) {
            console.warn('[push] Sem projectId do EAS em app.json: rode "npx eas-cli init" para ativar o push.')
            return null
        }
        return (await Notifications.getExpoPushTokenAsync({ projectId })).data
    } catch (erro) {
        console.warn('[push] Não foi possível obter o token:', erro)
        return null
    }
}

// Na área do paciente: registra o token no backend e, ao tocar numa notificação de lembrete,
// abre o atendimento dela (com a lista já atualizada).
export function usePushDoPaciente() {
    useEffect(() => {
        // Na web as APIs de notificação não existem (o Expo lança erro ao chamá-las).
        if (Platform.OS === 'web') return
        let ativo = true
        obterTokenDePush().then(token => {
            if (ativo && token) servicos.auth.registrarPush(token).catch(e => console.warn('[push] Não foi possível registrar o token:', e))
        })

        function abrir(notificacao: Notifications.Notification) {
            const id = notificacao.request.content.data?.agendamentoId
            queryClient.invalidateQueries({ queryKey: chaves.meusAtendimentos })
            if (typeof id === 'number') router.push({ pathname: '/paciente/atendimento/[id]', params: { id: String(id) } })
            Notifications.clearLastNotificationResponse()
        }

        // App aberto pela notificação (estava fechado)
        const ultima = Notifications.getLastNotificationResponse()
        if (ultima?.notification) abrir(ultima.notification)

        const toque = Notifications.addNotificationResponseReceivedListener(r => abrir(r.notification))
        // Chegou com o app aberto: atualiza a lista (o lembrete pode ter mudado o estado da tela).
        const chegada = Notifications.addNotificationReceivedListener(() => queryClient.invalidateQueries({ queryKey: chaves.meusAtendimentos }))

        return () => {
            ativo = false
            toque.remove()
            chegada.remove()
        }
    }, [])
}
