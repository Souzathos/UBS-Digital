# Offline-first no app (esboço) — design

Data: 2026-11-14 · Escopo: `frontend/` · Regra tocada: RN-20 (confirmar)

## Objetivo

Deixar escrita, no app, a base de um funcionamento offline-first em três partes:

1. **Armazenar localmente** no aparelho.
2. **Monitorar a conexão** com a internet.
3. **Sincronizar** com o backend, assim que a rede voltar, o que foi feito offline.

É um **esboço**: precisa existir, tipar, passar nos testes unitários e estar documentado, mas **não é ligado a nenhuma tela** nem muda nada visível. Só a ação "confirmar consulta" (RN-20) entra como caso de exemplo.

## Decisões

- **Abordagem A:** módulo próprio `frontend/src/offline/`, com AsyncStorage (já instalado) e NetInfo (novo). O TanStack Query continua cuidando das leituras. Descartados: persistência de mutações do TanStack Query (conflito de vaga fica desajeitado) e SQLite/WatermelonDB (exagero).
- **Caso de uso inicial:** só confirmar consulta. Cancelar e remarcar ficam para depois.
- **Sem mudança no backend.** Um 4xx já devolve mensagem em pt-BR dentro de `AppError`.
- **Token fora do armazenamento comum.** O token continua só no SecureStore (`sessao/armazenamento.ts`).

## Peças

Tudo em `frontend/src/offline/`. Cada peça tem uma interface, uma implementação real e uma versão em memória para os testes.

### 1. `armazenamento/`

- `ArmazenamentoLocal`: `ler<T>(chave)`, `gravar(chave, valor)`, `apagar(chave)`. Guarda JSON com um número de versão do formato; versão desconhecida vale como "não existe".
- `armazenamentoAsync.ts`: implementação sobre o AsyncStorage. Falha de leitura vira `null`, sem derrubar o app.
- `armazenamentoMemoria.ts`: implementação para testes.
- **Cache de leitura:** instantâneo de "meus atendimentos" com a data da última atualização, para o app mostrar a última lista conhecida sem rede. As chaves ficam em um lugar só, com o prefixo `ubs.offline.`.

### 2. `rede/`

- `MonitorDeRede`: `estaOnline(): Promise<boolean>` e `observar(cb): () => void`.
- `monitorNetInfo.ts`: implementação sobre `@react-native-community/netinfo`, instalado com `npx expo install`. "Online" exige conectado **e** internet alcançável (`isInternetReachable !== false`).
- `monitorFalso.ts`: implementação para testes, com `definirOnline(bool)`.
- Hook `useOnline()` e ligação com o `onlineManager` do TanStack Query: as consultas pausam e retomam sozinhas.

### 3. `fila/`

- **Item da fila:** `id` local (UUID), `tipo` (por ora só `CONFIRMAR_AGENDAMENTO`), `agendamentoId`, `criadoEm`, `tentativas`, `estado` (`PENDENTE`, `ENVIANDO`).
- `FilaDeSincronizacao`: `enfileirar`, `listar`, `remover`, `marcar`. Persistida pelo `ArmazenamentoLocal`; os itens saem na ordem de chegada. Um item que ficou em `ENVIANDO` quando o app fechou volta para `PENDENTE` ao carregar.
- **Avisos de conflito:** lista persistida de `{ itemId, agendamentoId, mensagem, em }` para o app mostrar depois. Não é exibida em nenhuma tela por enquanto.
- `Sincronizador`: escuta o `MonitorDeRede`. Quando a rede volta (e também ao iniciar, se já estiver online), esvazia a fila item a item pelos serviços de `servicos/`. Nunca roda duas drenagens ao mesmo tempo.

**Política por resposta do servidor** (usa `ApiErro.status`):

| Resposta | O que a fila faz |
|---|---|
| Sucesso | Remove o item e invalida `chaves.meusAtendimentos`. |
| status 0 (sem conexão) | Mantém o item como `PENDENTE`, para de drenar e espera a próxima mudança de rede. |
| 4xx (conflito, prazo vencido, já cancelado) | Remove o item, grava um aviso de conflito com a mensagem da API e **não repete**. Um 401 não conta aqui: o cliente já encerra a sessão. |
| 5xx | Mantém o item, incrementa `tentativas` e tenta de novo na próxima drenagem, até o limite (5); passado o limite, trata como falha definitiva e vira aviso. |

A hora (`criadoEm`, `em`) vem de um relógio injetado, não de `Date.now()` solto, para o teste controlar. O limite de 5 tentativas é uma constante nomeada em `fila/`.

### 4. Caso de exemplo — `acoes/confirmarOffline.ts`

`confirmarOffline(id)`: tenta `servicos.agendamentos.confirmar(id)`. Se der status 0, enfileira `CONFIRMAR_AGENDAMENTO` e devolve `{ enviado: false, pendente: true }`; se tiver sucesso, devolve `{ enviado: true, agendamento }`. Outros erros sobem como estão. **Nenhuma tela chama essa função ainda.**

### 5. `OfflineProvider`

Monta o monitor, a fila e o sincronizador, arranca o `Sincronizador` e o desliga ao desmontar. Entra no `_layout.tsx` dentro do `QueryClientProvider` e ao lado do `SessaoProvider`. Não renderiza nada novo.

## Fora do escopo

Remarcar e cancelar offline; resolução automática de conflito; indicador de "sem conexão" nas telas; sincronização de dados da equipe; mudanças no backend.

## Testes

Jest, em `frontend/src/offline/__tests__/`, com armazenamento, rede e relógio falsos. Os nomes citam RN-20.

- enfileira quando está sem rede (RN-20);
- drena na ordem quando a rede volta (RN-20);
- remove o item e invalida a lista no sucesso (RN-20);
- 4xx vira aviso de conflito e não repete (RN-20);
- status 0 mantém o item e para de drenar (RN-20);
- 5xx incrementa tentativas e respeita o limite (RN-20);
- a fila sobrevive a "reiniciar" o app (novo objeto sobre o mesmo armazenamento), inclusive item preso em `ENVIANDO` (RN-20);
- duas drenagens simultâneas não duplicam o envio (RN-20).

Verificação final: `npm run typecheck && npm run lint && npm test` em `frontend/`.

## Documentação

- `backend/docs/SPEC.md`: seção curta "Offline-first (esboço)" com as decisões acima, o estado (**esboçado, não ligado às telas**) e o mapa RN-20 → `frontend/src/offline/`.
- `CLAUDE.md`: uma linha na estrutura do app (`offline/`).

## Riscos conhecidos

- O NetInfo tem código nativo. No Expo Go ele já vem incluído; em build próprio precisa de um novo build de desenvolvimento.
- Confirmar um pedido tarde pode esbarrar em prazo, status ou vaga que mudaram. Por isso o 4xx nunca é repetido e vira aviso, em vez de resolvido sozinho.
- A fila no AsyncStorage não é criptografada. Ela guarda só ids de agendamento, sem dados pessoais.
