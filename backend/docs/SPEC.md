# Especificação — Sistema de redução de faltas na APS

> Fonte: PDF "Especificação — Sistema de redução de faltas na APS" (13/11/2026, Athos), transcrito para Markdown.
> **Para o próximo chat:** leia as seções **10 (Decisões tomadas)**, **11 (Estado da implementação)** e **12 (Mapa RN → código)** antes de mexer no código. As convenções de desenvolvimento estão no [`CLAUDE.md`](../../CLAUDE.md) da raiz.

---

## 1. Contexto e objetivo

O sistema reduz faltas em consultas e exames na Atenção Primária à Saúde (APS). Ele lembra o paciente em várias etapas, deixa confirmar, cancelar ou remarcar com um toque e reaproveita automaticamente cada vaga liberada.

**Problema (desafio):** o não comparecimento compromete a continuidade do cuidado e tira vagas de quem precisa. As causas citadas são esquecimento, dificuldade de comunicação e barreiras de acesso à informação. A solução deve usar tecnologia e comunicação acessível para reduzir faltas, facilitar confirmação, cancelamento e remarcação, e melhorar a organização das agendas.

**Princípios que guiam as regras:**

- Nenhuma regra tira do paciente o direito à consulta normal. Punições só afetam benefícios extras.
- Quem não tem celular ou internet é alcançado por outra pessoa (contato vinculado) ou pela equipe da UBS.
- Pacientes marcados como vulneráveis nunca são penalizados nem perdem a vaga automaticamente.
- Toda regra numérica (prazos, pontos, limites) é configurável, não fixa no código.

## 2. Atores e arquitetura

O sistema tem um backend único em Node.js + TypeScript + Express, um app nativo em React Native para pacientes e contatos vinculados, um painel para a equipe da UBS e uma página web leve de confirmação acessada por link.

### Atores

| Ator | Onde usa | O que faz |
|---|---|---|
| Paciente | App React Native e página do link | Agenda (tipos liberados), confirma, cancela, remarca, aceita adiantamento, entra na lista de suplentes |
| Contato vinculado | App React Native (perfil "pessoas que acompanho") e página do link | Recebe as notificações do paciente, repassa pessoalmente e responde em nome dele |
| Recepção | Painel da UBS | Cadastra pacientes e contatos, agenda, registra comparecimento ou falta, atribui o selo de vulnerável, trata alertas |
| ACS (Agente Comunitário de Saúde) | Painel da UBS | Recebe alertas de pacientes vulneráveis sem resposta e faz o contato presencial |
| Gestor | Painel da UBS | Configura tipos de atendimento, prazos, pontuação e cota da agenda para o app |

### Componentes

1. **API (Express):** regras de negócio, autenticação, endpoints do app e do painel.
2. **Agendador de jobs:** dispara lembretes, verifica prazos sem resposta, expira ofertas de adiantamento e escalona canais. Roda sobre um relógio injetável (RN-90).
3. **Serviço de notificações:** uma interface única com um adaptador por canal (push via FCM, WhatsApp, SMS, e-mail). Canais ainda não integrados usam um adaptador mock que só registra o envio.
4. **Página do link:** HTML leve servido pelo próprio Express, sem instalação, com os botões Confirmar, Cancelar e Remarcar.
5. **App React Native:** perfis paciente e contato vinculado no mesmo app.
6. **Painel da UBS:** dentro do app React Native, em um perfil de equipe com login próprio. É a escolha para a apresentação e pode migrar para web depois.

## 3. Regras de negócio

Cada regra tem um código (RN-xx) para ser citada no código, nos testes e nos commits. Regras marcadas **[sugestão]** não foram discutidas pelo time e podem ser trocadas (ver seção 10 para as já confirmadas). Valores entre parênteses são padrões configuráveis (seção 7).

### 3.1 Agendamento

- **RN-01** A recepção agenda qualquer tipo de atendimento pelo painel. O paciente agenda pelo app só os tipos com `permiteAgendamentoApp = true`.
- **RN-02** Uma parte da agenda de cada profissional fica reservada para o app (40%). O app só enxerga slots dessa cota. A recepção enxerga e usa todos.
- **RN-03** A antecedência máxima é definida por tipo de atendimento (consulta na UBS: 60 dias; exames: 60 dias até o time definir outro valor).
- **RN-04** [sugestão, **confirmada**] O paciente tem no máximo 1 agendamento ativo por tipo de atendimento. Evita que alguém segure várias vagas.
- **RN-05** [sugestão, **confirmada**] Agendamento criado com menos de 3 dias de antecedência já nasce `CONFIRMADO`.
- **RN-06** [**decidida em 14/11**] Todo atendimento é de um de dois tipos: **Médico**, cujos itens são **consultas** (categoria `CONSULTA`), ou **Enfermagem**, cujos itens são **procedimentos** (categoria `PROCEDIMENTO`). Consulta médica é sempre com o **médico de referência da rua do paciente**, pelo app, pela recepção e na remarcação; nem o paciente nem a recepção escolhem o médico. Paciente sem rua cadastrada não agenda consulta médica. Procedimentos de enfermagem não dependem da rua: cada procedimento tem seus profissionais.

### 3.2 Lembretes

- **RN-10** Cada agendamento gera até 4 lembretes: D-14, D-7 e D-3 com ação (confirmar, cancelar, remarcar) e D-0, na manhã do dia, só para lembrar.
- **RN-11** [sugestão, **confirmada**] Etapas cuja data já passou no momento do agendamento são puladas. Exemplo: agendado 5 dias antes recebe só D-3 e D-0.
- **RN-12** Depois que o agendamento está `CONFIRMADO`, os lembretes seguintes são informativos: mostram Cancelar e Remarcar, mas não exigem resposta. As regras de "sem resposta" (RN-25 e RN-26) só valem para agendamentos `PENDENTE`.
- **RN-13** Se o tipo de atendimento tiver instruções de preparo (por exemplo, jejum), elas vão em todos os lembretes.

### 3.3 Ações do paciente

- **RN-20** Confirmar muda o status para `CONFIRMADO`.
- **RN-21** Cancelar é permitido a qualquer momento antes do horário, inclusive depois de confirmar, sem perder pontos. A vaga entra no fluxo de adiantamento (RN-30).
- **RN-22** Remarcar é uma troca direta: o paciente escolhe um slot livre do mesmo tipo de atendimento, dentro da antecedência máxima. O sistema cria um novo agendamento `CONFIRMADO` com `remarcadoDeId` apontando para o antigo, marca o antigo como `REMARCADO` e manda a vaga antiga para o fluxo de adiantamento (RN-30).

### 3.4 Sem resposta

- **RN-25** Se o paciente não responder a notificação D-7 até o envio da D-3, o próximo paciente compatível (mesmos critérios da RN-31) recebe um pré-aviso: "sua consulta pode ser adiantada". O pré-aviso não reserva nada.
- **RN-26** Se o paciente não responder a notificação D-3 até o prazo (48h antes da consulta), o agendamento vira `CANCELADO_AUTO` e a vaga entra no fluxo de adiantamento (RN-30).
- **RN-27** Exceção à RN-26: paciente com selo de vulnerável nunca tem cancelamento automático. No lugar, o sistema cria um alerta para a recepção e o ACS, e o agendamento continua `PENDENTE`.

### 3.5 Adiantamento e suplentes

- **RN-30** Toda vaga liberada (cancelamento, remarcação, cancelamento automático) abre uma oferta de adiantamento, desde que falte mais de 1h para o horário.
- **RN-31** Os candidatos são, nesta ordem: (a) pacientes com agendamento ativo (`PENDENTE` ou `CONFIRMADO`) do mesmo tipo de atendimento, na mesma UBS, com data posterior à vaga, do mais próximo ao mais distante; (b) pacientes na lista de suplentes desse tipo, por ordem de entrada. Só entra quem tem pontuação ≥ 50 ou selo de vulnerável.
- **RN-32** O prazo para aceitar depende de quanto falta para a vaga: mais de 3 dias, 24h; de 1 a 3 dias, 4h; menos de 24h, 1h. Nessa última faixa, a oferta vai ao mesmo tempo para os 5 primeiros candidatos e quem aceitar primeiro leva.
- **RN-33** Fora da faixa de menos de 24h, as ofertas são enviadas uma por vez, no máximo 5 candidatos. Se nenhum aceitar, a vaga volta para a agenda livre.
- **RN-34** Ao aceitar, o agendamento do candidato é movido para a vaga (mesmo efeito da RN-22). A vaga antiga dele entra em uma nova oferta (cascata).
- **RN-35** Recusar ou deixar expirar não tem penalidade.
- **RN-36** O paciente pode entrar na lista de suplentes de um tipo de atendimento ("quero ser avisado se abrir vaga antes").

### 3.6 Pontuação

| Evento | Pontos |
|---|---|
| Valor inicial | 100 (máximo 100) |
| Estava `CONFIRMADO` e faltou | −30 |
| Compareceu | +10 |
| Cancelou ou remarcou | 0 |
| Cancelamento automático | 0 |

