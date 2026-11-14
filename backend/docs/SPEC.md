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
| `CategoriaAtendimento` | `CONSULTA`, `EXAME` |
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
- **Profissional:** `id`, `ubsId`, `nome`, `funcao` (médico, enfermeiro, dentista, técnico)
- **TipoAtendimento:** `id`, `ubsId`, `nome`, `categoria: CategoriaAtendimento`, `duracaoMin`, `antecedenciaMaximaDias`, `permiteAgendamentoApp`, `instrucoesPreparo?`
- **Slot:** `id`, `profissionalId`, `tipoAtendimentoId`, `inicio`, `fim`, `origem: OrigemSlot`, `status: StatusSlot`
- **Paciente:** `id`, `ubsId`, `nome`, `cpf`, `cns?`, `dataNascimento`, `telefone?`, `email?`, `possuiCelular`, `pushToken?`, `pontuacao` (inicial 100), `vulneravel`, `vulneravelAtribuidoPor?`, `vulneravelEm?`, `consentimentoCanais` (por canal: aceito e data), `senhaHash?`, **`deveTrocarSenha`** (acréscimo: senha provisória, ver seção 10)
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

São 3 superfícies: o app (paciente e contato vinculado no mesmo app), a página do link e o painel da UBS. **Nesta fase só a página do link é implementada (é servida pelo backend). O app e o painel ficam para depois.**

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

### Decisão de front (13/11)

O app vai usar **`useTheme`** para cores e tema. Mais nada do front foi definido ainda; o `frontend/AGENTS.md` (plugin Expo) pede Expo Router com rotas em `src/app/`.

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

- ☐ **"Próximo paciente compatível"** (camada 2): mesmo tipo de atendimento na mesma UBS (padrão atual da RN-31) ou mesmo profissional? Na APS o paciente costuma ser acompanhado pela mesma equipe.
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

### Premissas adotadas na Camada 1 (o usuário pode revisar)

1. **RN-03 e RN-04 valem para recepção e app**: o texto fala do tipo/paciente, não do ator. RN-01 e RN-02 são explicitamente por ator.
2. **Hora de envio**: D-14, D-7 e D-3 saem na mesma hora de `lembrete.d0Hora` (07:00), única chave de hora da seção 7.
3. **Token do link (RN-70)**: um por (agendamento, destinatário), reaproveitado nas etapas seguintes; expira no horário da consulta. O banco guarda só o hash SHA-256.
4. **Paciente sem canal** na Camada 1: a notificação é criada e "enviada" pelo adaptador mock assim mesmo (o contato vinculado só entra na Camada 2).
5. **Campos extras** ao modelo da seção 5: `Paciente.deveTrocarSenha` (senha provisória) e `Agendamento.criadoEm` (ordenação). Nada mais foi acrescentado.
6. **Presença** (`COMPARECEU`/`FALTOU`) só pode ser registrada a partir do início do dia da consulta.
7. **Portas**: API 3333; Postgres dev 5433; Postgres de teste 5434.
8. **Git**: branch `feat/camada-1`, um commit por parte, sem push até o usuário pedir.
9. **RN-52 desde já**: mappers e página do link nunca expõem `vulneravel`, mesmo o selo sendo Camada 2.
10. **Fuso**: `TZ=America/Sao_Paulo` fixado em `config/env.ts`; colunas `timestamptz`.
11. **Relógio de dev** avança em passos de 60 min rodando os jobs a cada passo, para manter a ordem D-14 → D-7 → D-3 → D-0 mesmo num salto de 14 dias.

## 11. Estado da implementação

Atualizado ao fim de cada parte. ☑ = feito e testado, ☐ = pendente.

**Camada 1 (plano aprovado em 13/11, só backend)**

| Parte | Item da seção 8 | RN | Estado | Commit |
|---|---|---|---|---|
| 0 | Estrutura base, Postgres, harness de testes, SPEC.md e CLAUDE.md | — | ☑ | (ver `git log`) |
| 1 | Modelo de dados, migração inicial e seed | seção 5 e 7 | ☑ | |
| 2 | `Clock` injetável, runner de jobs e endpoints `/dev` | RN-90 | ☑ | |
| 3 | `ConfiguracaoService` (global + sobrescrita por UBS) | seção 7 | ☐ | |
| 4 | Autenticação da equipe e do paciente; cadastro com senha provisória | seção 6, RN-52 | ☐ | |
| 5 | Slots com cota, agendar pela recepção e pelo app | RN-01 a RN-05, RN-82 | ☐ | |
| 6 | Lembretes D-14/D-7/D-3/D-0 via job, canal mock, token do link | RN-10 a RN-13, RN-63, RN-70 | ☐ | |
| 7 | Confirmar, cancelar e remarcar | RN-20 a RN-22, RN-71, RN-82 | ☐ | |
| 8 | Página do link | RN-70 a RN-73 | ☐ | |
| 9 | Registro de comparecimento ou falta | fluxo C, RN-82 | ☐ | |
| 10 | Fechamento: estado, mapa RN → código, contrato da API | — | ☐ | |

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

## 14. Contrato da API

Preenchido na Parte 10, para o app consumir. Até lá, os endpoints de cada parte estão descritos na seção 11 e nos testes.
