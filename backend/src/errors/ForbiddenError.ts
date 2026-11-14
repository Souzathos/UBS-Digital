import { AppError } from "./AppError";

export class ForbiddenError extends AppError {
    constructor(message = 'Sem permissão para esta ação') { super(message, 403) }
}
