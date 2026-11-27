# Pedidos relevantes — Fase 2 (Codex e ChatGPT)

Seleção de pedidos das minhas conversas, agrupados pelo título e acompanhados da data. Os pedidos foram abreviados e revistos para leitura. [Correspondência com as decisões, os ficheiros e a validação](evidencias-ia.md).

## Codex — «Preparar o código para a fase 2»

**9–13 de novembro · Requisitos e arquitetura**

- Analisa o documento de requisitos e as diretrizes da fase 2. Que requisitos não funcionais sugeres?
- Escolhemos manutenibilidade e elasticidade. Antes de começarmos a escrever código para a manutenibilidade, o que devemos preparar?
- Porquê três serviços para vídeo? Devíamos ter um serviço por ferramenta, como nas imagens, ou agrupar as ferramentas por responsabilidade? Analisa as alternativas à luz do código e dos cenários.
- Ficamos com três microserviços. Que medições devemos fazer antes e depois, e o que pedem concretamente as diretrizes?

**13–14 de novembro · Medições, refactoring e testes**

- Prepara as notas da proposta inicial de medição da manutenibilidade. Regista a medição da versão de partida, os três cenários, as explicações e o script na pasta `medicoes`.
- Avança com a implementação dos três serviços. É um refactoring e deve preservar as funcionalidades. Revê o código, o `AGENTS.md` e as diretrizes. No fim, explica como ficaram separados os serviços no código e no Docker.
- Explica as responsabilidades dos workers e confirma o âmbito do refactoring. Vi alterações aos testes existentes. Faz sentido escrever testes adicionais para esta fase?
- O terminal não encontra `pwsh`. Como consigo correr o script?
- O ensaio de reimplantação no Docker foi feito só sobre a nova implementação? Como é que o script compara com a versão anterior?

## Codex — «Testar branch feat/autoscaling»

**14 e 21–23 de novembro · Validação e integração**

- Como posso instalar a branch `feat/autoscaling` em separado e verificar se funciona?
- Que teste devo fazer com dois vídeos para perceber se a legendagem termina e se os resultados se conseguem reproduzir na interface?
- A versão com autoscaling é compatível com o nosso refactoring? Que casos devemos testar ou rever, incluindo filas com pedidos sem consumidores e um reinício durante a redução de réplicas?
- A integração está feita. Corre os testes do PictuRAS e indica-me os cenários que devo confirmar na interface.

## ChatGPT — Relatório e diagramas

- **22 de novembro · «Rever ponto 4 do relatório».** Confirma o que pede o template, revê as alternativas já escritas e propõe ajustes. Verifica a reutilização dos identificadores de evidência nas secções 2.1, 2.4 e 3.1.
- **22 de novembro · «Rever diagrama de sequência».** Validação e sugestões de correção para o diagrama de sequência no Visual Paradigm, com atenção à ordem das mensagens e à distinção entre os percursos de imagem e de vídeo. Revisão da vista de componentes da arquitetura de partida.
- **27 de novembro · «Escrita do relatório RAS».** Apoio à revisão geral do relatório e à elaboração e melhoria de pontos específicos, incluindo os resultados da secção 10.4 e as instruções dos ensaios no anexo A.4.
