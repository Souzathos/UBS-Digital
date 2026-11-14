<p align="center">
  <img src="frontend/assets/imagens/logo-completa.png" alt="UBS São Leopoldo · Agora é Digital" width="320">
</p>

# UBS São Leopoldo · Agora é Digital

Sistema para reduzir faltas em consultas e procedimentos da Atenção Primária à Saúde (APS).

Quando o paciente falta, o cuidado dele fica interrompido e a vaga não serve para mais ninguém. As causas mais comuns são esquecimento, dificuldade de comunicação e falta de acesso à informação. O sistema:

- **lembra o paciente** várias vezes antes do atendimento (D-14, D-7, D-3 e no próprio dia);
- **deixa confirmar, cancelar ou remarcar com um toque**, pelo app ou por um link que abre no navegador, sem instalar nada;
- **reaproveita cada vaga liberada**, oferecendo o horário a outro paciente compatível;
- **alcança quem não tem celular ou internet** por um contato vinculado (alguém que acompanha o paciente) ou pela equipe da UBS.

### Princípios

- Nenhuma regra tira do paciente o direito à consulta normal. Punições só afetam benefícios extras.
- Pacientes marcados como vulneráveis nunca são penalizados nem perdem a vaga automaticamente.
- Todo número (prazos, pontos, limites) é configurável por UBS, nunca fixo no código.

## Quem usa

| Perfil | Onde | O que faz |
|---|---|---|
| Paciente | App e página do link | Agenda, confirma, cancela, remarca, aceita uma vaga mais cedo |
| Contato vinculado | App e página do link | Recebe os avisos do paciente e responde em nome dele |
| Recepção | Painel da equipe (no app) | Cadastra pacientes, agenda, registra presença ou falta, marca vulneráveis |
| ACS | Painel da equipe | Recebe alertas de vulneráveis sem resposta e faz o contato presencial |
| Gestor | Painel da equipe | Configura tipos de atendimento, prazos, pontuação e cota da agenda |

Médicos fazem **consultas**, sempre com o médico de referência da rua do paciente. A enfermagem faz **procedimentos**, que não dependem da rua.

## Arquitetura

```
┌──────────────────────────┐        ┌──────────────────────────────────────┐
│ App Expo (React Native)  │  HTTP  │ API Node + Express                   │
│ paciente · contato ·     │ ─────▶ │ regras de negócio (services/)        │
│ painel da equipe         │        │ jobs sobre um relógio injetável      │──▶ PostgreSQL
└──────────────────────────┘        │ notificações: push Expo + mocks      │
┌──────────────────────────┐        │ página do link (HTML leve)           │
│ Navegador (link da msg)  │ ─────▶ │                                      │
└──────────────────────────┘        └──────────────────────────────────────┘
```

| Camada | Tecnologia |
|---|---|
| Backend | Node 24 · TypeScript · Express 5 · TypeORM (com migrations) · PostgreSQL 17 · Zod · JWT + bcryptjs |
| App | Expo 58 · React Native 0.88 · Expo Router · TanStack Query · tema próprio (claro, escuro e alto contraste) |
| Testes | `node:test` + supertest no backend (Postgres descartável em Docker) · `jest-expo` no app |

## Estrutura do repositório

```
.
├── docker-compose.yml       Postgres de desenvolvimento (porta 5433)
├── backend/
│   ├── docs/SPEC.md         especificação: regras (RN-xx), modelo, decisões, estado, contrato da API
│   ├── src/                 API, jobs, notificações, página do link, migrations e seed
│   └── tests/               testes de integração (os nomes citam a regra RN-xx)
└── frontend/
    ├── design/              telas de referência (protótipos HTML) + INDEX.md
    └── src/                 app Expo: rotas, serviços, tema, acessibilidade, componentes
```

## Como rodar

**Pré-requisitos:** Node 24 (mínimo 22.13), Docker e, para o app no celular, o Expo Go.

### Backend

