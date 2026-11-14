import supertest from "supertest";
import app from "../src/app";
import { AppDataSource } from "../src/config/dataSource";

export const api = () => supertest(app)

export async function startDb() {
    // Confere a conexão real: os testes apagam todas as tabelas
    if(!String(AppDataSource.options.database).endsWith('_test')) {
        throw new Error('Os testes só rodam em bancos com nome terminado em _test')
    }

    if(!AppDataSource.isInitialized) await AppDataSource.initialize()
}

export async function clearDb() {
    const tables = AppDataSource.entityMetadatas.map(entity => `"${entity.tableName}"`)
    if(tables.length === 0) return

    await AppDataSource.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`)
}

export async function stopDb() {
    if(AppDataSource.isInitialized) await AppDataSource.destroy()
}
