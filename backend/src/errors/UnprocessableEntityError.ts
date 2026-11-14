import { AppError } from "./AppError";

export class UnprocessableEntityError extends AppError {
    constructor(message = 'Não foi possível processar') { super(message, 422) }
}
