# Prompts relevantes — D(Claude Code)

Pedidos feitos ao Claude Code, agrupados por sessão, com correções ligeiras de ortografia e pontuação. Ficaram de fora os registos de execução colados (logs do Docker) e os pedidos apenas de gestão do git (pull, push, branches). `[…]` indica um corte.

## 14/10 — Pôr a aplicação a correr e estudar a base

- Como é que as fotos são guardadas depois da edição?
- Como utilizador, onde aparece a imagem resultante? Dentro do projeto, em download, etc.?

## 14/10 — Como implementar as legendas

- Quero que me sugiras como implementar o caso de uso das legendas.
- Explica-me de forma mais simples e garante que está como nos casos de uso.
- O Whisper tem deteção automática de idioma?

## 18/10 — Especificação e implementação das legendas

- Quero ver se existe alguma incoerência entre o caso de uso das legendas e os casos de uso do recorte e do upload de vídeo.
- Sim, alinha o `legendas.md` com o upload e o `trim_newformat` (pontos 1 a 9), mantendo o formato atual do documento.
- E quanto ao plano de implementação técnica? E sim, quero aplicar a reserva da operação.
- Implementa isso com subagentes. […]
- Ajuda-me a correr o stack completo
- Sim, corrige o contador de operações depois das legendas.
- Não sei se está escrito nalgum requisito que um vídeo com legendas perde as legendas quando se lhe aplica um filtro. Consegues pesquisar isso?
- Sim, quero que mudes isso no `legendas.md` e que o implementes, com commits.
- É necessária uma funcionalidade para remover legendas? 
- Quero que haja apenas a opção de inglês por agora, mas diz-me o que achas. A deteção automática vai fazer com que exista tradução de vídeos, e isso não está registado. Tenho duas opções: traduzir automaticamente para inglês quando não há confiança suficiente para identificar o idioma (se o modelo funcionar assim), ou aceitar apenas inglês e assumir que os vídeos estão em inglês. De qualquer forma, encontro o problema da tradução automática. 
- Essa sugestão parece-me bem. Implementa-a, alterando tudo o que for necessário nos ficheiros relacionados. […]
- Que modelos usaste para que isto fosse possível?
- Se fizer um recorte, as legendas continuam a funcionar?
- Verifica se está tudo de acordo com os requisitos e os ficheiros md e diz-me se sugeres alguma alteração.
- Há coisas implementadas que não estejam escritas? Podes tomar o teu tempo a percorrer o repositório todo.
- Por agora não alteres nada, só queria a lista.
- Quero então que implementes isso, pelo menos no `legendas.md`, e faz commit.
- [template e enunciado do Exercício 2] Vê se está tudo de acordo com isto. 
- Faz a conversão das legendas para o novo formato, no mesmo ficheiro.
- Isto está num loading infinito.

## 19–20/10 — Revisão face às diretrizes e coerência entre casos de uso

- [diretrizes da Fase 1 e enunciado] De acordo com as diretrizes e com o enunciado, verifica se está tudo bem. Não executes nada, diz-me apenas o que me falta na minha branch em específico.
- Essa lista de pedidos existe nalgum outro caso de uso?
- Mas qual era o objetivo desta lista de pedidos?
- Os pontos 1 e 2 ficam assim por agora, porque ainda podem ser implementados pelo grupo. Do resto, no 1 podes aplicar o que falta e no 2 também; o 3 vejo depois, para poder fazer já o pull request. […]
- Mas o enunciado pede a resolução das questões em aberto?
- Agora que está tudo no main, verifica as inconsistências entre os ficheiros md.
- Faz o ponto 3 e o 12. O 3 podes aplicar em todos os ficheiros. Faz dois commits diferentes.
- Passa o upload para o novo formato.
- Das alterações que sugeriste, quais faltam?
- Desenvolve o ponto 11 e verifica tu próprio se a interface está em inglês.
- Em termos de coerência do projeto todo, o que falta? Faz-me uma lista simples, mas investiga o projeto inteiro, tendo também em conta o enunciado e as diretrizes.
- Quero que trates da coerência do código, exceto a lista de pedidos, que podemos deixar para mais tarde.
- No 2, podes explicar-me a regra dos 5 s e como irias tratar os requisitos repetidos? […]
- Podes então aplicar a regra dos 5 s às outras ferramentas.
- Qual é a diferença entre as RNG e os REQ-VID-STATUS? Estão ambos nas diretrizes ou no enunciado?
- Como achas que deve ser abordada a lista de pedidos?
- A coluna "elemento da baseline" está nas diretrizes?
- Houve um novo push com commits que alteram os ficheiros md. Vê o que já foi cumprido; penso que ainda é preciso implementar os requisitos partilhados. Não alteres nada, apenas lista.
- [relatório no Google Docs] As regras de negócio transversais estão aqui. Achas que alguma coisa deve ser alterada? Devem ficar num ficheiro md ou fazer parte do repositório?
- Quero tratar dos requisitos repetidos.
- A fila cheia poderia ser implementada numa fase posterior, por isso talvez seja melhor passá-la para outra secção. Dá-me a tua opinião.
- Sim, acrescenta o REQ-VID-STATUS-024 e a referência na DQ-004.
- O que falta nos ficheiros md dos casos de uso antes de os passar para o relatório?
- Aplica os que não precisam de decisão nossa.

## 20/10 — Coerência da interface entre ferramentas

- Explica-me de forma muito simples a diferença entre a fila cheia, a lista de pedidos e o limite de pedidos.
- Sim, adiciona o `.dockerignore` ao serviço de projetos.
- Verifica se a reserva de espaço é feita da mesma forma no recorte e nos filtros.
- Sim, corrige a mensagem de erro do filtro para mostrar a causa, como no recorte.
- Tira a mensagem a vermelho, porque agora já aparece um pop-up de aviso. Depois vê se as mensagens de aviso estão todas no estilo das de eliminar vídeo ou projeto. Há pouco reparei numa que parecia uma mensagem do browser; deve ficar nesse estilo, com o contexto apropriado.
- Não tínhamos um requisito em que, ao tentar fazer uma operação sem operações disponíveis, aparecia, além da mensagem, um botão para ver o plano pago? Também é pouco útil nesta fase, acho eu.

## 20–21/10 — Testes das legendas

- Verifica todos os testes que já estão implementados no repositório.
- Os testes correm, mas queria acrescentar testes às legendas. Já têm alguns; achas que precisam de mais?
- Escreve os testes da rota e também os do `processSubtitleJob` (sucesso, falhas, cancelamento).
- Antes disso, quantos testes têm os outros casos de uso?
- Porque é que têm tantos mais testes? E porque não um teste de integração com um vídeo real?
- Sim, acrescenta um teste de integração com o `traffic-voiceover.mp4`, FFmpeg real e um serviço de fala falso.

## 21/10 — Preparação da entrega

- [enunciado, diretrizes e relatório] Tendo em conta o enunciado, as diretrizes, o relatório e o repositório, faz-me uma lista do que falta para a primeira entrega do projeto.
- Faz então uma lista muito simples das tarefas a fazer, ordenada por prioridade.
