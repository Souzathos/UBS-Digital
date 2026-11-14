// Erro esperado: a mensagem é segura para mostrar ao usuário final (sempre em pt-BR)
export abstract class AppError extends Error {
    constructor(
        message: string,
        readonly statusCode: number
    ) {
        super(message)
        Object.setPrototypeOf(this, new.target.prototype)
    }
}
