# Telas do Claude Design

Exportadas em 14/11/2026, uma pasta por tela. Cada pasta é uma **referência visual, não código de produção**: cores, fontes, tamanhos, espaçamentos, raios e sombras estão nos atributos `style="…"` e no bloco `<helmet><style>` do arquivo principal (`*.dc.html`). Replique esses valores no tema (`useTheme`) e nos componentes do app; não copie o HTML.

**Para ver uma tela no navegador:** `cd` na pasta dela, rode `python3 -m http.server` e abra o arquivo principal. Abrindo direto pelo `file://`, alguns navegadores bloqueiam os scripts.

Em cada pasta, `support.js` e `vendor/` são só o motor que desenha a tela no navegador. Os arquivos `Nav*.dc.html` são as barras de navegação, e os outros `*.dc.html` são telas vizinhas usadas como base, por exemplo `Agendar.dc.html` é a moldura do fluxo de agendar.

## App do paciente (`paciente/`)

| Pasta | Tela | Arquivo principal | API |
|---|---|---|---|
| `entrar-paciente-com-cpf-e-senha` | Entrar | `Entrar.dc.html` | Pronta |
| `crie-sua-senha` | Crie sua senha (primeiro acesso) | `TrocarSenha.dc.html` | Pronta |
| `meus-atendimentos-confirmado-e-historico` | Meus atendimentos, e a versão confirmada com histórico | `MeusAtendimentos.dc.html`, `MeusAtendimentosConfirmado.dc.html` | Pronta |
| `agendar-fluxo-completo` | Agendar: fluxo completo interativo (passo 1, Médico ou Enfermagem) | `Agendar.dc.html` | Pronta |
| `agendar-2-qual-consulta` | Agendar 2: qual consulta | `AgendarConsulta.dc.html` | Pronta |
| `agendar-2-qual-procedimento` | Agendar 2: qual procedimento | `AgendarProcedimento.dc.html` | Pronta |
| `agendar-3-horario-com-a-enfermagem` | Agendar 3: horário | `AgendarHorario.dc.html` | Pronta |
| `agendar-4-resumo` | Agendar 4: resumo | `AgendarResumo.dc.html` | Pronta |
| `agendar-4-atendimento-marcado` | Agendar 4: atendimento marcado | `AgendarSucesso.dc.html` | Pronta |
| `erro-horario-acabou-de-ser-ocupado` | Erro: horário ocupado | `AgendarOcupado.dc.html` | Pronta |
| `erro-ja-tem-consulta-clinica-geral` | Erro: já tem Consulta clínica geral (RN-04) | `AgendarDuplicado.dc.html` | Pronta |
| `remarcar` | Remarcar (RN-22) | `Remarcar.dc.html` | Pronta |
| `cancelar-com-aviso` | Cancelar com aviso (RN-21) | `Cancelar.dc.html` | Pronta |
| `perfil-do-paciente` | Perfil: canais de aviso e seu médico | `Perfil.dc.html` | Pronta |
| `menu-de-acessibilidade` | Menu de acessibilidade | `Acessibilidade.dc.html` | Sem API (fica no aparelho) |
| `lembrete-confirmar-cancelar-remarcar` | Detalhe com os avisos da consulta (RN-10 a 22) | `Lembrete.dc.html` | Parcial: a linha do tempo de avisos não tem rota (dados falsos) |
| `cancelada-sem-resposta-48h-antes` | Cancelada sem resposta (RN-26) | `SemResposta.dc.html` | Dados falsos (Camada 2) |
| `oferta-de-vaga-mais-cedo` | Oferta de vaga mais cedo (RN-25, 32, 35) | `OfertaVaga.dc.html` | Dados falsos (Camada 2) |
| `ofertas-e-suplentes-pontuacao-sem-numero` | Ofertas, suplentes e aviso de pontuação (RN-36, 40) | `Compromisso.dc.html` | Dados falsos (Camada 2) |

## Painel da equipe (`equipe/`)

| Pasta | Tela | Arquivo principal | API |
|---|---|---|---|
| `entrar-com-e-mail-e-senha` | Entrar da equipe | `EquipeEntrar.dc.html` | Pronta |
| `agenda-do-dia-e-presenca` | Agenda de hoje com filtros e presença | `EquipeAgenda.dc.html` | Pronta (contadores de reaproveitadas: Camada 2) |
| `pacientes-com-busca` | Pacientes com busca | `EquipePacientes.dc.html` | Pronta |
| `cadastrar-paciente-medico-pela-rua` | Cadastrar paciente (médico pela rua) | `EquipeCadastro.dc.html` | Pronta |
| `senha-provisoria-gerada` | Senha provisória gerada | `EquipeSenhaGerada.dc.html` | Pronta |
| `agendar-pela-recepcao` | Agendar pela recepção (todos os horários) | `EquipeAgendar.dc.html` | Pronta |
| `relogio-de-testes` | Relógio de testes (RN-90) | `EquipeRelogio.dc.html` | Pronta (só fora de produção) |
| `contato-consentimento-e-selo` | Ficha do paciente: contato, consentimento e selo (RN-50, 55, 80) | `EquipePaciente.dc.html` | Parcial: endereço e canais prontos; contato e selo são da Camada 2 |
| `ofertas-em-andamento` | Ofertas em andamento (RN-30 a 34) | `EquipeVagas.dc.html` | Dados falsos (Camada 2) |
| `alertas-de-vulneraveis` | Alertas de vulneráveis (RN-27) | `EquipeAlertas.dc.html` | Dados falsos (Camada 2) |

## Página do link (`link/`), HTML do backend, fora do app

Estas telas não são construídas no app. A página do link é servida pelo backend (`backend/src/web/`), e estes arquivos servem de referência para um ajuste visual futuro desse HTML.

| Pasta | Tela | Arquivo principal |
|---|---|---|
| `pagina-do-link-contato` | Link do contato, Lúcia (RN-70 a 73) | `LinkConsulta.dc.html` |
| `link-presenca-confirmada` | Link do paciente e presença confirmada | `LinkPaciente.dc.html`, `LinkConfirmado.dc.html` |
| `link-remarcar-por-dia` | Remarcar por dia | `LinkRemarcar.dc.html` |
| `link-final-ja-remarcado` | Já remarcado | `LinkRemarcado.dc.html` |
| `link-final-ja-cancelado` | Já cancelado | `LinkCancelado.dc.html` |
| `link-final-expirado` | Link expirado | `LinkExpirado.dc.html` |

## Componentes (`componentes/`)

| Pasta | O que é |
|---|---|
| `navegacao-do-paciente` | Barra inferior do app do paciente |
| `navegacao-da-equipe` | Barra inferior do painel da equipe |

## Referência de fluxo

`referencia-fluxo-medico-enfermagem.html` é o protótipo que define o modelo Médico × Enfermagem e o médico pela rua (RN-06 no SPEC). Ele não é uma tela a reproduzir.

## Não exportadas

- **Mensagens ao contato** (SMS, WhatsApp e e-mail) e **lembrete do paciente pelo WhatsApp:** são textos enviados pelo backend e não entram no app.
