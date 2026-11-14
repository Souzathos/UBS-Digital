import * as dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true })

// Fuso da aplicação. Os lembretes saem "na manhã do dia" (RN-10) em horário local,
// então o Node precisa interpretar datas neste fuso antes de qualquer Date ser criada.
process.env.TZ = process.env.TZ || 'America/Sao_Paulo'

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3333),
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().positive(),
    DB_USERNAME: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    DB_NAME: z.string().min(1),
    JWT_SECRET: z.string().min(1),
    // Em segundos
    JWT_EXPIRES_IN: z.coerce.number().int().positive().default(604800),
    CORS_ORIGINS: z.string().default(''),
    // Base dos links de ação (RN-73: domínio reconhecível para não parecer golpe)
    LINK_BASE_URL: z.string().min(1).default('http://localhost:3333'),
    // Tick dos jobs em desenvolvimento; 0 desliga (testes e endpoint /dev disparam à mão)
    JOBS_INTERVALO_MS: z.coerce.number().int().min(0).default(60000),
    // Push de verdade pelo serviço do Expo (RN-60, Camada 3). Desligado, o push vai para o mock como
    // os outros canais (testes e quem não quer mandar nada para fora).
    PUSH_EXPO: z.enum(['true', 'false']).default('false').transform(v => v === 'true')
})

const parsed = envSchema.safeParse(process.env)

if(!parsed.success) {
    const fields = parsed.error.issues.map(issue => issue.path.join('.')).join(', ')
    throw new Error(`Variáveis de ambiente ausentes ou inválidas: ${fields}`)
}

export const env = parsed.data
