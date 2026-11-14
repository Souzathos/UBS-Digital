import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./env";

// Entidades e migrations entram aqui conforme as partes são implementadas (ver docs/SPEC.md).
// synchronize fica sempre desligado: toda mudança de schema é uma migration nova.
export const AppDataSource = new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    entities: [],
    migrations: [],
    migrationsRun: true,
    synchronize: false,
    logging: false
})