- **RN-40** Abaixo de 50 pontos, o paciente perde acesso às ofertas de adiantamento e à lista de suplentes. A vaga normal nunca é afetada.
- **RN-41** Paciente com selo de vulnerável nunca perde pontos.
- **RN-42** Toda mudança gera um registro em `EventoPontuacao` (motivo e agendamento de origem).

### 3.7 Selo de vulnerável

- **RN-50** Só a equipe da UBS atribui ou remove o selo. O sistema registra quem fez e quando.
- **RN-51** Efeitos: não perde pontos (RN-41) e não tem cancelamento automático (RN-27).
- **RN-52** O selo aparece só no painel da UBS. Nunca aparece no app, na página do link nem para o contato vinculado.

### 3.8 Contato vinculado

- **RN-55** O paciente pode ter vários contatos vinculados (parentes ou pessoas próximas). Cada um registra a relação e o consentimento do paciente (data e forma).
- **RN-56** [sugestão, **em aberto**] O contato recebe as notificações quando o paciente não tem canal próprio ou quando o vínculo está marcado com `recebeNotificacoes = true`.
- **RN-57** A mensagem ao contato traz só o nome do paciente, a UBS, a data e a hora. Não traz tipo de atendimento nem especialidade.
- **RN-58** O contato pode confirmar, cancelar ou remarcar em nome do paciente. A ação fica registrada com o autor.

### 3.9 Canais de notificação

- **RN-60** Ordem de tentativa: push (se o app estiver instalado e o token for válido), depois WhatsApp, depois SMS. O e-mail é enviado junto como registro e não entra no escalonamento.
- **RN-61** Se a entrega falhar ou não houver resposta em 12h, o sistema tenta o próximo canal. Ofertas com prazo de 1h saem em todos os canais de uma vez.
- **RN-62** Uma resposta em qualquer canal encerra a etapa e cancela os envios pendentes dela.
- **RN-63** Toda mensagem fora do app leva o link de ação (RN-70).

### 3.10 Link de ação

- **RN-70** Cada envio leva um token aleatório único por agendamento e destinatário. O banco guarda só o hash, e o token expira no horário da consulta.
- **RN-71** A página mostra o estado atual. Se a consulta já foi cancelada ou remarcada, mostra isso em vez dos botões. As ações são idempotentes: clicar duas vezes não duplica nada.
- **RN-72** As ofertas de adiantamento usam o mesmo mecanismo, com os botões Aceitar e Manter meu horário.
- **RN-73** O link usa um domínio reconhecível e a mensagem mostra o nome da UBS, para não parecer golpe.

### 3.11 LGPD e auditoria

- **RN-80** Consentimento registrado para cada canal e para cada contato vinculado.
- **RN-81** Cada destinatário recebe só os dados necessários (RN-57 e RN-52).
- **RN-82** Toda ação sobre um agendamento gera log com autor (paciente, contato, equipe ou sistema), canal e horário.

### 3.12 Relógio

- **RN-90** Todo código que depende de horário usa um serviço `Clock` injetável, nunca `Date.now()` direto. Em ambiente de desenvolvimento existe um endpoint para avançar o relógio e disparar os jobs, para testar o fluxo de 14 dias em minutos.

## 4. Estados e fluxos

Todo agendamento nasce `PENDENTE` (ou `CONFIRMADO`, pela RN-05) e termina em um de 5 estados finais. Só `FALTOU` vindo de `CONFIRMADO` tira pontos.

```
                       confirma              +10 pts
   ┌───────────┐  ───────────────▶  ┌────────────┐ ─────────▶ COMPARECEU
   │ PENDENTE  │                    │ CONFIRMADO │ ─────────▶ FALTOU (−30 pts)
   └───────────┘                    └────────────┘
      │ sem resposta à D-3            │ cancela (0 pts)        │ remarca ou aceita
      │ (exceto vulnerável)           ▼                        ▼ adiantamento
      ▼                        CANCELADO_PACIENTE         REMARCADO
   CANCELADO_AUTO
   ──────────────── toda vaga liberada abre uma oferta de adiantamento (RN-30) ────────────────
```

Quem remarca ou aceita um adiantamento ganha um agendamento novo, `CONFIRMADO`, no outro horário. Um paciente vulnerável que chega ao dia ainda `PENDENTE` tem o comparecimento ou a falta registrados normalmente, sem perder pontos.

**Fluxo A: lembrete e resposta**
1. O job envia a etapa (D-14, D-7, D-3) pelo primeiro canal disponível e gera o link.
2. Sem resposta em 12h, tenta o próximo canal (RN-61).
3. A resposta em qualquer canal encerra a etapa (RN-62) e aplica a ação (RN-20 a RN-22).
4. Sem resposta à D-7 até o envio da D-3: pré-aviso ao próximo paciente (RN-25).
5. Sem resposta à D-3 até 48h antes: cancelamento automático (RN-26) ou, se vulnerável, alerta para a equipe (RN-27).

**Fluxo B: vaga liberada**
1. Uma vaga fica livre (cancelamento, remarcação ou cancelamento automático).
2. O sistema monta a lista de candidatos (RN-31) e calcula o prazo de aceite pela faixa (RN-32).
3. Mais de 24h para a vaga: oferta para um candidato por vez, até 5. Menos de 24h: oferta simultânea para os 5 primeiros.
4. Quem aceita tem o agendamento movido para a vaga em uma transação com lock. A vaga antiga dele volta ao passo 1 (cascata).
5. Ninguém aceitou: a vaga volta para a agenda livre.

**Fluxo C: dia da consulta**
1. O lembrete D-0 sai de manhã, sem ação obrigatória.
2. A recepção registra `COMPARECEU` ou `FALTOU` no painel.
3. O sistema aplica a pontuação (RN-40 a RN-42) e grava o log (RN-82).

## 5. Modelo de dados

O modelo tem 16 entidades e serve para qualquer banco relacional. Os nomes estão em português para casar com as regras. `?` marca campo opcional.

### Enums

| Enum | Valores |
|---|---|
| `StatusAgendamento` | `PENDENTE`, `CONFIRMADO`, `CANCELADO_PACIENTE`, `CANCELADO_AUTO`, `REMARCADO`, `COMPARECEU`, `FALTOU` |
| `OrigemAgendamento` | `RECEPCAO`, `APP`, `REMARCACAO`, `ADIANTAMENTO` |
| `OrigemSlot` | `RECEPCAO`, `APP` |
| `StatusSlot` | `LIVRE`, `OCUPADO`, `BLOQUEADO` |
| `CategoriaAtendimento` | `CONSULTA` (médico), `PROCEDIMENTO` (enfermagem). Até 13/11 era `CONSULTA`, `EXAME` |
| `EtapaNotificacao` | `D14`, `D7`, `D3`, `D0`, `PRE_AVISO`, `OFERTA`, `CONFIRMACAO_AGENDAMENTO` |
| `Canal` | `PUSH`, `WHATSAPP`, `SMS`, `EMAIL` |
| `StatusNotificacao` | `AGENDADA`, `ENVIADA`, `ENTREGUE`, `FALHOU`, `RESPONDIDA`, `CANCELADA` |
| `StatusOferta` | `PENDENTE`, `ACEITA`, `RECUSADA`, `EXPIRADA`, `CANCELADA` |
| `TipoAutor` | `PACIENTE`, `CONTATO`, `EQUIPE`, `SISTEMA` |
| `PerfilEquipe` | `RECEPCAO`, `ACS`, `GESTOR` |
| `StatusAlerta` | `ABERTO`, `EM_CONTATO`, `RESOLVIDO` |

### Entidades

