import { useEffect, useState } from 'react'

// Hora do aparelho que se atualiza sozinha (contagem regressiva de prazo). Ler Date.now() direto
// na renderização deixaria a tela inconsistente entre um desenho e outro.
export function useAgoraLocal(intervaloMs = 30_000): number {
    const [agora, setAgora] = useState(() => Date.now())
    useEffect(() => {
        const t = setInterval(() => setAgora(Date.now()), intervaloMs)
        return () => clearInterval(t)
    }, [intervaloMs])
    return agora
}
