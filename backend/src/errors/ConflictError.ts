import { AppError } from "./AppError";

export class ConflictError extends AppError {
    constructor(message = 'Conflito com o estado atual') { super(message, 409) }
}