- **Ubs:** `id`, `nome`, `endereco`, `telefone`
- **UsuarioEquipe:** `id`, `ubsId`, `nome`, `email`, `senhaHash`, `perfil: PerfilEquipe`
- **Profissional:** `id`, `ubsId`, `nome`, `funcao` (médico, enfermeiro, técnico), **`categoria: CategoriaAtendimento`** (acréscimo de 14/11: médico atende `CONSULTA`, enfermagem atende `PROCEDIMENTO`; os horários do profissional só podem ser de tipos da mesma categoria)
- **Rua** (entidade nova, 14/11): `id`, `ubsId`, `nome`, `medicoReferenciaId` (o médico de referência de quem mora nela). Lados de uma avenida dividida entram como ruas separadas, ex.: "Av. Central (par)"
- **TipoAtendimento:** `id`, `ubsId`, `nome`, `categoria: CategoriaAtendimento`, `duracaoMin`, `antecedenciaMaximaDias`, `permiteAgendamentoApp`, `instrucoesPreparo?`
- **Slot:** `id`, `profissionalId`, `tipoAtendimentoId`, `inicio`, `fim`, `origem: OrigemSlot`, `status: StatusSlot`
- **Paciente:** `id`, `ubsId`, `nome`, `cpf`, `cns?`, `dataNascimento`, `telefone?`, `email?`, `possuiCelular`, `pushToken?`, `pontuacao` (inicial 100), `vulneravel`, `vulneravelAtribuidoPor?`, `vulneravelEm?`, `consentimentoCanais` (por canal: aceito e data), `senhaHash?`, **`deveTrocarSenha`** (acréscimo: senha provisória, ver seção 10), **`ruaId?`** e **`numero?`** (acréscimo de 14/11: definem o médico de referência; opcionais no banco por causa de cadastros antigos, obrigatórios no cadastro novo)
- **ContatoVinculado:** `id`, `pacienteId`, `nome`, `relacao` (pai, mãe, filho, cônjuge, outro parente, vizinho, amigo, outro), `telefone?`, `email?`, `contaPacienteId?` (quando o contato também usa o app), `recebeNotificacoes`, `consentimentoEm`, `consentimentoForma`, `ativo`
- **Agendamento:** `id`, `pacienteId`, `slotId`, `status: StatusAgendamento`, `origem: OrigemAgendamento`, `remarcadoDeId?`, `criadoPorTipo: TipoAutor`, `criadoPorId`, `confirmadoEm?`, `canceladoEm?`, `canceladoPorTipo?`, `presencaRegistradaEm?`, **`criadoEm`** (acréscimo: ordenação da agenda e do histórico)
- **Notificacao:** `id`, `agendamentoId?`, `ofertaId?`, `destinatarioTipo` (paciente, contato, equipe), `destinatarioId`, `etapa: EtapaNotificacao`, `canal: Canal`, `status: StatusNotificacao`, `agendadaPara`, `enviadaEm?`, `respondidaEm?`, `tentativa`
- **LinkToken:** `id`, `tokenHash`, `agendamentoId?`, `ofertaId?`, `destinatarioTipo`, `destinatarioId`, `expiraEm`, `usadoEm?`
- **OfertaAdiantamento:** `id`, `slotId`, `agendamentoCandidatoId?`, `suplenteId?`, `ordem`, `simultanea`, `status: StatusOferta`, `enviadaEm`, `expiraEm`, `respondidaEm?`
- **Suplente:** `id`, `pacienteId`, `tipoAtendimentoId`, `entrouEm`, `ativo`
- **EventoPontuacao:** `id`, `pacienteId`, `agendamentoId?`, `delta`, `motivo`, `saldoApos`, `criadoEm`
- **AlertaEquipe:** `id`, `ubsId`, `pacienteId`, `agendamentoId`, `motivo`, `status: StatusAlerta`, `responsavelId?`, `observacao?`, `criadoEm`, `resolvidoEm?`
- **LogAcao:** `id`, `agendamentoId`, `acao`, `autorTipo: TipoAutor`, `autorId?`, `canal?`, `detalhes` (JSON), `criadoEm`
- **Configuracao:** `chave`, `valor`, `ubsId?` (sem `ubsId` = valor global; com `ubsId` = sobrescreve para aquela UBS)

### Restrições

- Um slot tem no máximo 1 agendamento ativo (`PENDENTE` ou `CONFIRMADO`). Isso é garantido no banco pelo índice único parcial `agendamento_slot_ativo_uq`, para duas ofertas simultâneas aceitas ao mesmo tempo não ocuparem a mesma vaga.
- Um profissional não tem dois slots começando no mesmo instante (`slot_profissional_inicio_uq`).
- `Configuracao` tem uma linha por chave no escopo global e uma por (chave, UBS) (`configuracao_global_uq`, `configuracao_ubs_uq`).
- Aceitar uma oferta, remarcar e cancelar rodam em uma transação única, com lock no slot.

## 6. Telas

São 3 superfícies: o app (paciente e contato vinculado no mesmo app), a página do link e o painel da UBS. A página do link é servida pelo backend. O app (paciente e painel da equipe) está em `frontend/`, com todas as telas desenhadas; o estado de cada parte está em "Estado do front", no fim desta seção.

### App React Native: paciente

1. **Entrar:** CPF + senha. [sugestão, **confirmada**] No cadastro, a recepção gera uma senha provisória e entrega ao paciente. A troca é obrigatória no primeiro acesso, e a recepção pode redefinir a senha pelo painel. Contatos vinculados que usam o app entram com CPF + senha da própria conta.
2. **Minhas consultas:** próximas consultas com status e botões Confirmar, Cancelar e Remarcar, mais o histórico.
3. **Agendar:** escolhe o tipo de atendimento (só os liberados para o app) e um slot livre da cota do app, dentro da antecedência máxima.
4. **Remarcar:** lista de slots livres do mesmo tipo e confirmação da troca.
5. **Ofertas:** ofertas de adiantamento ativas, com contagem regressiva e os botões Aceitar e Manter meu horário.
6. **Lista de suplentes:** entrar ou sair por tipo de atendimento.
7. **Meus contatos:** adicionar ou remover contatos vinculados e registrar o consentimento.
8. **Notificações:** canais preferidos e consentimento de cada canal.

A pontuação não aparece como número. Quando estiver abaixo de 50, o app mostra só um aviso: "comparecendo às próximas consultas você volta a receber ofertas de adiantamento".

### App React Native: contato vinculado

1. **Pessoas que acompanho:** lista de pacientes vinculados.
2. **Consultas do paciente:** data, hora e UBS (sem tipo de atendimento, RN-57), com Confirmar, Cancelar e Remarcar em nome dele.

### Página do link (web)

- **Agendamento:** nome da UBS, data, hora (e tipo de atendimento, só se o destinatário for o próprio paciente), mais os botões Confirmar, Cancelar e Remarcar.
- **Remarcar:** lista simples de horários livres.
- **Oferta:** Aceitar ou Manter meu horário, com o prazo visível.
- **Estados finais:** consulta já cancelada, já remarcada, oferta expirada, link expirado.
- **Requisitos:** fonte grande, alto contraste, funciona sem JavaScript pesado em celulares simples.

### Painel da UBS

1. **Agenda do dia e da semana:** por profissional, com o status de cada agendamento e o registro de comparecimento ou falta.
2. **Pacientes:** cadastro, contatos vinculados, selo de vulnerável e histórico de pontuação.
3. **Agendar e remarcar:** pela recepção, com acesso a todos os slots.
4. **Slots:** criação em lote por profissional e definição da cota do app.
5. **Alertas:** fila de pacientes vulneráveis sem resposta, com atribuição ao ACS e baixa.
6. **Ofertas em andamento:** vagas liberadas e em qual candidato cada uma está.
7. **Configurações:** tipos de atendimento e os valores da seção 7.
8. **Indicadores:** taxa de faltas, vagas reaproveitadas e confirmações por canal.
9. **Relógio de desenvolvimento:** botão para avançar o tempo (só em ambiente de desenvolvimento, RN-90).

### Decisões de front

- **13/11:** o app vai usar **`useTheme`** para cores e tema.
- **14/11:** ThemeProvider próprio + `useTheme` + `StyleSheet`, sem biblioteca de UI. Expo Router com rotas em `src/app/` (pedido pelo `frontend/AGENTS.md`). As telas que dependem da Camada 2 são construídas com dados falsos atrás da mesma interface de serviço e ligadas à API depois. As telas desenhadas no Claude Design ficam exportadas em `frontend/design/`. O handoff completo está em [`HANDOFF-FRONTEND.md`](../../HANDOFF-FRONTEND.md).
- **Textos:** no tipo Médico, fale em "consulta"; no tipo Enfermagem, em "procedimento"; para os dois, "atendimento". Toda consulta e procedimento leva a etiqueta "Médico" ou "Enfermagem".
- **Rotas do app:** `/entrar`, `/entrar-equipe`, `/trocar-senha`, `/paciente/...` (abas Atendimentos, Agendar, Perfil) e `/equipe/...` (abas Agenda, Ofertas, Alertas, Pacientes). Pastas reais `paciente/` e `equipe/` em vez de grupos `(paciente)`, para as URLs das duas áreas não colidirem. A vitrine (`/vitrine`) só existe em desenvolvimento.
- **14/11, arquitetura do app aprovada:** TanStack Query para buscar dados e invalidar listas depois de cada ação; testes unitários das peças-chave (`jest-expo`); etiqueta "Exemplo" nas telas com dados falsos, só em desenvolvimento; trabalho na branch `feat/camada-1`. Datas no fuso de São Paulo por subtração fixa de 3h (sem horário de verão desde 2019), sem depender do Intl do Hermes. Ícones com `react-native-svg`, copiando os caminhos SVG das telas.

### Estado do front (app Expo)

Atualizado ao fim de cada parte. ☑ = feito e verificado, ☐ = pendente.

