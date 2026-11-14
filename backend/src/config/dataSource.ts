import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./env";
import { entidades } from "../models";
import { SchemaInicial1794618432397 } from "../migrations/1794618432397-SchemaInicial";
import { CategoriaRuas1794628292790 } from "../migrations/1794628292790-CategoriaRuas";

// Entidades e migrations entram aqui conforme as partes são implementadas (ver docs/SPEC.md).
// synchronize fica sempre desligado: toda mudança de schema é uma migration nova.
export const AppDataSource = new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    entities: entidades,
    migrations: [SchemaInicial1794618432397, CategoriaRuas1794628292790],
    migrationsRun: true,
    synchronize: false,
    logging: false
})
