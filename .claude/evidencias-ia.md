# Evidências de utilização de agentes de IA — Fase 1

Este ficheiro reúne a configuração dos agentes, as tarefas apoiadas, os commits resultantes e a validação feita pela equipa. A utilização de IA na **especificação** (casos de uso e ERS) está documentada na secção 3 de cada ficheiro em `use-cases/` (`trim.md`, `filtros.md`, `legendas.md`, `upload.md`). Aqui regista-se sobretudo o apoio ao **código e aos testes**.

## 1. Ferramentas, modelos e configuração

| Ferramenta | Modelos | Configuração | Quem usou |
| --- | --- | --- | --- |
| Claude Code (app de desktop) | Claude Opus 5.5 na conversa principal; Sonnet 5.5, Haiku 5.5 e Opus 5.5 nos subagentes | Plugins em `.claude/settings.json`: **superpowers** 7.0.0 (skills de processo) e **ponytail** 4.8.4 (preferência por soluções simples)  |
| Claude (claude.ai) | — | Sem configuração específica | Equipa (ver `use-cases/*.md`, secção 3) |
| ChatGPT (OpenAI) | — | Sem configuração específica | Equipa (ver `use-cases/*.md`, secção 3) |

**Skills utilizadas no Claude Code** (do plugin superpowers e das skills incluídas no Claude Code):

| Skill | Para quê |
| --- | --- |
| `superpowers:writing-plans` | Plano de implementação das legendas, a partir do `legendas.md`, revisto pelo aluno antes de começar |
| `superpowers:subagent-driven-development` | Implementação do plano por tarefas, cada uma feita por um subagente e revista antes da seguinte |


**Instruções dadas ao agente durante o trabalho** (na conversa, não num ficheiro):

- Os planos de implementação ficam fora do repositório; o aluno revê-os antes da implementação.
- Pedidos de análise sem alterações antes de cada decisão.

## 2. Tarefas apoiadas, commits e validação

Os commits abaixo foram preparados pelo Claude Code nas sessões indicadas e registados em nome do aluno, depois de revistos. As mensagens de commit não referem a IA; esta tabela é a referência.

