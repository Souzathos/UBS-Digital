# Handoff: frontend do UBS Digital

Este documento é o ponto de partida do chat que vai arquitetar e construir o app. O backend da Camada 1 está pronto e testado: 97 testes, branch `feat/camada-1`. O app ainda não começou: `frontend/` é um projeto Expo 58 vazio.

## 1. Leia antes de qualquer coisa

1. **[`CLAUDE.md`](CLAUDE.md)**: stack, estrutura e regras de desenvolvimento do projeto.
2. **[`backend/docs/SPEC.md`](backend/docs/SPEC.md)**: as regras de negócio (RN-xx). As seções mais importantes para o front são:
   - **6 (Telas):** as telas previstas e as decisões de front.
   - **10 (Decisões tomadas):** o que já foi decidido.
   - **13 (Como rodar):** subir o backend e os logins do seed.
   - **14 (Contrato da API):** todas as rotas, corpos e respostas.
3. **[`frontend/AGENTS.md`](frontend/AGENTS.md)**: o Expo muda a cada versão. Antes de usar qualquer API do Expo ou do React Native, leia a documentação da versão instalada (`https://docs.expo.dev/versions/v58.0.0/`). Instale pacotes com `npx expo install`.
4. **`frontend/design/`**: as telas exportadas do Claude Design, com HTML e PNG de cada uma. São a referência visual de cada tela. Se a pasta não existir ou estiver incompleta, peça ao usuário para exportar antes de desenhar componentes.

## 2. Decisões já tomadas (não reabra sem o usuário pedir)

| Assunto | Decisão |
|---|---|
| Superfícies | Um único app React Native (Expo) com três perfis: **paciente**, **contato vinculado** (Camada 2) e **equipe da UBS** (o painel fica dentro do app, com login próprio) |
| Navegação | **Expo Router**, rotas em `frontend/src/app/`. Fora de `src/app/` fica o código que não é rota |
| Tema | **ThemeProvider próprio + hook `useTheme` + `StyleSheet`**, sem biblioteca de UI. Tokens de cor, fonte e espaço |
| Duas paletas | App do paciente claro; painel da equipe escuro (azul-marinho), como nas telas |
| Acessibilidade | Menu em todas as telas: **tamanho da letra** (Normal, Grande, Muito grande), **alto contraste**, **ler em voz alta** e **menos animação**. Tudo vem do tema (escala de fonte e paleta de alto contraste) e fica salvo no aparelho |
| Telas da Camada 2 | Construídas agora com **dados falsos atrás da mesma interface de serviço** usada pela API real, para trocar sem mexer nas telas quando o backend sair |
| Página do link | É **HTML servido pelo backend** (`backend/src/web/`), não faz parte do app. As telas "Página do link" do design servem de referência para um ajuste visual futuro desse HTML |
| Mensagens (WhatsApp, SMS, e-mail) | São **textos enviados pelo backend**, não telas do app. As telas de mensagem do design são referência de texto |

## 3. Regras de produto que o front não pode quebrar

- **Médico × Enfermagem (RN-06).** Todo atendimento é de um de dois tipos. A API usa `tipoAtendimento.categoria`:
  - **`CONSULTA`:** mostrar a etiqueta **"Médico"**. Os itens se chamam **consultas**.
  - **`PROCEDIMENTO`:** mostrar a etiqueta **"Enfermagem"**. Os itens se chamam **procedimentos**.
  - Para falar dos dois tipos ao mesmo tempo, usar "**atendimento**".
- **Médico pela rua (RN-06).** Consulta médica é sempre com o médico de referência da rua do paciente. O app não oferece escolha de médico. Mostrar "Seu médico: Dra. Helena (pela sua rua)" usando `paciente.medicoReferencia`. Paciente sem rua recebe 400 da API: mostrar a mensagem e orientar a procurar a recepção.
- **Selo e pontuação (RN-52, seção 6).** Nenhuma tela do paciente ou do contato mostra o selo de vulnerável nem a pontuação em número. Abaixo de 50 pontos, aparece só um aviso (Camada 2).
- **O que o contato vê (RN-57).** Só o nome do paciente, a UBS, a data e a hora. Nunca o tipo de atendimento.
- **Senha provisória.** Se `deveTrocarSenha` vier `true` no login, a única tela possível é "Crie sua senha". Todo o resto da API responde 403 até a troca.
- **Status sempre escrito.** Nunca indicar status só por cor.
- **Área de toque.** Pelo menos 48 × 48 pt.
- **Datas.** No formato "Qui, 10/12 · 9h". A API manda ISO em UTC; a exibição é no fuso de São Paulo.
- **Regra de negócio fica no backend.** A tela mostra o que a API devolve, por exemplo `acoes: { confirmar, cancelar, remarcar }` decide quais botões aparecem, e trata os erros 4xx exibindo `message`.

