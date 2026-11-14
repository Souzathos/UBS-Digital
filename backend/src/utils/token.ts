import { createHash, randomBytes, randomInt } from "node:crypto";

// RN-70: token aleatório do link de ação; só o hash vai para o banco
export function gerarTokenAleatorio() {
    return randomBytes(24).toString('base64url')
}

export function hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
}

// Senha provisória que a recepção entrega ao paciente no cadastro (seção 6)
export function gerarSenhaProvisoria() {
    return String(randomInt(0, 1_000_000)).padStart(6, '0')
}
