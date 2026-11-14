import * as Speech from 'expo-speech'
import { useCallback, useEffect, useState } from 'react'

// "Ouvir esta tela": lê em voz alta um resumo da tela, montado pela própria tela com os mesmos
// rótulos e datas por extenso que o leitor de tela usa. Funciona sem VoiceOver ou TalkBack, para
// quem não usa leitor de tela mas tem dificuldade de leitura.

const OPCOES = { language: 'pt-BR', rate: 0.9 } as const

export function useFala() {
    const [lendo, setLendo] = useState(false)

    const parar = useCallback(() => {
        Speech.stop()
        setLendo(false)
    }, [])

    const falar = useCallback((texto: string) => {
        Speech.stop()
        setLendo(true)
        Speech.speak(texto, {
            ...OPCOES,
            onDone: () => setLendo(false),
            onStopped: () => setLendo(false),
            onError: () => setLendo(false)
        })
    }, [])

    // Sair da tela interrompe a fala.
    useEffect(() => () => {
        Speech.stop()
    }, [])

    return { lendo, falar, parar }
}
