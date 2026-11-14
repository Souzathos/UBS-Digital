import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

// RN-90: o relógio ajustável e o disparo manual dos jobs nunca ficam expostos em produção
export function apenasDev(_req: Request, res: Response, next: NextFunction) {
    if(env.NODE_ENV === 'production') return res.status(404).json({ message: 'Rota não encontrada' })
    return next()
}
