// Carregado por --require no npm test, antes de qualquer módulo ler o .env.
// Aponta para o Postgres descartável do docker-compose.test.yml (porta 5434).
Object.assign(process.env, {
    NODE_ENV: 'test',
    PORT: '3999',
    DB_HOST: process.env.TEST_DB_HOST ?? '127.0.0.1',
    DB_PORT: process.env.TEST_DB_PORT ?? '5434',
    DB_USERNAME: process.env.TEST_DB_USERNAME ?? 'ubs',
    DB_PASSWORD: process.env.TEST_DB_PASSWORD ?? 'test',
    DB_NAME: process.env.TEST_DB_NAME ?? 'ubs_digital_test',
    JWT_SECRET: 'segredo-de-teste',
    JWT_EXPIRES_IN: '3600',
    CORS_ORIGINS: 'http://localhost:8081',
    LINK_BASE_URL: 'http://localhost:3999',
    TZ: 'America/Sao_Paulo',
    // Nos testes os jobs são disparados à mão
    JOBS_INTERVALO_MS: '0'
})
