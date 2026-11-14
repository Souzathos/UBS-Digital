import { AppError } from "./AppError";

export class NotFoundError extends AppError {
    constructor(message = 'Registro não encontrado') { super(message, 404) }
}
