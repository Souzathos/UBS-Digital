import "reflect-metadata";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { allowedOrigins } from "./config/cors";
import { env } from "./config/env";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

const app = express()

// Atrás de um proxy (deploy), sem isto todo mundo teria o mesmo IP
app.set('trust proxy', 1)

// upgrade-insecure-requests só em produção: em dev a página do link roda em http (localhost ou IP da rede)
app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null } } }))
app.use(cors({ origin: allowedOrigins() }))
app.use(express.json())
// Formulários da página do link (RN-70 a RN-73) são POST sem JavaScript
app.use(express.urlencoded({ extended: false }))
app.use(routes)
app.use(notFoundHandler)
app.use(errorHandler)

export default app