| Data | Tarefa apoiada | Caso de uso | Commits | Validação feita pela equipa |
| --- | --- | --- | --- | --- |
| 14/10 | Pôr o stack a correr (`docker compose`) e perceber como a base guarda as imagens editadas | — | — | Execução local da aplicação |
| 14/10 | Propostas de implementação das legendas a partir do caso de uso; verificar se o Whisper deteta o idioma | UC-VID-003 | — | Comparação das propostas com o caso de uso e os requisitos |
| 18/10 | Alinhar o `legendas.md` com o upload e o recorte | UC-VID-003 | `9e3b6fb`, `dce6d01` | Leitura das diferenças propostas antes de aplicar |
| 18/10 | Plano técnico e implementação das legendas com subagentes: formatação WebVTT, serviço de fala (Whisper), processamento em segundo plano, rotas na API, painel e leitor no editor, limpeza ao eliminar | UC-VID-003 | `3c2f228`, `506b8ff`, `b7b0d6b`, `bc81ab4`, `d8f1c4f`, `2f9224f`, `93ddc53`, `b47f919`, `1b75921`, `bf25320`, `839fcbe`, `c7bdc9a`, `5dbd874`, `28702ea`, `773f848` | Plano revisto pelo aluno antes da implementação; testes automáticos de formatação; testes manuais no browser com o stack completo |
| 18/10 | Correção do contador de operações depois das legendas | UC-VID-003 | `2ccfc3c` | Defeito encontrado no teste manual no browser |
| 18/10 | Manter as legendas quando se aplica um filtro (requisito e código) | UC-VID-002, UC-VID-003 | `893e01c`, `ab70e31` | Pesquisa nos requisitos antes de decidir; teste manual |
| 18/10 | Legendas só em inglês, com verificação do idioma | UC-VID-003 | `12b79d6`, `63f70bd`, `1074fb9`, `b580251` | Decisão de âmbito tomada pelo aluno (a deteção automática levaria a tradução, que não está especificada) |
| 18/10 | Registar no `legendas.md` o que foi implementado e passá-lo para o formato da ERS | UC-VID-003 | `fc77c4f`, `746123e`, `8aef28e`, `9b2675b` | Comportamentos confirmados na aplicação antes de entrarem no documento |
| 19–20/10 | Rever o `legendas.md` face às diretrizes: exceções, questões em aberto, requisitos não atómicos, elementos da baseline | UC-VID-003 | `5fcf1e2`, `bf773a9`, `1a416ce`, `95ad1d5`, `0b47ef2` | Lista de problemas pedida primeiro; o aluno escolheu quais aplicar |
| 20/10 | Coerência entre os ficheiros dos casos de uso: formato, numeração, quota, legendas nos filtros, upload no formato da ERS, questões decididas | Todos | `6ecced4`, `a2575b8`, `55329bb`, `7b451e1`, `99bd15c`, `f872b81`, `27907b0`, `f964b3a`, `77b8d61`, `a3199ce`, `6c18b01`, `04ef9b2`, `5dcccec` | Inconsistências listadas primeiro; aplicadas por pontos escolhidos pelo aluno |
| 20/10 | Coerência do código entre ferramentas: interface em inglês, cancelamento no logout, estado dos filtros, avisos, contador, mensagens de falha, quota e espaço | UC-VID-001, UC-VID-002 | `a3510d8`, `1917318`, `7f5cf71`, `f8b51e1`, `97accec`, `4789c2d`, `6868ca2`, `4fc5d62`, `0e5e54e`, `1a2b91f`, `e513f51`, `d51b5d5` | Lista revista pelo aluno; a "lista de pedidos" ficou adiada por decisão do grupo |
| 20/10 | Requisitos partilhados (REQ-VID-STATUS), fila global como alvo de produção, ligação às RNG | Todos | `3d70933`, `31b2056`, `6fb5cf7`, `95c2fb6`, `809e215`, `5a561ae`, `42da589` | Decisões discutidas com o grupo (fila global adiada para produção) |
| 20/10 | Notificações de progresso nos filtros e legendas como no recorte, `.dockerignore`, causa do erro nos filtros, diálogos em vez de avisos do browser | UC-VID-002, UC-VID-003 | `94539ed`, `f2f7265`, `46b5f58`, `dc5f62e` | Problemas reportados por um colega no teste manual; correções verificadas no browser |
| 20–21/10 | Testes automáticos das legendas: rota, processamento (sucesso, falhas, cancelamento) e integração com vídeo real, FFmpeg real e serviço de fala falso | UC-VID-003 | `53e902d` | Execução da suite: 115 testes, todos a passar |
| 21/10 | Verificação do que falta para a entrega; vídeos de teste no repositório | — | `38e1ee7` | Lista revista pelo aluno |

## 3. Análise crítica

**O que correu bem.** O agente acelerou a escrita de código repetitivo (rotas, modelo, processamento em segundo plano) e a deteção de inconsistências entre os quatro casos de uso, que tinham sido escritos por pessoas diferentes. Pedir primeiro uma lista, sem alterações, deu à equipa controlo sobre o que entrava.

**Onde a IA falhou ou precisou de correção.**

- O contador de operações não era atualizado depois das legendas. Só apareceu no teste manual no browser (`2ccfc3c`).
- A deteção automática de idioma do Whisper abria a porta à tradução de vídeos, que não estava especificada. O aluno restringiu as legendas a inglês (`12b79d6` e seguintes).
- Filtros e legendas mostravam "Status: Completed" antes de começar e usavam avisos do browser, ao contrário do recorte. Foram detetados por um colega e corrigidos (`94539ed`, `dc5f62e`).
- A IA tende a propor funcionalidades além do pedido (por exemplo, fila global, lista de pedidos). Essas propostas foram adiadas ou registadas como alvo de produção, e não implementadas.

**Práticas adotadas.** Plano revisto antes de implementar; pedidos de análise sem alterações.

## 4. Prompts relevantes

Os pedidos feitos ao Claude Code estão em [`claude_opus55.md`](claude_opus55.md), por sessão e com data.