| Parte | Conteúdo | RN | Estado | Commit |
|---|---|---|---|---|
| 0 | Fundação: Expo Router, fontes, tokens e 3 paletas, ThemeProvider + `useTheme` + `criarEstilos`, componentes base, preferências e menu de acessibilidade, datas e rótulos, vitrine de desenvolvimento | seção 6 | ☑ | `ce0936a` |
| 1 | Cliente da API, tipos, sessão, guardas de rota, Entrar (paciente e equipe), Crie sua senha, abas do paciente e da equipe | senha provisória, RN-52 | ☑ | `3febb65` |
| 2 | Paciente: Meus atendimentos (próximo, depois, histórico), detalhe, confirmar, cancelar em dois passos, remarcar com grade de horários | RN-12, RN-20 a RN-22 | ☑ | `8da059b` |
| 3 | Paciente: agendar em 4 passos (Médico/Enfermagem → item → horário → conferir), aviso de duplicado, paciente sem rua | RN-01, RN-04, RN-05, RN-06 | ☑ | `05a7a38` |
| 4 | Paciente: Perfil com canais (PATCH na hora), seu médico, trocar senha | RN-06, RN-80 | ☑ | `fd43052` |
| 5 | Equipe: agenda do dia com navegação, filtros, indicadores, presença, confirmar/cancelar/remarcar em nome do paciente | fluxo C, RN-20 a RN-22, RN-52, RN-82 | ☑ | `b86b7b4` |
| 6 | Equipe: pacientes com busca, cadastro com rua → médico, senha provisória, ficha, agendar pela recepção com "Só recepção" | RN-01, RN-02, RN-06, RN-52, RN-80 | ☑ | `d1dfc72` |
| 7 | Equipe: relógio de testes (avançar, voltar ao real, caixa de saída) | RN-90 | ☑ | `972feb6` |
| 8 | Camada 2 com dados falsos: avisos da consulta, sem resposta, oferta, ofertas e suplentes, ofertas em andamento, alertas, contato e selo, reaproveitadas | RN-25 a RN-27, RN-30 a RN-36, RN-40, RN-50, RN-55 a RN-57 | ☑ | `bb5605c` |
| 9 | Fechamento: acessibilidade conferida nas telas reais, rotas que faltam no backend, roteiro de demonstração | — | ☑ | — |

**Verificação:** 46 testes unitários (`npm test` em `frontend/`), typecheck e lint limpos, pacote iOS e web gerados. Roteiros de ponta a ponta no Expo Web contra a API real (Chrome automatizado): login e guardas (20 cenários), paciente do primeiro acesso ao cancelamento (20), painel (19), Camada 2 (16) e acessibilidade (3: letra muito grande, alto contraste, preferências salvas). Os roteiros criam pacientes de teste próprios e não mexem nos pacientes do seed.

**Decisões tomadas durante a construção (14/11):**
- O detalhe de um agendamento sai da lista (`/agendamentos/meus` ou `/equipe/agenda` do dia), porque não existe rota de um agendamento só.
- Agendar pelo app avisa "você já tem uma marcada" ao escolher o item quando a lista já mostra um ativo do mesmo tipo. É só um atalho de exibição: quem decide é a API (RN-04, 409). Depois de um 409, o app relê a lista para saber se foi duplicado ou horário ocupado.
- A agenda da equipe usa o relógio da API como "hoje" quando `/dev/relogio` existe, para a demonstração dos 14 dias funcionar; fora de dev vale o relógio do aparelho.
- O botão de sair da equipe fica no fim da Agenda (o design do painel não tem sair).
- A senha provisória passa da tela de cadastro para a tela da senha só em memória, nunca pela URL.
- Nenhum valor da seção 7 aparece fixo nas telas (ex.: o app não escreve "48 horas" nem "−30 pontos"); os textos de prazo usam as datas que o serviço devolve.

**O que falta no backend para o app** (nenhuma rota foi criada no backend; os contratos propostos estão em `frontend/src/servicos/camada2/contratos.ts`):

| Rota proposta | Para quê | Hoje no app |
|---|---|---|
| `GET /agendamentos/:id/avisos` | Linha do tempo D-14 a D-0 no detalhe, prazo de resposta (RN-26) e explicação de cancelada sem resposta | Dados falsos (`AvisosServico`) |
| Nome da UBS em `/auth/eu` (ou `GET /ubs/atual`) | Cabeçalho "UBS Feitoria" | Fixo em `src/config.ts` |
| `GET /ofertas/minhas`, `POST /ofertas/:id/aceitar`, `POST /ofertas/:id/manter` | Oferta de vaga mais cedo (RN-30 a RN-35) | Dados falsos |
| `GET /pacientes/eu/compromisso`, `GET/POST/DELETE /suplentes` | Aviso de pontuação sem número (RN-40) e lista de suplentes (RN-36) | Dados falsos |
| `GET /equipe/ofertas` e o número de vagas reaproveitadas no dia | Ofertas em andamento e indicador da agenda | Dados falsos |
| `GET /equipe/alertas`, `POST /equipe/alertas/:id/atribuir`, `/resolver` | Alertas de vulneráveis (RN-27) | Dados falsos |
| `GET/POST /pacientes/:id/contatos`, `PATCH /pacientes/:id/selo` | Contato vinculado (RN-55 a RN-58) e selo (RN-50) na ficha | Dados falsos |
| Horário e nome do destinatário em `GET /dev/envios` | Relógio de testes mostrar "26/11 07:00 · Osvaldo M." | Mostra "paciente nº 12" |

Para ligar uma rota quando ela sair: escrever a implementação real da interface (ex.: `ofertasApi` com `requisitar`) e trocar a linha correspondente em `frontend/src/servicos/index.ts`. As telas não mudam.

**Roteiro de demonstração** (backend rodando, `npm run seed -- --reset`, app com `npx expo start`):
1. Paciente: entrar como Fernanda (`555.666.777-20`, senha `123456`) e criar a senha. Ver "Meus atendimentos" e "Seu médico".
2. Agendar: Médico → Consulta clínica geral → só horários da médica da rua → conferir → marcado. Tentar marcar outra igual: aviso de duplicado (RN-04).
3. Confirmar presença, remarcar (o antigo vai para o histórico como Remarcado) e cancelar com o aviso de que não prejudica.
4. Perfil: desligar e ligar canais; "Acessibilidade": letra Muito grande, alto contraste, Ouvir esta tela.
5. Rita (`666.777.888-30`): consulta médica dá a orientação de procurar a recepção (sem rua).
6. Equipe (`recepcao@ubs.local`): cadastrar paciente escolhendo a rua (mostra o médico), entregar a senha provisória, agendar pela recepção com os horários "Só recepção".
7. Agenda: navegar até o dia do atendimento, abrir a linha e registrar Compareceu. Antes do dia, a API recusa com mensagem.
8. Relógio de testes: +14 dias e ver os lembretes na caixa de saída. "Voltar ao horário real" no fim.
9. Camada 2 (etiqueta "Exemplo"): oferta de vaga mais cedo, avisos da consulta, alertas, ofertas em andamento, selo na ficha.

**Onde está cada peça do app** (`frontend/src/`):

| Peça | Arquivo |
|---|---|
| Paletas clara (paciente), escura (equipe) e alto contraste | `tema/paletas.ts` |
| Espaços, raios, fontes, escala tipográfica e escala da letra (1 · 1,2 · 1,4) | `tema/tokens.ts`, `tema/fontes.ts` |
| Tema = variante do grupo de rotas + preferências; `useTheme`, `criarEstilos` | `tema/ThemeProvider.tsx`, `tema/criarEstilos.ts` |
| Preferências de acessibilidade salvas no aparelho | `acessibilidade/PreferenciasProvider.tsx` |
| Menu de acessibilidade e "Ouvir esta tela" | `acessibilidade/MenuAcessibilidade.tsx`, `acessibilidade/leitura.ts` |
| Moldura de toda tela (cabeçalho, botão de acessibilidade, rolagem, rodapé) | `componentes/Tela.tsx` |
| RN-06 "Médico"/"Enfermagem" e status sempre escrito | `utils/rotulos.ts`, `componentes/Etiqueta.tsx` |
| Datas "Qui, 10/12 · 9h" e por extenso, no fuso de São Paulo | `utils/datas.ts` |
| Tipos do contrato (seção 14); RN-52: `PacienteProprio` não tem selo nem pontuação | `api/tipos.ts` |
| Cliente HTTP: token, `ApiErro` com a `message` da API, 401 encerra a sessão, sem conexão = status 0 | `api/cliente.ts` |
| TanStack Query (cache, nova tentativa só sem conexão, recarrega ao voltar ao app) | `api/consultas.ts` |
| Registro único dos serviços (API real ou dados falsos) | `servicos/index.ts` |
| Sessão: token no SecureStore (localStorage na web), restaura com `/auth/eu` | `sessao/SessaoProvider.tsx`, `sessao/armazenamento.ts` |
| Senha provisória: só "Crie sua senha"; cada perfil só na sua área | `sessao/guardas.ts` + `Stack.Protected` em `app/_layout.tsx` |
| Barras de abas do design (paciente e equipe) | `componentes/BarraAbas.tsx` |
| Hooks de dados por área (TanStack Query, invalidação depois de cada ação) | `hooks/paciente.ts`, `hooks/equipe.ts`, `hooks/camada2.ts` |
| RN-06 na tela: seu médico pela rua; rua → médico no cadastro | `componentes/CartaoMedico.tsx`, `componentes/SeletorRua.tsx` |
| RN-20 a RN-22 (paciente): confirmar, cancelar, remarcar | `app/paciente/atendimento/[id]/index.tsx`, `.../remarcar.tsx` |
| RN-01 a RN-06 no agendar pelo app | `app/paciente/(abas)/agendar.tsx` |
| RN-80: canais no Perfil | `app/paciente/(abas)/perfil.tsx` |
| Fluxo C e ações da recepção | `app/equipe/(abas)/index.tsx`, `app/equipe/agendamento/[id].tsx` |
| RN-02 "Só recepção" na grade | `componentes/GradeHorarios.tsx` (`marcarReservados`) |
| Cadastro, senha provisória, ficha | `app/equipe/paciente/novo.tsx`, `app/equipe/senha-gerada.tsx`, `app/equipe/paciente/[id].tsx` |
| RN-90: relógio de testes | `app/equipe/relogio.tsx` |
| Camada 2: contratos, falsos e registro | `servicos/camada2/contratos.ts`, `servicos/camada2/falsos.ts`, `servicos/index.ts` |

