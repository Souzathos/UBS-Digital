import { env } from "./config/env";
import { AppDataSource } from "./config/dataSource";
import app from "./app";
import { jobRunner } from "./jobs";

AppDataSource.initialize()
    .then(() => {
        console.log('Banco conectado')

        app.listen(env.PORT, () => {
            console.log(`Servidor rodando na porta ${env.PORT}`)
        })

        // Agendador de jobs (lembretes etc.), rodando sobre o Clock injetável (RN-90)
        jobRunner.iniciar(env.JOBS_INTERVALO_MS)
        if(env.JOBS_INTERVALO_MS > 0) console.log(`Jobs a cada ${env.JOBS_INTERVALO_MS / 1000}s: ${jobRunner.nomes.join(', ') || '(nenhum)'}`)
    })
    .catch((error) => {
        console.error('Falha ao iniciar o servidor:', error)
        process.exit(1)
    })
