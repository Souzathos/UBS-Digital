import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Onde o token da sessão fica guardado. No celular, no SecureStore (Keychain no iOS, Keystore no
// Android). No Expo Web o SecureStore não existe, então vai para o localStorage do navegador —
// aceitável para testar no computador, não para produção web.

const CHAVE = 'ubs.token'

export async function lerToken(): Promise<string | null> {
    try {
        if (Platform.OS === 'web') return globalThis.localStorage?.getItem(CHAVE) ?? null
        return await SecureStore.getItemAsync(CHAVE)
    } catch {
        return null
    }
}

export async function gravarToken(token: string): Promise<void> {
    if (Platform.OS === 'web') {
        globalThis.localStorage?.setItem(CHAVE, token)
        return
    }
    await SecureStore.setItemAsync(CHAVE, token)
}

export async function apagarToken(): Promise<void> {
    try {
        if (Platform.OS === 'web') {
            globalThis.localStorage?.removeItem(CHAVE)
            return
        }
        await SecureStore.deleteItemAsync(CHAVE)
    } catch {
        // Nada a fazer: se não havia token, a sessão já está limpa.
    }
}