## 7. Configurações

Todos os valores abaixo ficam na tabela `Configuracao`, com padrão global e sobrescrita por UBS. Nenhum deles pode estar fixo no código. O valor é guardado como JSON em texto.

| Chave | Padrão | Regra |
|---|---|---|
| `lembrete.etapasDias` | `[14, 7, 3, 0]` | RN-10 |
| `lembrete.d0Hora` | `"07:00"` | RN-10 |
| `semResposta.prazoD3Horas` | `48` (horas antes da consulta) | RN-26 |
| `agendamento.cotaAppPercentual` | `40` | RN-02 |
| `agendamento.confirmadoAutomaticoDias` | `3` | RN-05 |
| `oferta.antecedenciaMinimaHoras` | `1` | RN-30 |
| `oferta.prazoAceite` | `{"maisDe72h": 24, "de24a72h": 4, "menosDe24h": 1}` (horas) | RN-32 |
| `oferta.maxCandidatos` | `5` | RN-32, RN-33 |
| `pontos.inicial` | `100` | RN-40 |
| `pontos.maximo` | `100` | RN-40 |
| `pontos.faltaConfirmada` | `-30` | RN-40 |
| `pontos.comparecimento` | `10` | RN-40 |
| `pontos.limiteOfertas` | `50` | RN-40 |
| `canal.escalonamentoHoras` | `12` | RN-61 |
| `canal.ordem` | `["PUSH", "WHATSAPP", "SMS"]` | RN-60 |

A antecedência máxima e as instruções de preparo ficam no próprio `TipoAtendimento`, não nesta tabela.

## 8. Ordem de implementação

Nada foi cortado do escopo. As camadas definem só a ordem. Uma camada começa quando a anterior funciona de ponta a ponta. (O estado real de cada item está na seção 11.)

**Camada 1: núcleo**
- Modelo de dados, migrações e seed (1 UBS, profissionais, tipos de atendimento, slots, pacientes)
- Serviço `Clock` e endpoint de avançar o relógio (RN-90)
- Autenticação da equipe e do paciente
- Agendamento pela recepção e pelo app, com cota e antecedência (RN-01 a RN-05)
- Lembretes D-14, D-7, D-3 e D-0 via job (RN-10 a RN-13)
- Link de ação e página web (RN-70 a RN-73)
- Confirmar, cancelar e remarcar no app e no link (RN-20 a RN-22)
- Registro de comparecimento ou falta no painel

**Camada 2: diferenciais**
- Cancelamento automático por falta de resposta (RN-26)
- Oferta de adiantamento em cascata, com prazos e oferta simultânea (RN-30 a RN-35)
- Pontuação (RN-40 a RN-42)
- Selo de vulnerável e alertas para a equipe (RN-27, RN-50 a RN-52)
- Contato vinculado no cadastro, nas notificações e no app (RN-55 a RN-58)

**Camada 3: canais**
- Adaptador push (FCM)
- Adaptador WhatsApp
- Adaptadores SMS e e-mail
- Escalonamento entre canais e encerramento por resposta (RN-60 a RN-62)

**Camada 4: extras**
- Pré-aviso ao próximo paciente (RN-25)
- Lista de suplentes (RN-36)
- Exames com instruções de preparo
- Indicadores no painel

**Fora do escopo agora** (entram como próxima etapa): integração com o e-SUS APS ou o sistema de agenda do município, e o estudo de custos de operação.

## 9. Decisões em aberto

Estes pontos travam partes do código e precisam de resposta antes da camada indicada. **Perguntar ao usuário antes de implementar.**

- ☑ **"Próximo paciente compatível"** (camada 2), **decidido em 14/11**: na vaga de **consulta médica**, os candidatos da RN-31 são pacientes com a **mesma consulta** e da **mesma área** (mesmo médico de referência). Na vaga de **procedimento de enfermagem**, pacientes com o **mesmo procedimento**. Os demais critérios da RN-31 (ordem por data, suplentes, pontuação ≥ 50 ou selo) continuam.
- ☐ **Antecedência de exames** (camada 4): manter 60 dias ou definir outro valor.
- ☐ **RN-56** [sugestão] (camada 2): o time confirma ou troca.
- ☑ RN-04, RN-05, RN-11 e senha provisória: **confirmadas em 13/11** (ver seção 10).

Decidido em 13/11: o painel da UBS fica dentro do app React Native, e o login do paciente é por CPF + senha.

---

## 10. Decisões tomadas (técnicas e de produto)

### 13/11/2026 — início da Camada 1

| Decisão | Escolha e motivo |
|---|---|
| Escopo desta fase | **100% backend.** Nada em `frontend/` é tocado; o app entra depois, sobre a API pronta e o contrato da seção 14. |
| Estrutura do backend | Base dos projetos `cuiudos-play-games` e `healthly` (controllers em classe, services por domínio, DTOs Zod, mappers, `tests/` na raiz) + pastas `clock/`, `jobs/`, `notifications/`, `web/` exigidas pela spec. Detalhe no `CLAUDE.md`. |
| Banco | **PostgreSQL 17**, porta **5433** em dev (5432 é de outro projeto) e **5434** nos testes. Escolhido pelo índice único parcial, que garante no banco a restrição de 1 agendamento ativo por slot. |
| ORM | **TypeORM** com migrations imutáveis; `synchronize` sempre desligado. |
| Testes | **`node:test` + supertest** em banco descartável (tmpfs). Nomes dos testes citam o RN-xx. |
| Sugestões confirmadas | **RN-04** (1 ativo por tipo), **RN-05** (< 3 dias nasce `CONFIRMADO`), **RN-11** (pula etapas passadas), **senha provisória** (recepção gera; troca obrigatória no 1º acesso; recepção redefine). |
| Front | Vai usar **`useTheme`** para tema. Só isso foi definido. |
| Nomes | Domínio em português como a spec; infraestrutura em inglês. |

### 14/11/2026 — ajuste às telas do Claude Design

| Decisão | Escolha |
|---|---|
| Tipos de atendimento | Médico (consultas, `CONSULTA`) e Enfermagem (procedimentos, `PROCEDIMENTO`); ver RN-06 |
| Médico da consulta | Sempre o médico de referência da rua do paciente (RN-06); exemplo de referência: `teste fluxo.html` |
| Próximo paciente compatível (seção 9) | Consulta: mesma consulta + mesma área. Procedimento: mesmo procedimento |
| Seed | UBS Feitoria; 3 médicos com 9 ruas (Dra. Helena: Rua das Flores, Rua Boa Vista, Av. Central (par); Dra. Santos: Rua São José, Rua Nova, Av. Central (ímpar); Dr. Oliveira: Rua do Comércio, Rua Esperança, Rua Liberdade); 3 enfermeiras; 6 consultas e 9 procedimentos; Osvaldo Menezes (CPF 123.456.789-09) na Rua das Flores. A consulta odontológica saiu |
| Liberados no app (premissa do seed, o gestor ajusta) | Todas as consultas, mais vacinação, aferição de pressão e glicemia e coleta de exames. Os demais procedimentos só pela recepção |
| Canais no Perfil (RN-80) | O paciente liga e desliga cada canal. Canal desligado nunca é usado, nem o push |
| Frontend | Ver "Decisões de front" na seção 6 |

### Premissas adotadas na Camada 1 (o usuário pode revisar)

