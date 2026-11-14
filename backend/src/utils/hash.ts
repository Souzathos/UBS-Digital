import bcrypt from "bcryptjs";

// Custo baixo nos testes para não gastar segundos em hash a cada cenário
const ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 10

export function gerarHash(texto: string) {
    return bcrypt.hash(texto, ROUNDS)
}

export function compararHash(texto: string, hash: string) {
    return bcrypt.compare(texto, hash)
}
