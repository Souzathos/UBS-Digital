import type { Sessao } from "../utils/jwt";

declare global {
    namespace Express {
        interface Request {
            auth?: Sessao
        }
    }
}

export {}