1. **RN-03 e RN-04 valem para recepção e app**: o texto fala do tipo/paciente, não do ator. RN-01 e RN-02 são explicitamente por ator.
2. **Hora de envio**: D-14, D-7 e D-3 saem na mesma hora de `lembrete.d0Hora` (07:00), única chave de hora da seção 7.
3. **Token do link (RN-70)**: cada envio gera um token aleatório novo para aquele agendamento e destinatário (como o banco guarda só o hash SHA-256, não dá para reaproveitar o token de um envio anterior). Todos valem até o horário da consulta.
4. **Paciente sem canal** na Camada 1: a notificação é criada e "enviada" pelo adaptador mock assim mesmo (o contato vinculado só entra na Camada 2).
5. **Campos extras** ao modelo da seção 5: `Paciente.deveTrocarSenha` (senha provisória) e `Agendamento.criadoEm` (ordenação). Nada mais foi acrescentado.
6. **Presença** (`COMPARECEU`/`FALTOU`) só pode ser registrada a partir do início do dia da consulta.
7. **Portas**: API 3333; Postgres dev 5433; Postgres de teste 5434.
8. **Git**: branch `feat/camada-1`, um commit por parte, sem push até o usuário pedir.
9. **RN-52 desde já**: mappers e página do link nunca expõem `vulneravel`, mesmo o selo sendo Camada 2.
10. **Fuso**: `TZ=America/Sao_Paulo` fixado em `config/env.ts`; colunas `timestamptz`.
11. **Relógio de dev** avança em passos de 60 min rodando os jobs a cada passo, para manter a ordem D-14 → D-7 → D-3 → D-0 mesmo num salto de 14 dias.
12. **RN-11 no mesmo dia**: etapa cujo *dia* já passou é pulada. Se o dia da etapa é hoje e a hora (`lembrete.d0Hora`) já passou, ela sai no próximo tick. Etapa que cairia no horário da consulta ou depois é pulada (ex.: exame às 07:00 não recebe D-0 às 07:00).
13. **Canais (RN-60, RN-80)**: WhatsApp e SMS só com consentimento registrado no canal e telefone de celular; push só com `pushToken`. Sem nenhum canal, o mock registra o envio sem destino (`destino: null`).
14. **`lembrete.etapasDias`** pode ligar ou desligar etapas, mas só entre 14, 7, 3 e 0, que são as que o enum `EtapaNotificacao` conhece.
15. **Ações respondem a etapa (RN-62)**: qualquer ação sobre o agendamento marca as notificações já enviadas como `RESPONDIDA`. O escalonamento entre canais continua na Camada 3.

## 11. Estado da implementação

Atualizado ao fim de cada parte. ☑ = feito e testado, ☐ = pendente.

**Camada 1 (plano aprovado em 13/11, só backend)**

| Parte | Item da seção 8 | RN | Estado | Commit |
|---|---|---|---|---|
| 0 | Estrutura base, Postgres, harness de testes, SPEC.md e CLAUDE.md | — | ☑ | `f6d4015` |
| 1 | Modelo de dados, migração inicial e seed | seção 5 e 7 | ☑ | `35fee99` |
| 2 | `Clock` injetável, runner de jobs e endpoints `/dev` | RN-90 | ☑ | `e0cabb3` |
| 3 | `ConfiguracaoService` (global + sobrescrita por UBS) | seção 7 | ☑ | `20b8d4d` |
| 4 | Autenticação da equipe e do paciente; cadastro com senha provisória | seção 6, RN-52 | ☑ | `b78eb54` |
| 5 | Slots com cota, agendar pela recepção e pelo app | RN-01 a RN-05, RN-82 | ☑ | `e4564d0` |
| 6 | Lembretes D-14/D-7/D-3/D-0 via job, canal mock, token do link | RN-10 a RN-13, RN-63, RN-70 | ☑ | `3a72ac9` |
| 7 | Confirmar, cancelar e remarcar | RN-20 a RN-22, RN-71, RN-82 | ☑ | `fc7a31e` |
| 8 | Página do link | RN-70 a RN-73 | ☑ | `61360b8` |
| 9 | Registro de comparecimento ou falta | fluxo C, RN-82 | ☑ | `9783d29` |
| 10 | Fechamento: estado, mapa RN → código, contrato da API, verificação de ponta a ponta | — | ☑ | `63bbaaa` |
| 11 | Ajuste às telas (14/11): consulta × procedimento, ruas e médico de referência, endereço, canais do Perfil, filtro da agenda | RN-06, RN-80, seção 9 | ☑ | `836e9b1` |

**Camada 1 concluída em 13/11/2026** e ajustada às telas em 14/11: 97 testes passando (`npm test`), typecheck limpo, e o roteiro de ponta a ponta da seção 13 rodado contra o servidor real.

**O que a Camada 1 deixou pronto para a Camada 2** (pontos de extensão, todos dentro da transação da ação):
- `AgendamentoService.aoLiberarVaga(manager, slot, agora)`: chamado por cancelar e remarcar. É onde nasce a oferta de adiantamento (RN-30 a RN-35). O cancelamento automático (RN-26) também deve passar por ele.
- `PresencaService.aoRegistrarPresenca(manager, agendamento, statusAnterior, agora)`: onde entra a pontuação (RN-40 a RN-42).
- `Notificacao.status = RESPONDIDA` já é gravado em toda ação (RN-62): o job de "sem resposta" (RN-25, RN-26) pode olhar para isso.
- `Autor.tipo = CONTATO` já é aceito pelo `AgendamentoService` e pelo `LinkService` (RN-58); falta o cadastro do contato e o envio para ele (RN-55 a RN-57).
- O "próximo paciente compatível" já está decidido (seção 9). Antes da Camada 2, falta decidir a RN-56.

**Camadas 2, 3 e 4:** não iniciadas.

## 12. Mapa RN → código

Preenchido conforme as partes são implementadas. Formato: regra → arquivo e método que a aplica → teste que a cobre.