## 4. Inventário das telas e da API

"Pronta": a rota existe e está testada. "Dados falsos": depende da Camada 2 e ainda não existe no backend.

### App do paciente

| Tela | API | Estado |
|---|---|---|
| Entrar (CPF e senha) | `POST /auth/paciente/entrar` | Pronta |
| Crie sua senha | `POST /auth/paciente/trocar-senha` (use o token novo da resposta) | Pronta |
| Meus atendimentos, confirmado e histórico | `GET /agendamentos/meus` (`proximos` e `historico`, cada um com `acoes`) | Pronta |
| Agendar 1: Médico ou Enfermagem | `GET /tipos-atendimento` (agrupar por `categoria`) | Pronta |
| Agendar 2: qual consulta / qual procedimento | mesma lista, filtrada pela categoria | Pronta |
| Agendar 3: horário | `GET /slots?tipoAtendimentoId=` (a API já devolve só o médico da rua) | Pronta |
| Agendar 4: resumo e "Atendimento marcado" | `POST /agendamentos { slotId }` | Pronta |
| Erros: horário ocupado e "já tem Consulta clínica geral" | 409 do `POST /agendamentos` | Pronta |
| Remarcar | `GET /slots` + `POST /agendamentos/:id/remarcar { slotId }` | Pronta |
| Cancelar (com aviso) | `POST /agendamentos/:id/cancelar` | Pronta |
| Confirmar presença | `POST /agendamentos/:id/confirmar` | Pronta |
| Perfil (canais, seu médico, sair) | `GET /auth/eu` + `PATCH /auth/paciente/canais { canais }` | Pronta (tela pedida ao Claude Design por último) |
| Menu de acessibilidade | só no aparelho, sem API | — |
| "Avisos desta consulta" (linha do tempo D-14, D-7, D-3, D-0 no detalhe) | **não existe rota** (seria `GET /agendamentos/:id/avisos`) | Dados falsos. Avise o usuário que falta essa rota no backend |
| Cancelada sem resposta, 48h antes | Camada 2 (RN-26) | Dados falsos |
| Oferta de vaga mais cedo (Aceitar / Manter meu horário) | Camada 2 (RN-30 a RN-35) | Dados falsos |
| Ofertas e suplentes, aviso de pontuação | Camada 2 (RN-36, RN-40) | Dados falsos |

### Contato vinculado (Camada 2)

O perfil "Pessoas que acompanho" ainda não tem tela desenhada nem API. Fica para depois.

### Painel da equipe

| Tela | API | Estado |
|---|---|---|
| Entrar da equipe | `POST /auth/equipe/entrar` | Pronta |
| Agenda de hoje (filtros Todos, Médico, Enfermagem, Faltas) | `GET /equipe/agenda?data=&categoria=` + `POST /equipe/agendamentos/:id/presenca { resultado }` | Pronta. Contadores de "reaproveitadas" e a etiqueta "Encaixada" são da Camada 2 |
| Confirmar, cancelar e remarcar pelo painel | `POST /equipe/agendamentos/:id/confirmar`, `/cancelar`, `/remarcar` | Pronta |
| Pacientes (lista e busca) | `GET /pacientes?q=` | Pronta |
| Cadastrar paciente (médico pela rua) | `GET /ruas` + `POST /pacientes` | Pronta |
| Senha provisória gerada | resposta do `POST /pacientes` (`senhaProvisoria`, aparece só uma vez) | Pronta |
| Ficha do paciente | `GET /pacientes/:id`, `PATCH /pacientes/:id/endereco`, `POST /pacientes/:id/redefinir-senha` | Parcial: contato vinculado e selo são da Camada 2 (dados falsos); a pontuação já vem em `pontuacao` |
| Agendar pela recepção | `GET /pacientes?q=`, `GET /tipos-atendimento`, `GET /slots?tipoAtendimentoId=&pacienteId=`, `POST /equipe/agendamentos` | Pronta |
| Relógio de desenvolvimento | `GET /dev/relogio`, `POST /dev/relogio/avancar { dias, horas }`, `/zerar`, `GET /dev/envios` | Pronta (só fora de produção; tela pedida ao Claude Design por último) |
| Ofertas em andamento | Camada 2 | Dados falsos |
| Alertas de vulneráveis | Camada 2 (RN-27) | Dados falsos |

