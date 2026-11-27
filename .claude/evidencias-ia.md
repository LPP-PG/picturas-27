# Evidências de utilização de agentes de IA — Fase 2

Este ficheiro reúne a configuração do agente, as tarefas apoiadas, os commits resultantes e a validação feita no trabalho de manutenibilidade (QS-02) e na escrita do relatório. A utilização de outras ferramentas de IA pela equipa está descrita no capítulo 12 do relatório.

## 1. Ferramentas, modelos e configuração

| Ferramenta | Modelo | Configuração |
| --- | --- | --- |
| Claude Code (app de desktop) | Claude Opus 5.5, em todas as sessões | Plugins em `.claude/settings.json`: **superpowers** (skills de processo) e **ponytail** (preferência por soluções simples). Instruções de projeto no `AGENTS.md`, lido pelo agente no início de cada sessão |
| Claude in Chrome (extensão do Claude Code) | Claude Opus 5.5 | Usada para editar o relatório no Google Docs, a partir do Claude Code |
| Conector do Google Drive | — | Usado para ler a versão guardada do relatório e confirmar cada edição |

**Skills utilizadas:**

| Skill | Para quê |
| --- | --- |
| `superpowers:systematic-debugging` | Diagnóstico de erros na aplicação local antes de propor correções |
| `humanizer` | Revisão do texto do `medicoes/manutenibilidade.md` e do capítulo 11 do relatório |
| `chrome-browser` | Edição do relatório no Google Docs |

**Instruções dadas ao agente durante o trabalho** (na conversa, não num ficheiro):

- Os planos de implementação ficam fora do repositório.
- Os commits ficam só em nome do aluno, com mensagens simples, e o push é feito pelo aluno.
- Pedidos de análise sem alterações antes de cada decisão.

O `AGENTS.md` foi atualizado pelo agente sempre que a estrutura mudou (`c344b60`, `78daf2b`), para que as sessões seguintes partissem da arquitetura atual.

## 2. Tarefas apoiadas, commits e validação

Os commits abaixo foram preparados pelo Claude Code e registados em nome do aluno, depois de revistos. As mensagens de commit não referem a IA; esta tabela é a referência.

| Data | Tarefa apoiada | Commits | Validação feita pela equipa |
| --- | --- | --- | --- |
| 09–12/11 | Leitura das diretrizes da Fase 2, escolha do requisito não funcional e identificação dos serviços envolvidos | — | Decisão tomada pelo grupo |
| 14/11 | Explicação da duplicação dos filtros PIL entre as ferramentas de imagem e o serviço de vídeo | — | Duplicação confirmada no commit de partida `0523102` |
| 14/11 | Filtros PIL num único módulo, usado pelas ferramentas de imagem e pelo serviço de vídeo | `e637801`, `2994543`, `c344b60` | Comparação píxel a píxel dos 8 filtros antigos e novos, isolados e encadeados, com imagens a cores, com paleta, em cinzentos e com transparência. O script de medição da modularidade continuou a dar 0/3 → 3/3 |
| 14/11 | Correção do recorte, que tratava as margens enviadas pelo frontend como coordenadas | `ec1f81c` | Defeito encontrado pelo aluno num teste manual (saturação → binarização → rotação → recorte). O agente reproduziu-o com a imagem do teste e mostrou que já existia na versão de partida, nas imagens e no vídeo. 5 testes novos, que falhavam antes da correção e passam depois |
| 15/11 | Diagnóstico de erros na aplicação local (404 ao criar um projeto, interface diferente) | — | O agente mostrou que o Docker estava a correr serviços da Fase 1 misturados com os da Fase 2, e que os erros não vinham dos filtros. As 8 ferramentas foram testadas dentro dos contentores |
| 15/11 | Medição da duplicação dos filtros | `b08ab43` | Contagem automática a partir do commit de partida: 16 → 8 implementações, 8 → 0 filtros duplicados |
| 15/11 | Medição automática do tempo de processamento de vídeo antes e depois da separação | `615db6f` | Duas rondas em ordem inversa, cinco medições por cenário, resultados em CSV em `medicoes/resultados-manutenibilidade/` |
| 18/11 | Worker RabbitMQ partilhado pelas 8 ferramentas de imagem e remoção de código sem uso | `adb6a7f`, `266c69a`, `78daf2b` | Testes automáticos e testes manuais na aplicação. 745 → 120 linhas; 24 → 2 sítios que enviam uma resposta ao `projects` |
| 18/11 | Explicação da troca de identificadores nas respostas de erro do `ToolMSG` | — | O aluno decidiu não corrigir, por estar fora do âmbito; ficou registado no relatório |
| 23–26/11 | Relatório no Google Docs: capítulos 7, 8.2, 1.4 e 11 e Anexo A (A.2, A.5, A.6, A.7) | — | Cada valor confrontado com o repositório e com `medicoes/`; versão guardada relida depois de cada edição |

## 3. Análise crítica

**O que correu bem.** O agente encontrou a origem dos erros que o aluno viu nos testes manuais. O recorte já falhava na versão de partida, nas imagens e no vídeo, e com os filtros num só módulo bastou uma correção. Os outros erros vinham de uma mistura de serviços da Fase 1 e da Fase 2 no Docker, e não da alteração. As medições de tempo passaram de cronómetro para um script que repete cada cenário e guarda os resultados, o que as torna repetíveis. Na escrita do relatório, cruzar o texto com o código revelou incoerências, por exemplo instruções do controlador de escalonamento em PowerShell para um script que só corre em Linux ou macOS.

**Onde a IA falhou ou precisou de correção.**

- Os scripts de medição falharam durante o desenvolvimento: apagar o projeto exigia o número de versão, e a ligação foi fechada a meio de um cenário. Foram corrigidos antes do commit `615db6f`.
- Na edição do relatório, a correção automática do Google Docs transformou `--` em travessões e as aspas retas em curvas, o que estragava os comandos. Os links criados automaticamente nos nomes de ficheiros também ficaram no texto. Os três problemas foram detetados ao reler a versão guardada e corrigidos.
- Numa edição, o texto foi escrito na legenda de uma tabela em vez da célula pretendida. Foi detetado na verificação e reposto.

**O que ficou de fora por decisão do aluno.** A cadeia binarização → borda falha desde a versão de partida, e a troca de identificadores no `ToolMSG` impede que os erros das ferramentas de imagem cheguem ao utilizador. Ambos estão fora do âmbito da manutenibilidade e ficaram registados no relatório.

**Práticas adotadas.** Pedidos de análise sem alterações antes de cada decisão; testes que falham antes da correção e passam depois; comparação píxel a píxel com a versão anterior; releitura da versão guardada do relatório depois de cada edição.

## 4. Prompts relevantes

Os pedidos feitos ao Claude Code estão em [`prompts-fase2.md`](prompts-fase2.md), por sessão e com data.