| Regra | Onde é aplicada | Teste |
|---|---|---|
| Seção 5: modelo (16 entidades, 12 enums) | `src/models/*.ts`, registradas em `src/models/index.ts`; schema em `src/migrations/1794618432397-SchemaInicial.ts` | `tests/migrations.test.ts` ("deixa o banco igual aos modelos") |
| Seção 5: 1 agendamento ativo por slot | índice parcial `agendamento_slot_ativo_uq` em `src/models/Agendamento.ts` | `tests/migrations.test.ts` ("recusa 2 agendamentos ativos no mesmo slot") |
| Seção 7: padrões na tabela `Configuracao` | `src/seeds/dados/configuracao.ts` gravado por `executarSeed` em `src/seeds/seed.ts` | `tests/seed.test.ts` ("grava as 15 chaves") |
| RN-02 (distribuição da cota) | `SlotService.marcarCota` em `src/services/SlotService.ts` (regra pura; a criação em lote vem na Parte 5) | `tests/seed.test.ts` ("40% dos slots na cota do app", "marcarCota distribui") |
| RN-03 (antecedência por tipo) | campo `TipoAtendimento.antecedenciaMaximaDias` (a validação vem na Parte 5) | — |
| RN-13 (preparo) | campo `TipoAtendimento.instrucoesPreparo` (vai nas mensagens na Parte 6) | — |
| RN-70 (só o hash no banco) | campo `LinkToken.tokenHash` (geração na Parte 6) | — |
| RN-82 (log de ações) | entidade `LogAcao` com `criadoEm` vindo do Clock (serviço na Parte 5) | — |
| Senha provisória | campo `Paciente.deveTrocarSenha` (fluxo na Parte 4) | `tests/seed.test.ts` (1 paciente com troca pendente) |
| RN-90: Clock injetável | interface `src/clock/Clock.ts`; `SystemClock` (produção) e `AdjustableClock` (dev/teste); singleton `clock` em `src/clock/index.ts` | `tests/clock.test.ts` ("AdjustableClock congelado", "fluindo") |
| RN-90: proibido ler o relógio do sistema | varredura de `services/`, `jobs/`, `notifications/`, `web/` | `tests/clock.test.ts` ("nenhum arquivo ... lê o relógio do sistema") |
| RN-90: agendador de jobs | `JobRunner` em `src/jobs/runner.ts` (tick `JOBS_INTERVALO_MS`, iniciado em `server.ts`) | `tests/clock.test.ts` ("roda os jobs a cada passo") |
| RN-90: avançar o relógio em dev | `avancarRelogioRodandoJobs` em `src/jobs/relogioDev.ts` (passos de 1h); rotas `/dev/*` em `src/routes/devRoutes.ts`, bloqueadas em produção por `apenasDev` | `tests/clock.test.ts` ("endpoints /dev") |
| Seção 7: leitura com sobrescrita por UBS | `ConfiguracaoService.get` em `src/services/ConfiguracaoService.ts` (UBS → global → erro); formato de cada chave em `src/services/configuracaoChaves.ts` | `tests/configuracao.test.ts` |
| Seção 7: nada fixo no código | `get` lança erro se a chave não existe na tabela; o seed (`src/seeds/dados/configuracao.ts`) é o único lugar com os padrões | `tests/configuracao.test.ts` ("chave ausente lança erro") |
| Seção 6 "Entrar": login por CPF + senha | `AuthService.entrarPaciente`; equipe por e-mail em `AuthService.entrarEquipe`; JWT com a sessão em `src/utils/jwt.ts` | `tests/auth.test.ts` |
| Senha provisória [sugestão confirmada] | `PacienteService.cadastrar` e `redefinirSenha` geram a senha; `authPaciente()` em `src/middlewares/auth.ts` bloqueia até `AuthService.trocarSenhaPaciente` | `tests/auth.test.ts`, `tests/pacientes.test.ts` |
| Perfis da equipe (RECEPCAO, ACS, GESTOR) | `authEquipe(...perfis)` em `src/middlewares/auth.ts`; dados sempre filtrados pela UBS da sessão | `tests/pacientes.test.ts` ("ACS não cadastra", "só dentro da UBS") |
| RN-52: selo só no painel | `PacienteMapper.paraPaciente` (sem selo nem pontuação) × `paraEquipe` em `src/mappers/PacienteMapper.ts` | `tests/pacientes.test.ts` ("RN-52") |
| RN-80: consentimento por canal | `PacienteService.cadastrar` grava `{ aceito, em }` por canal | `tests/pacientes.test.ts` |
| Seção 7: `pontos.inicial` | `PacienteService.cadastrar` lê da configuração da UBS | `tests/pacientes.test.ts` ("pontuação inicial") |
| RN-01: app só agenda tipos liberados | `AgendamentoService.validarSlotParaAgendar`; listas filtradas em `CatalogoService.listarTipos` e `SlotService.listarParaPaciente` | `tests/agendamento.test.ts` ("RN-01") |
| RN-02: cota do app | criação em lote `SlotService.criarEmLote` (cota da Configuracao via `marcarCota`); app só vê/usa `origem=APP` em `listarParaPaciente` e `validarSlotParaAgendar` | `tests/agendamento.test.ts` ("RN-02") |
| RN-03: antecedência máxima do tipo | `validarSlotParaAgendar` (app e recepção) e janela de `listarParaPaciente` | `tests/agendamento.test.ts` ("RN-03") |
| RN-04: 1 agendamento ativo por tipo | `AgendamentoService.validarUmAtivoPorTipo`, com lock no paciente | `tests/agendamento.test.ts` ("RN-04") |
| RN-05: < N dias nasce CONFIRMADO | `AgendamentoService.criar` (`agendamento.confirmadoAutomaticoDias`) | `tests/agendamento.test.ts` ("RN-05") |
| RN-82: log de ações | `LogAcaoService.registrar` (mesma transação da ação; horário do Clock) | `tests/agendamento.test.ts` ("RN-82") |
| Restrição: lock no slot | `AgendamentoService.travarSlot` (`SELECT ... FOR UPDATE`) + índice parcial | `tests/agendamento.test.ts` ("só um leva") |
| Seção 6: "Minhas consultas" e "Agenda do dia" | `AgendamentoService.listarDoPaciente`, `agendaDoDia`, `acoesDisponiveis` | `tests/agendamento.test.ts` |
| RN-10: até 4 lembretes no horário configurado | `LembreteService.agendar` (chamado em `AgendamentoService.criar`) cria as `Notificacao` AGENDADA; `src/jobs/lembretesJob.ts` envia quando chega a hora | `tests/lembretes.test.ts` ("RN-10", "RN-90: avançar 20 dias") |
| RN-11: pula etapas passadas | `LembreteService.agendar` | `tests/lembretes.test.ts` ("RN-11") |
| RN-12: confirmado = informativo | `exigeResposta` e `textoLembrete` em `src/notifications/mensagens.ts`, avaliados na hora do envio | `tests/lembretes.test.ts` ("RN-10 / RN-12") |
| RN-13: preparo em todos os lembretes | `textoLembrete` | `tests/lembretes.test.ts` ("RN-13") |
| RN-60 / RN-80: escolha do canal | `Despachante.escolherCanal` em `src/notifications/Despachante.ts` (ordem de `canal.ordem`, consentimento) | `tests/lembretes.test.ts` ("RN-60 / RN-80") |
| RN-63 / RN-73: link e nome da UBS na mensagem | `textoLembrete` | `tests/lembretes.test.ts` ("RN-63 / RN-70 / RN-73") |
| RN-70: token aleatório, só hash, expira na consulta | `LinkTokenService.criar` e `resolver` em `src/services/LinkTokenService.ts` | `tests/lembretes.test.ts` ("RN-63 / RN-70 / RN-73") |
| Canais mock | `CanalAdapter` (interface) e `MockAdapter` + `caixaDeSaida` em `src/notifications/`; `GET /dev/envios` | `tests/lembretes.test.ts` ("GET /dev/envios") |
| RN-20: confirmar | `AgendamentoService.confirmar` | `tests/acoes.test.ts` ("RN-20") |
| RN-21: cancelar antes do horário, inclusive confirmado | `AgendamentoService.cancelar` (slot volta a LIVRE, lembretes cancelados) | `tests/acoes.test.ts` ("RN-21") |
| RN-22: remarcar como troca direta | `AgendamentoService.remarcar` (lock no paciente e nos dois slots em ordem de id; reaproveita `validarSlotParaAgendar` e `validarUmAtivoPorTipo`) | `tests/acoes.test.ts` ("RN-22") |
| RN-30 (ponto de extensão) | `AgendamentoService.aoLiberarVaga`, chamado por cancelar e remarcar dentro da transação; vazio até a Camada 2 | — |
| RN-62: resposta encerra a etapa | `LembreteService.marcarRespondidas` chamado nas três ações | `tests/acoes.test.ts` ("RN-20") |
| RN-71: idempotência das ações | early return em `confirmar`, `cancelar` e `remarcar` (mesmo slot) | `tests/acoes.test.ts` ("RN-71") |
| RN-82: autor das ações | `autorPaciente` / `autorEquipe` em `src/services/autor.ts` + `LogAcaoService` | `tests/acoes.test.ts` ("recepção cancela em nome do paciente") |
| RN-70: link com token, só hash, expira na consulta | `LinkService.validar` (via `LinkTokenService.resolver`); página de link inválido (404) ou expirado (410) em `src/web/templates/estado.ts` | `tests/link.test.ts` ("RN-70") |
| RN-71: página mostra o estado; ações idempotentes | `LinkService.montarPagina` + `src/web/templates/agendamento.ts`; ações via `AgendamentoService` com POST → 303 (PRG) em `LinkController` | `tests/link.test.ts` ("RN-71", "RN-21 / RN-71") |
| RN-22 pelo link | `LinkService.horariosParaRemarcar` (mesmas regras do app via `SlotService.listarParaPaciente`) + `src/web/templates/remarcar.ts` | `tests/link.test.ts` ("RN-22") |
| RN-73: nome da UBS na página | cabeçalho de `pagina()` em `src/web/templates/layout.ts` | `tests/link.test.ts` ("RN-73") |
| RN-52 / RN-57 na página | `LinkService.montarPagina` só põe tipo e profissional se o destinatário for o paciente; o selo nunca entra | `tests/link.test.ts` ("RN-52 e escape") |
| Acessibilidade (seção 6) | HTML puro, sem JavaScript, fonte grande e alto contraste; passo de confirmação antes de cancelar | — |
| Fluxo C: comparecimento ou falta | `PresencaService.registrar` em `src/services/PresencaService.ts` (de PENDENTE ou CONFIRMADO, a partir do dia da consulta; cancela lembretes; log PRESENCA com o status anterior) | `tests/presenca.test.ts` |
| RN-40 a RN-42 (ponto de extensão) | `PresencaService.aoRegistrarPresenca` recebe o status anterior; vazio até a Camada 2 | — |

| RN-06: consulta com o médico da rua | `exigirMedicoDaRua` e `validarMedicoDoSlot` em `src/services/medicoDeReferencia.ts`, chamados por `AgendamentoService.validarSlotParaAgendar` (criar e remarcar) e pelas listagens do `SlotService` | `tests/medicoPorRua.test.ts` |
| RN-06: categoria do profissional | `SlotService.criarEmLote` recusa profissional de outra categoria | `tests/medicoPorRua.test.ts` ("lote de horários recusa") |
| RN-06: endereço e médico de referência | `PacienteService.cadastrar` (exige rua) e `atualizarEndereco`; `PacienteMapper` devolve `rua` e `medicoReferencia`; `CatalogoService.listarRuas` | `tests/medicoPorRua.test.ts` |
| RN-80: canais no Perfil | `PacienteService.atualizarCanais`; `Despachante.escolherCanal` ignora canal recusado | `tests/medicoPorRua.test.ts` ("canais de aviso no Perfil") |

## 13. Como rodar

```bash
# na raiz do repo
docker compose up -d                       # Postgres de dev na 5433
cd backend
cp .env.example .env                       # primeira vez
npm install
npm run dev                                # API em http://localhost:3333 (roda as migrations pendentes)
npm run seed                               # dados de demonstração (avisa se já aplicado)
npm run seed -- --reset                    # apaga tudo e recria

# testes
npm run test:db                            # Postgres descartável na 5434
npm test
npm run test:db:stop
```

As variáveis de teste ficam em `tests/setup.ts` (não há `.env.test`). O harness recusa qualquer banco cujo nome não termine em `_test`.

### Logins do seed

| Quem | Login | Senha |
|---|---|---|
| Recepção | `recepcao@ubs.local` | `123456` |
| ACS | `acs@ubs.local` | `123456` |
| Gestor | `gestor@ubs.local` | `123456` |
| Pacientes | CPF (ver `src/seeds/dados/pacientes.ts`). Osvaldo Menezes `12345678909` (Rua das Flores, Dra. Helena); Maria `11122233396`; Rita Lima está sem rua | `123456` (Fernanda ainda com troca obrigatória) |

### Roteiro de ponta a ponta (dev)