### Fora do app (referência apenas)

- **Página do link** (7 telas): HTML do backend.
- **Mensagens ao contato e lembrete do paciente pelo WhatsApp:** textos do backend.

## 5. Detalhes técnicos da API

- **Subir o backend.** Na raiz: `docker compose up -d`. Depois, em `backend`: `npm install`, `npm run seed -- --reset` e `npm run dev`. A API fica em `http://localhost:3333`.
- **Celular na mesma rede.** Use o IP da máquina, por exemplo `http://192.168.x.x:3333`. Defina por `EXPO_PUBLIC_API_URL`. O CORS só importa no Expo Web (porta 8081, já liberada).
- **Autenticação.** `Authorization: Bearer <token>`. O token tem 7 dias de validade. Guardar com segurança no aparelho (SecureStore). A sessão traz `tipo` (`PACIENTE` ou `EQUIPE`), `perfil` (`RECEPCAO`, `ACS` ou `GESTOR`) e `deveTrocarSenha`.
- **Erros.** Sempre `{ message }`. Erros de validação trazem também `errors: [{ campo, mensagem }]`. Os códigos usados são 400, 401, 403, 404 e 409, e o significado de cada um está na seção 14 do SPEC.
- **Perfis da equipe.**
  - O **ACS** vê a agenda, os pacientes e os alertas, mas não cadastra nem agenda. A API responde 403.
  - A **recepção** e o **gestor** fazem tudo.
- **Logins do seed.** A senha de todos é `123456`.

  | Quem | Login | Observação |
  |---|---|---|
  | Recepção | `recepcao@ubs.local` | |
  | ACS | `acs@ubs.local` | |
  | Gestor | `gestor@ubs.local` | |
  | Osvaldo Menezes | CPF `12345678909` | Rua das Flores, médica de referência Dra. Helena |
  | Fernanda | CPF `55566677720` | Ainda com senha provisória |
  | Rita Lima | CPF `66677788830` | Sem rua cadastrada |

  Os outros pacientes estão em `backend/src/seeds/dados/pacientes.ts`.
- **Relógio de desenvolvimento.** Avançar dias no `/dev/relogio/avancar` dispara os lembretes, que aparecem em `GET /dev/envios`. É o jeito de demonstrar o fluxo de 14 dias em minutos.

## 6. Como trabalhar (o mesmo processo do backend)

1. **Leia os arquivos da seção 1 e as telas em `frontend/design/`.**
2. **Proponha a arquitetura antes de codar e espere a aprovação do usuário.** A proposta precisa cobrir:
   - estrutura de pastas;
   - navegação por perfil (grupos de rotas para paciente e equipe, redirecionamento pela sessão e pela senha provisória);
   - camada de API tipada a partir da seção 14;
   - sessão e token;
   - ThemeProvider (paletas clara, escura e alto contraste, escala de fonte);
   - menu de acessibilidade;
   - como os dados falsos da Camada 2 ficam atrás da mesma interface;
   - ordem de implementação em partes, com as telas "Pronta" primeiro.
3. **Faça as suas perguntas antes de começar.** O usuário prefere ser consultado em decisões reais.
4. **Commits.** Um commit por parte, em pt-BR, citando a RN quando a tela aplica uma regra. Sem push até o usuário pedir. Pergunte em qual branch trabalhar.
5. **Ao fechar cada parte,** atualize a seção 6 do SPEC (estado do front) e o `CLAUDE.md`.
6. **Não mexa no backend sem pedido.** Se faltar uma rota, como a de avisos por agendamento, liste para o usuário em vez de criar.
7. **Explique os mecanismos novos.** O usuário gosta de entender como as peças não óbvias foram feitas, por exemplo tema, navegação por perfil e dados falsos. Explique ao fechar cada parte. Responda sempre em português.
