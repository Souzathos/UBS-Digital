# UBS Digital — sistema de redução de faltas na APS

> **Leia primeiro:** [`backend/docs/SPEC.md`](backend/docs/SPEC.md). Lá estão as regras de negócio (RN-xx), o modelo de dados, as configurações, as decisões já tomadas, o estado da implementação e o mapa RN → código. É a fonte da verdade do produto; este arquivo só resume stack e convenções.

## O que é

Backend Node + TypeScript + Express que lembra o paciente de consultas e exames da UBS em várias etapas (D-14, D-7, D-3, D-0), deixa confirmar, cancelar ou remarcar pelo app ou por um link sem instalação, e reaproveita cada vaga liberada. O app React Native (Expo) para paciente, contato vinculado e equipe da UBS **ainda não começou**. O trabalho do front começa por um novo chat a partir de [`HANDOFF-FRONTEND.md`](HANDOFF-FRONTEND.md); as telas desenhadas ficam em `frontend/design/`.

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Node 24 · TypeScript · Express 5 · TypeORM (migrations, nunca `synchronize`) · PostgreSQL 17 · Zod · JWT + bcryptjs |
| Testes | `node:test` + supertest, banco descartável em Docker (`backend/docker-compose.test.yml`, porta 5434) |
| Infra dev | `docker-compose.yml` na raiz: Postgres na porta **5433** (a 5432 é de outro projeto nesta máquina) |
| App (a começar) | Expo 58 / React Native com Expo Router (`frontend/AGENTS.md`); ThemeProvider próprio + `useTheme` + StyleSheet; telas em `frontend/design/`; ver `HANDOFF-FRONTEND.md` |

## Estrutura do backend

```
backend/
├── docs/SPEC.md        regras, modelo, decisões, estado, mapa RN → código
├── src/
│   ├── server.ts       sobe o banco, o servidor e o relógio dos jobs
│   ├── app.ts          express + middlewares + rotas + errorHandler
│   ├── config/         env.ts (Zod, TZ) · dataSource.ts (TypeORM) · cors.ts
│   ├── models/         entidades TypeORM, nomes em português como na spec
│   ├── migrations/     imutáveis: nunca edite, crie outra
│   ├── seeds/          seed.ts + dados/ (1 UBS, equipe, profissionais, tipos, slots, pacientes, Configuracao)
│   ├── routes/         uma por recurso; só liga middleware → controller
│   ├── controllers/    classes; só traduzem HTTP ↔ service
│   ├── dtos/           schemas Zod por domínio
│   ├── mappers/        o que cada destinatário pode ver (RN-52, RN-57)
│   ├── services/       TODA regra de negócio mora aqui
│   ├── clock/          Clock injetável (RN-90): SystemClock em produção, AdjustableClock fora dela
│   ├── jobs/           runner + jobs que rodam sobre o Clock (lembretes, prazos, ofertas)
│   ├── notifications/  interface CanalAdapter + adaptadores (mock até integrar push/WhatsApp/SMS/e-mail)
│   ├── web/            página do link de ação: HTML puro, sem JavaScript pesado
│   ├── middlewares/    auth, perfil, validação Zod, errorHandler, apenasDev
│   ├── errors/         AppError + subclasses (mensagens em pt-BR para o usuário)
│   └── utils/          jwt, hash, cpf, datas, token
└── tests/              *.test.ts; os nomes dos testes citam o RN-xx
```

## Regras de desenvolvimento (obrigatórias)

1. **Regra de negócio só em `src/services/`.** Rotas e controllers traduzem HTTP; telas só mostram.
2. **Horário sempre pelo `Clock` injetável** (`src/clock`). Nunca `new Date()` sem argumento nem `Date.now()` em `services/`, `jobs/` e `web/`: um teste varre o código e falha (RN-90).
3. **Valores da seção 7 da spec vêm da tabela `Configuracao`** via `ConfiguracaoService`, com padrão global e sobrescrita por UBS. Nada fixo no código; o seed grava os padrões.
4. **Cite o `RN-xx`** no commit e no nome do teste de tudo que implementa ou altera uma regra.
5. **Itens `[sugestão]` ou da seção 9 da spec ainda não decididos: pergunte antes de implementar.** Os já decididos estão em "Decisões tomadas" no SPEC.md.
6. **Migrations são imutáveis.** Mudou o schema, crie outra migration.
7. **Mensagens de erro são para o usuário final**, em pt-BR, dentro de `AppError`.
8. **Antes de mudar uma regra que já existe:** escreva o teste do comportamento atual, veja passar, altere, classifique cada falha (esperada × regressão), e só então atualize o teste.
9. **Ao fechar uma parte**, atualize no SPEC.md o estado da implementação e o mapa RN → código.
10. **Nomes:** domínio em português (como a spec: `Agendamento`, `confirmar`, `Slot`); infraestrutura em inglês (`Clock`, `jwt`, `errorHandler`).

## Comandos

```bash
docker compose up -d                 # Postgres de dev (raiz do repo)
cd backend
cp .env.example .env                 # primeira vez
npm install
npm run dev                          # sobe a API (roda as migrations pendentes ao iniciar)
npm run seed                         # dados de demonstração (não roda em produção)
npm run typecheck                    # tsc --noEmit em src/ e tests/
npm run test:db && npm test          # testes no Postgres descartável (5434)
npm run test:db:stop
npm run migration:generate -- src/migrations/NomeDaMigration
```

Nunca rode `npm test` apontando para o banco de desenvolvimento: o harness recusa bancos cujo nome não termina em `_test`.

## Estado

**Camada 1 concluída em 13/11/2026 e ajustada às telas em 14/11** (branch `feat/camada-1`, 97 testes). O que existe, onde está cada regra e o contrato da API para o app estão no SPEC.md (seções 11, 12 e 14).

- **Modelo de atendimento (RN-06):** Médico faz **consultas** (`CONSULTA`), sempre com o médico de referência da rua do paciente. Enfermagem faz **procedimentos** (`PROCEDIMENTO`), que não dependem da rua.
- **Próximo passo do backend:** a Camada 2, que começa pelos pontos de extensão `AgendamentoService.aoLiberarVaga` e `PresencaService.aoRegistrarPresenca`. Falta decidir a RN-56.
- **Próximo passo do front:** `HANDOFF-FRONTEND.md`.

## Git

Branch de trabalho: `feat/camada-1`. Um commit por parte do plano, com o RN-xx na mensagem. Sem push até o usuário pedir.