1. `POST /auth/equipe/entrar` como recepção e guardar o token.
2. `GET /slots?tipoAtendimentoId=1&de=<hoje+20>` e `POST /equipe/agendamentos { pacienteId, slotId }`: nasce PENDENTE.
3. `POST /dev/relogio/avancar { "dias": 14 }` e `GET /dev/envios`: aparecem D-14 e D-7 com o link.
4. Abrir o link no navegador e tocar em Confirmar: a página passa a mostrar "Presença confirmada".
5. `POST /auth/paciente/entrar` com o CPF e `GET /agendamentos/meus`: status CONFIRMADO.
6. `POST /agendamentos/:id/remarcar { slotId }` como paciente: o antigo fica REMARCADO e o link antigo mostra "remarcada para ...".
7. Avançar até o dia e `POST /equipe/agendamentos/:id/presenca { "resultado": "COMPARECEU" }`.
8. `POST /dev/relogio/zerar` para voltar ao relógio real. `npm run seed -- --reset` recria os dados.

## 14. Contrato da API

Base: `http://localhost:3333` em dev. JSON em tudo, exceto a página do link (HTML). Autenticação por `Authorization: Bearer <token>`. Erros sempre como `{ "message": "texto para o usuário" }`; erros de validação trazem também `errors: [{ campo, mensagem }]`.

| Código | Quando |
|---|---|
| 400 | dados inválidos ou regra de prazo (RN-03, horário passado, presença antes do dia) |
| 401 | sem login, token inválido ou senha errada |
| 403 | perfil sem permissão, regra de acesso (RN-01, RN-02) ou senha provisória pendente |
| 404 | não existe ou é de outra UBS / outro paciente |
| 409 | conflito de estado (RN-04, slot ocupado, consulta já cancelada/remarcada/realizada) |

### Autenticação

| Método e rota | Quem | Corpo | Resposta |
|---|---|---|---|
| `POST /auth/equipe/entrar` | público | `{ email, senha }` | `{ token, usuario: { id, ubsId, nome, email, perfil } }` |
| `POST /auth/paciente/entrar` | público | `{ cpf, senha }` (CPF com ou sem máscara) | `{ token, deveTrocarSenha, paciente }` |
| `POST /auth/paciente/trocar-senha` | paciente (mesmo com senha provisória) | `{ senhaAtual, novaSenha }` | `{ token, deveTrocarSenha: false, paciente }` (use o token novo) |
| `GET /auth/eu` | qualquer logado | — | `{ tipo: "EQUIPE", usuario }` ou `{ tipo: "PACIENTE", paciente }` |
| `PATCH /auth/paciente/canais` | paciente | `{ canais: ["PUSH", "WHATSAPP", "SMS", "EMAIL"] }` (os ligados) | paciente; os canais fora da lista ficam `{ aceito: false, em }` (RN-80) |

O paciente (para ele mesmo e para a equipe) traz também `rua: { id, nome } | null`, `numero` e `medicoReferencia: { id, nome } | null`, usado em "Seu médico: Dra. Helena (pela sua rua)".

Enquanto `deveTrocarSenha` for `true`, o paciente só consegue usar `trocar-senha` e `/auth/eu` (403 no resto).

### Catálogo e horários

| Método e rota | Quem | Parâmetros | Resposta |
|---|---|---|---|
| `GET /tipos-atendimento` | equipe ou paciente | — | `[{ id, nome, categoria, duracaoMin, antecedenciaMaximaDias, permiteAgendamentoApp, instrucoesPreparo }]` (paciente: só liberados, RN-01) |
| `GET /profissionais` | equipe ou paciente | — | `[{ id, nome, funcao, categoria }]` |
| `GET /ruas` | equipe | — | `[{ id, nome, medicoReferencia: { id, nome } }]` (cadastro do paciente) |
| `GET /slots` | equipe ou paciente | `tipoAtendimentoId` (obrigatório para paciente), `profissionalId`, `de`, `ate` (AAAA-MM-DD), `status` (só equipe; padrão LIVRE), `pacienteId` (só equipe; exige `tipoAtendimentoId`) | `[{ id, inicio, fim, profissional, tipoAtendimento }]`; a equipe recebe também `origem` e `status`. Em consulta médica, o paciente (e a equipe com `pacienteId`) só recebe horários do médico da rua (RN-06) |
| `POST /slots/lote` | recepção, gestor | `{ profissionalId, tipoAtendimentoId, dataInicio, dataFim, horaInicio, horaFim, apenasDiasUteis? }` | `{ criados, ignorados, cotaApp, cotaAppPercentual }` |

### Agendamentos (app do paciente)

| Método e rota | Corpo | Resposta |
|---|---|---|
| `POST /agendamentos` | `{ slotId }` | 201 + agendamento |
| `GET /agendamentos/meus` | — | `{ proximos: [agendamento], historico: [agendamento] }` |
| `POST /agendamentos/:id/confirmar` | — | agendamento (idempotente) |
| `POST /agendamentos/:id/cancelar` | — | agendamento (idempotente) |
| `POST /agendamentos/:id/remarcar` | `{ slotId }` | o agendamento **novo** (idempotente para o mesmo slot) |

Formato do agendamento para o paciente:

```json
{
  "id": 4, "status": "CONFIRMADO", "origem": "REMARCACAO",
  "inicio": "2026-11-30T11:40:00.000Z", "fim": "2026-11-30T12:00:00.000Z",
  "remarcadoDeId": 3, "confirmadoEm": "...", "canceladoEm": null, "criadoEm": "...",
  "tipoAtendimento": { "id": 1, "nome": "Consulta clínica geral", "categoria": "CONSULTA", "instrucoesPreparo": null },
  "profissional": { "id": 1, "nome": "Dra. Helena", "funcao": "médico" },
  "ubs": { "nome": "UBS Feitoria", "endereco": "...", "telefone": "..." },
  "acoes": { "confirmar": false, "cancelar": true, "remarcar": true }
}
```

`acoes` diz quais botões mostrar; a API valida de novo em cada ação. `tipoAtendimento.categoria` é `CONSULTA` (etiqueta "Médico") ou `PROCEDIMENTO` (etiqueta "Enfermagem").

Erros de RN-06: 400 "Cadastre a rua do paciente na recepção para agendar consulta médica" e 403 "Este horário é de outro médico. Consultas médicas são com o médico da sua rua".

### Painel da UBS

| Método e rota | Quem | Corpo / parâmetros | Resposta |
|---|---|---|---|
| `POST /pacientes` | recepção, gestor | `{ nome, cpf, dataNascimento, ruaId, numero, cns?, telefone?, email?, possuiCelular, consentimentoCanais: ["WHATSAPP", "SMS", ...] }` | 201 `{ paciente, senhaProvisoria }` (a senha só aparece aqui) |
| `PATCH /pacientes/:id/endereco` | recepção, gestor | `{ ruaId, numero }` | paciente, com o novo médico de referência |
| `GET /pacientes` | equipe | `q` (nome ou início do CPF) | `[paciente]` com `pontuacao` e `vulneravel` |
| `GET /pacientes/:id` | equipe | — | paciente |
| `POST /pacientes/:id/redefinir-senha` | recepção, gestor | — | `{ paciente, senhaProvisoria }` |
| `POST /equipe/agendamentos` | recepção, gestor | `{ pacienteId, slotId }` | 201 + agendamento da equipe |
| `GET /equipe/agenda` | equipe | `data` (AAAA-MM-DD), `profissionalId?`, `categoria?` (`CONSULTA` = Médico, `PROCEDIMENTO` = Enfermagem) | `[agendamento da equipe]` do dia |
| `POST /equipe/agendamentos/:id/confirmar` · `/cancelar` · `/remarcar` | recepção, gestor | remarcar: `{ slotId }` | agendamento da equipe |
| `POST /equipe/agendamentos/:id/presenca` | recepção, gestor | `{ resultado: "COMPARECEU" \| "FALTOU" }` | agendamento da equipe |

O agendamento da equipe é o do paciente mais `slotId`, `criadoPorTipo`, `canceladoPorTipo`, `presencaRegistradaEm` e `paciente: { id, nome, cpf, telefone, vulneravel }` (RN-52: o selo só aparece aqui).

### Página do link (HTML, sem login)

| Método e rota | O que faz |
|---|---|
| `GET /l/:token` | mostra a consulta e os botões possíveis; 404 link inválido, 410 link expirado |
| `POST /l/:token/confirmar` | confirma e redireciona (303) para `/l/:token?ok=confirmado` |
| `GET /l/:token/cancelar` · `POST /l/:token/cancelar` | pede confirmação · cancela e redireciona |
| `GET /l/:token/remarcar` · `POST /l/:token/remarcar` (form `slotId`) | lista horários · remarca e redireciona |

### Desenvolvimento (fora de produção, login de equipe)

| Método e rota | O que faz |
|---|---|
| `GET /dev/relogio` | `{ agora, deslocamentoMs, congelado, jobs }` |
| `POST /dev/relogio/avancar` | `{ dias?, horas?, minutos? }`: avança em passos de 1h rodando os jobs |
| `POST /dev/relogio/definir` | `{ para: "2026-11-20T07:00:00-03:00" }` |
| `POST /dev/relogio/zerar` | volta ao relógio real |
| `POST /dev/jobs/rodar` | roda os jobs uma vez agora |
| `GET /dev/envios?limite=` · `DELETE /dev/envios` | caixa de saída do mock (texto, canal, link de cada envio) |
