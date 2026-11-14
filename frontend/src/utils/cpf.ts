// Máscara do CPF enquanto a pessoa digita. A validação (dígitos verificadores) é do backend:
// o app só formata, e a API aceita o CPF com ou sem máscara.

export function somenteDigitos(texto: string): string {
    return texto.replace(/\D/g, '')
}

// "12345678909" → "123.456.789-09"; aceita entrada parcial ("1234" → "123.4")
export function mascararCpf(texto: string): string {
    const d = somenteDigitos(texto).slice(0, 11)
    if (d.length <= 3) return d
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function cpfCompleto(texto: string): boolean {
    return somenteDigitos(texto).length === 11
}