```bash
docker compose up -d          # Postgres de dev na porta 5433
cd backend
cp .env.example .env          # só na primeira vez; troque o JWT_SECRET
npm install
npm run dev                   # API em http://localhost:3333 (aplica as migrations pendentes)
npm run seed                  # dados de demonstração (npm run seed -- --reset recria tudo)
```

### App

```bash
cd frontend
cp .env.example .env          # EXPO_PUBLIC_API_URL; no celular, use o IP da máquina na rede
npm install
npx expo start                # i = iOS, a = Android, w = navegador
```

### Logins de demonstração (criados pelo seed)

| Quem | Login | Senha |
|---|---|---|
| Recepção | `recepcao@ubs.local` | `123456` |
| ACS | `acs@ubs.local` | `123456` |
| Gestor | `gestor@ubs.local` | `123456` |
| Paciente | CPF `12345678909` (Osvaldo Menezes) | `123456` |

Os outros pacientes estão em [`backend/src/seeds/dados/pacientes.ts`](backend/src/seeds/dados/pacientes.ts).

### Simular o tempo

Os lembretes e prazos dependem de datas. Fora de produção, a equipe tem um **relógio de testes** no app (e as rotas `/dev/relogio/*` na API) para avançar dias e ver na caixa de saída as mensagens que seriam enviadas. O roteiro completo está na seção 13 do [SPEC](backend/docs/SPEC.md#13-como-rodar).

## Testes

```bash
# backend: usa um Postgres descartável na porta 5434, nunca o banco de dev
cd backend
npm run test:db
npm run typecheck && npm test
npm run test:db:stop

# app
cd frontend
npm run typecheck && npm run lint && npm test
```

## Estado do projeto

O escopo está dividido em camadas, implementadas em ordem.

| Camada | Conteúdo | Estado |
|---|---|---|
| 1 · Núcleo | Agendamento com cota, lembretes D-14/D-7/D-3/D-0, link de ação, confirmar/cancelar/remarcar, presença | ✅ Pronta e testada |
| 2 · Diferenciais | Cancelamento por falta de resposta, oferta de vaga mais cedo em cascata, pontuação, selo de vulnerável, contato vinculado | 🟡 Telas prontas com dados falsos; backend não iniciado |
| 3 · Canais | Push, WhatsApp, SMS, e-mail e escalonamento entre canais | 🟡 Push pelo Expo pronto; demais canais em mock |
| 4 · Extras | Pré-aviso, lista de suplentes, preparo de exames, indicadores | ⬜ Não iniciada |

O app já tem todas as telas do design, com acessibilidade (letra grande, alto contraste, leitura da tela em voz alta). As telas da Camada 2 usam dados falsos atrás de interfaces de serviço e passam a usar a API real trocando uma linha em [`frontend/src/servicos/index.ts`](frontend/src/servicos/index.ts).

Fora do escopo por enquanto: integração com o e-SUS APS ou a agenda do município.

## Documentação

- [`backend/docs/SPEC.md`](backend/docs/SPEC.md): fonte da verdade do produto. Regras de negócio, modelo de dados, configurações, decisões, estado da implementação, mapa regra → código e contrato da API.
- [`CLAUDE.md`](CLAUDE.md): convenções de desenvolvimento.
- [`frontend/design/INDEX.md`](frontend/design/INDEX.md): índice das telas de referência.
- [`frontend/AGENTS.md`](frontend/AGENTS.md): cuidados com a versão do Expo.

## Como contribuir

As regras completas estão no [`CLAUDE.md`](CLAUDE.md). As principais:

1. Regra de negócio fica só em `backend/src/services/`. Rotas, controllers e telas apenas traduzem e mostram.
2. Horário sempre pelo `Clock` injetável, nunca `new Date()` direto (um teste verifica).
3. Valores configuráveis vêm da tabela `Configuracao`, nunca fixos no código.
4. Migrations são imutáveis: para mudar o schema, crie uma nova.
5. Cite a regra (`RN-xx`) no commit e no nome do teste.
6. Mensagens de erro são para o usuário final, em português.
