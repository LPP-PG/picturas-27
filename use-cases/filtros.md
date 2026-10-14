# Exercício 1 - Entrega

### Casos de Uso · Fase 1: Suporte a Vídeo no PictuRAS

## 0. Identificação

| **Campo**               | **Valor**                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **Grupo / Equipa**      |                                                                                                  |
| **Autores**             | Eduarda Ferreira PG65368; Luana Vilaverde PG65367; Daniel Rodrigues PG63934; Lucas Pinto PG63997 |
| **Data**                | 2026-10-07                                                                                       |
| **Versão do documento** | v1.0                                                                                             |
| **Unidade Curricular**  | Requisitos e Arquiteturas de Software, MEI, Universidade do Minho                                |

---

## 1. Funcionalidade de vídeo escolhida

|**Campo**|**Valor**|
|---|---|
|**Funcionalidade**|Aplicação de filtros a vídeo|
|**Perfil(s) de utilizador abrangido(s)**|A equipa optou por deixar o perfil Anónimo de fora (ver Q7): o PictuRAS só lhe permite operações básicas sobre imagens pequenas e o processamento de vídeo exige uma conta com limites controlados. O perfil Registado pode aplicar filtros dentro da sua quota de 5 operações por dia. O perfil Premium utiliza a mesma funcionalidade sem limite diário de operações e com limites superiores de duração e tamanho do vídeo.|

**Justificação no contexto do MVP**

A aplicação de filtros permite ao utilizador alterar de forma simples o aspeto visual de um vídeo. Esta funcionalidade permite também validar o processamento de todos os fotogramas de um vídeo, o acompanhamento de operações demoradas e a criação de um novo resultado sem alterar o ficheiro original.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

|**Secção**|**Detalhes**|
|---|---|
|**ID do Caso de Uso**|UC-VID-002|
|**Nome**|Aplicar um filtro a um vídeo|
|**Versão**|v1.0|
|**Autor**|Eduarda Ferreira; Luana Vilaverde; Daniel Rodrigues; Lucas Pinto|
|**Data**|2026-10-07|
|**Objetivo**|Permitir ao utilizador aplicar um filtro visual a um vídeo existente na sua biblioteca e obter um novo vídeo com o efeito selecionado.|
|**Âmbito**|Módulo de vídeo do PictuRAS: seleção e pré-visualização do filtro, processamento do vídeo em segundo plano, armazenamento do resultado e controlo da quota de operações.|
|**Ator Principal**|Utilizador Registado. O Utilizador Premium utiliza o mesmo fluxo, com limites diferentes.|
|**Stakeholders e Interesses**|**Utilizador:** quer alterar o aspeto visual do vídeo, visualizar o efeito antes de confirmar e manter o vídeo original inalterado.  <br>**Dono do sistema:** quer disponibilizar funcionalidades de edição de vídeo controlando a utilização dos recursos de processamento.  <br>**Equipa de desenvolvimento:** quer garantir que o filtro é aplicado de forma consistente e que o processamento não bloqueia o resto da aplicação.|
|**Pré-condições**|O utilizador tem sessão iniciada como Registado ou Premium.  <br>O vídeo já se encontra na biblioteca e o carregamento terminou.|
|**Trigger**|O utilizador seleciona um vídeo da biblioteca e escolhe a opção **Aplicar filtro**.|

### 2.2 Fluxo Principal

|**Passo**|**Ação do Ator**|**Resposta do Sistema**|
|---|---|---|
|1|O utilizador abre a biblioteca de vídeos|Apresenta a lista de vídeos do utilizador, com nome, duração e tamanho|
|2|O utilizador seleciona um vídeo e escolhe **Aplicar filtro**|Verifica o formato, a duração e o tamanho do vídeo face aos limites do perfil e verifica a quota diária restante|
|3||Apresenta os filtros disponíveis e uma área de pré-visualização|
|4|O utilizador seleciona um filtro|Apresenta uma pré-visualização do efeito selecionado sobre o vídeo|
|5|O utilizador confirma a aplicação do filtro|Verifica novamente os limites do perfil, a quota disponível e o número máximo de processamentos simultâneos|
|6||Cria o pedido de processamento e apresenta o estado **Em fila**|
|7||Inicia o processamento, passa o estado para **A processar** e apresenta o progresso em percentagem|
|8|O utilizador acompanha o progresso e pode continuar a utilizar outros ecrãs do PictuRAS|Atualiza periodicamente o progresso|
|9||Conclui o processamento e guarda o novo vídeo na biblioteca|
|10||Passa o pedido para **Concluído**, contabiliza 1 operação na quota diária quando aplicável e notifica o utilizador|
|11|O utilizador abre o vídeo resultante|Apresenta o novo vídeo com o filtro aplicado. O vídeo original mantém-se inalterado|

### 2.3 Fluxos Alternativos

|**Fluxo**|**Descrição**|
|---|---|
|**FA1 – Alterar o filtro selecionado**|No passo 4, o utilizador seleciona outro filtro antes de confirmar. O sistema atualiza a pré-visualização com o novo filtro e mantém o pedido por iniciar|
|**FA2 – Cancelar o processamento**|Enquanto o pedido está **Em fila** ou **A processar**, o utilizador seleciona **Cancelar**. O sistema interrompe o processamento, elimina qualquer resultado parcial, passa o pedido para **Cancelado** e não contabiliza a operação|
|**FA3 – Utilizador abandona o ecrã**|Depois de iniciar o pedido, o utilizador navega para outro ecrã ou fecha o separador. O processamento continua em segundo plano enquanto a sessão se mantiver ativa e o estado continua disponível quando o utilizador regressar|
|**FA4 – Limite de processamentos simultâneos**|No passo 5, o utilizador já atingiu o número máximo de processamentos simultâneos permitido pelo seu perfil. O sistema não cria o novo pedido, informa o utilizador e permite consultar os pedidos em curso|
|**FA5 – Utilizador termina a sessão**|O utilizador termina a sessão enquanto o pedido está **Em fila** ou **A processar**. O sistema cancela o pedido, interrompe o processamento, elimina qualquer resultado parcial e não contabiliza a operação|
|**FA6 – Sair sem confirmar**|Nos passos 3 a 4, o utilizador fecha o ecrã de aplicação de filtros sem confirmar. O sistema não cria qualquer pedido e a quota não é afetada|

### 2.4 Exceções

|**Condição**|**Comportamento do Sistema**|
|---|---|
|O formato do vídeo não é suportado para aplicação de filtros (passo 2)|Apresenta **"Este formato de vídeo não é suportado para aplicação de filtros"**, indica os formatos aceites e não abre o ecrã de aplicação de filtros|
|A duração ou o tamanho do vídeo excedem o limite do perfil (passo 2)|Apresenta os limites do perfil atual e, no caso do utilizador Registado, informa que o perfil Premium permite limites superiores; não abre o ecrã de aplicação de filtros|
|A quota diária de operações está esgotada (passos 2 e 5)|Apresenta **"Atingiu o limite diário de operações"**, indica quando a quota é reposta e não cria o pedido|
|Não é possível gerar a pré-visualização do filtro (passo 4)|Apresenta **"Não foi possível pré-visualizar o filtro"**, permite tentar novamente ou escolher outro filtro e não cria o pedido|
|O processamento falha a meio (passos 7 e 8)|Passa o estado para **Falhou**, elimina qualquer resultado parcial, apresenta uma mensagem de erro, não contabiliza a operação e mantém o vídeo original inalterado|
|O serviço de processamento está indisponível ou a fila está cheia (passo 6)|Apresenta uma mensagem indicando que o serviço está temporariamente indisponível, não cria o pedido e não contabiliza a operação|
|Não existe espaço de armazenamento suficiente para guardar o resultado (passo 9)|Passa o estado para **Falhou**, elimina qualquer resultado parcial, informa o utilizador e não contabiliza a operação|

### 2.5 Pós-condições

|**Tipo**|**Resultado**|
|---|---|
|**Garantia de Sucesso**|Existe na biblioteca um novo vídeo com o filtro selecionado aplicado; o vídeo original mantém-se inalterado; o pedido encontra-se no estado **Concluído** e foi contabilizada 1 operação na quota diária, quando aplicável|
|**Garantia Mínima**|O vídeo original mantém-se inalterado; não existe qualquer resultado parcial na biblioteca; o pedido fica no estado **Falhou** ou **Cancelado**, ou não chega a ser criado; a quota diária não é consumida; o utilizador vê uma mensagem com a causa|

### 2.6 Regras de Negócio e Restrições

|**ID**|**Regra**|
|---|---|
|**RN1**|Os formatos de vídeo aceites para aplicação de filtros são MP4 e MOV|
|**RN2**|O perfil Registado pode processar vídeos com duração ≤ 60 s e tamanho ≤ 100 MB; o Premium, vídeos com duração ≤ 10 min e tamanho ≤ 1 GB. O perfil Anónimo não tem acesso às funcionalidades de vídeo|
|**RN3**|A aplicação de um filtro conta como 1 operação na quota diária. A operação só é contabilizada quando o pedido termina em **Concluído**|
|**RN4**|A aplicação do filtro nunca altera o vídeo original. O resultado é guardado como um novo vídeo na biblioteca, com o nome `<nome original>_<nome do filtro>` (se esse nome já existir, acrescenta-se um sufixo numérico)|
|**RN5**|O filtro selecionado é aplicado a todos os fotogramas do vídeo|
|**RN6**|O pedido pode assumir os estados **Em fila**, **A processar**, **Concluído**, **Falhou** e **Cancelado**|
|**RN7**|Apenas pedidos nos estados **Em fila** ou **A processar** podem ser cancelados|
|**RN8**|O perfil Registado pode ter no máximo 1 processamento de vídeo em fila ou a processar; o Premium pode ter no máximo 3|
|**RN9**|Um vídeo ainda em carregamento não pode ser processado|
|**RN10**|O vídeo original e o vídeo resultante apenas podem ser acedidos pelo respetivo proprietário e estão sujeitos às regras de privacidade e armazenamento do PictuRAS|
|**RN11**|No MVP estão disponíveis os filtros Preto e branco, Sépia e Vintage, cada um sem parâmetros configuráveis|

### 2.7 Assunções

|**ID**|**Assunção**|
|---|---|
|**A1**|O vídeo encontra-se integralmente armazenado e acessível ao serviço de processamento no momento do pedido|
|**A2**|Cada pedido aplica um único filtro ao vídeo|
|**A3**|A aplicação do filtro altera apenas a componente visual do vídeo e mantém o áudio original|
|**A4**|A pré-visualização pode utilizar uma versão de menor resolução ou apenas parte do vídeo para reduzir o tempo necessário para apresentar o efeito|
|**A5**|A resolução e a taxa de fotogramas originais são mantidas sempre que possível|
|**A6**|A notificação de conclusão é apresentada apenas dentro da aplicação|
|**A7**|O vídeo resultante é contabilizado no espaço de armazenamento do utilizador|
|**A8**|Os filtros do catálogo (RN11) são implementados, sempre que possível, reutilizando as ferramentas de imagem já existentes no PictuRAS, aplicadas a cada fotograma|
|**A9**|Os vídeos ficam numa biblioteca de vídeos do utilizador, nova e independente dos projetos do PictuRAS; no MVP, os vídeos não são adicionados a projetos de imagens|
|**A10**|A quota diária de 5 operações do perfil Registado é partilhada entre as operações sobre imagens e as operações sobre vídeos|

### 2.8 Questões em Aberto

|**ID**|**Questão**|
|---|---|
|**Q1**|Que filtros, além do catálogo inicial (RN11), devem ser suportados? Devem os filtros personalizados e os presets já existentes no PictuRAS poder ser aplicados a vídeos?|
|**Q2**|Deve ser possível combinar vários filtros no mesmo pedido?|
|**Q3**|Deve o utilizador poder controlar a intensidade do filtro?|
|**Q4**|Deve ser possível aplicar o filtro apenas a uma parte temporal do vídeo?|
|**Q5**|Deve ser possível aplicar o mesmo filtro a vários vídeos em lote?|
|**Q6**|A pré-visualização deve abranger todo o vídeo ou apenas uma amostra?|
|**Q7**|O perfil Anónimo deve poder aceder a esta funcionalidade, com limites mais apertados?|
|**Q8**|Deve a operação ser reservada na quota no momento da confirmação? Com a regra atual, a operação só é contabilizada no fim: um utilizador Registado pode iniciar o pedido com 4 operações gastas, fazer uma operação sobre uma imagem enquanto o vídeo é processado e terminar o dia com 6 operações|
|**Q9**|Como se relacionam os vídeos com os projetos existentes do PictuRAS? Deve ser possível adicionar vídeos a um projeto, ao lado das imagens, e usá-los no encadeamento de ferramentas?|

---

## 3. Utilização de agentes de IA

|**Ferramenta / skill**|**Tarefa apoiada**|**Validação realizada pela equipa**|
|---|---|---|
|ChatGPT (OpenAI)|Discussão e exploração das minúcias e possibilidades associadas à funcionalidade de aplicação de filtros a vídeo, nomeadamente comportamentos, limitações e situações excecionais|A IA foi utilizada apenas como apoio à discussão das funcionalidades. Todas as decisões sobre o caso de uso, regras, fluxos e comportamentos foram tomadas pela equipa, que também foi responsável pela redação do documento|
|Claude (claude.ai)|Revisão do caso de uso face ao template v2, aos exemplos de referência e ao documento de requisitos 2025/26: deteção de inconsistências entre fluxos, exceções e pré-condições e de lacunas de alinhamento com o sistema existente|Cada sugestão foi analisada pela equipa antes de ser incorporada. Foram acrescentados o catálogo de filtros (RN11), a exceção de falha da pré-visualização, o fluxo FA6, as assunções A8 a A10 e as questões Q7 a Q9|

## 4. Esboço de requisitos derivados

### 4.1 Requisitos de Sistema

| **ID** | **Requisito** | **Tipo** | **Prioridade** | **Novo/Alt** | **Origem** | **Como verificar** |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-VID-FILT-001 | O sistema deve apresentar os vídeos da biblioteca do utilizador com nome, duração e tamanho. | F | Deve ter | NOVO | Passo 1 / A9 | Dado um utilizador com vídeos, quando abre a biblioteca, então cada vídeo apresenta nome, duração e tamanho. |
| REQ-VID-FILT-002 | O sistema deve permitir ao utilizador selecionar um vídeo da sua biblioteca para solicitar a aplicação de um filtro. | F | Deve ter | NOVO | Trigger / Passo 2 | Dado um vídeo da biblioteca, quando o utilizador o seleciona, então pode escolher Aplicar filtro. |
| REQ-VID-FILT-003 | O sistema deve restringir a aplicação de filtros a vídeo a utilizadores com sessão iniciada como Registado ou Premium. | NF — Segurança / acesso | Deve ter | ALT | Pré-condições / RN2 | Dado um utilizador sem sessão iniciada, quando tenta aplicar um filtro, então o acesso é recusado. |
| REQ-VID-FILT-004 | O sistema deve impedir a aplicação de filtros enquanto o carregamento do vídeo não estiver concluído. | F | Deve ter | NOVO | Pré-condições / RN9 | Dado um vídeo em carregamento, quando se tenta aplicar um filtro, então a operação é impedida. |
| REQ-VID-FILT-005 | O sistema deve rejeitar vídeos em formatos diferentes de MP4 ou MOV, apresentando a mensagem "Este formato de vídeo não é suportado para aplicação de filtros" e os formatos aceites. | F | Deve ter | NOVO | Passo 2 / Exceção 1 / RN1 | Dado um vídeo noutro formato, quando o utilizador escolhe Aplicar filtro, então aparece a mensagem com os formatos aceites e o ecrã de aplicação não abre. |
| REQ-VID-FILT-006 | O sistema deve limitar a duração dos vídeos de entrada do perfil Registado a 60 s. | NF — Capacidade / limites | Deve ter | ALT | RN2 | Dado um Registado, quando seleciona vídeos com 60 s e 61 s, então o primeiro passa a validação de duração e o segundo é rejeitado. |
| REQ-VID-FILT-007 | O sistema deve limitar o tamanho dos vídeos de entrada do perfil Registado a 100 MB. | NF — Capacidade / limites | Deve ter | ALT | RN2 | Dado um Registado, quando seleciona vídeos com 100 MB e 101 MB, então o primeiro passa a validação de tamanho e o segundo é rejeitado. |
| REQ-VID-FILT-008 | O sistema deve limitar a duração dos vídeos de entrada do perfil Premium a 10 min. | NF — Capacidade / limites | Deve ter | ALT | RN2 | Dado um Premium, quando seleciona vídeos com 10 min e 10 min e 1 s, então o primeiro passa a validação de duração e o segundo é rejeitado. |
| REQ-VID-FILT-009 | O sistema deve limitar o tamanho dos vídeos de entrada do perfil Premium a 1 GB. | NF — Capacidade / limites | Deve ter | ALT | RN2 | Dado um Premium, quando seleciona um vídeo com 1 GB e outro acima desse tamanho, então apenas o primeiro passa a validação de tamanho. |
| REQ-VID-FILT-010 | O sistema deve apresentar os limites do perfil quando rejeitar um vídeo por excesso de duração ou tamanho, referindo os limites superiores do Premium no caso do Registado. | F | Deveria ter | NOVO | Exceção 2 | Dado um vídeo acima dos limites, quando é rejeitado, então a mensagem apresenta os limites aplicáveis e, para um Registado, refere o Premium. |
| REQ-VID-FILT-011 | O sistema deve impedir novos pedidos quando a quota diária aplicável estiver esgotada, apresentando a mensagem "Atingiu o limite diário de operações" e indicando quando será reposta. | F | Deve ter | ALT | Passos 2 e 5 / Exceção 3 / A10 | Dado um Registado com cinco operações contabilizadas entre imagens e vídeos, quando tenta iniciar ou confirmar a aplicação de um filtro, então nenhum pedido é criado e a mensagem indica a reposição. |
| REQ-VID-FILT-012 | O sistema deve disponibilizar os filtros Preto e branco, Sépia e Vintage, sem parâmetros configuráveis. | F | Deve ter | NOVO | Passo 3 / RN11 | Dado o ecrã de aplicação de filtros, quando o utilizador consulta o catálogo, então encontra os três filtros indicados sem opções de configuração de parâmetros. |
| REQ-VID-FILT-013 | O sistema deve permitir selecionar um único filtro por pedido. | F | Deve ter | NOVO | Passo 4 / A2 | Dado o catálogo, quando o utilizador seleciona um filtro, então o pedido fica associado apenas a esse filtro. |
| REQ-VID-FILT-014 | O sistema deve apresentar uma pré-visualização do filtro atualmente selecionado. | F | Deve ter | NOVO | Passos 3 e 4 / FA1 | Dado um filtro selecionado, quando o utilizador escolhe outro antes de confirmar, então a pré-visualização passa a representar o novo filtro. |
| REQ-VID-FILT-015 | O sistema deve permitir repetir a pré-visualização ou escolher outro filtro quando esta falhar, apresentando a mensagem "Não foi possível pré-visualizar o filtro". | F | Deve ter | NOVO | Exceção 4 | Dado uma falha da pré-visualização, quando é detetada, então aparece a mensagem e ficam disponíveis as opções de tentar novamente ou selecionar outro filtro. |
| REQ-VID-FILT-016 | O sistema deve criar um pedido apenas após confirmação explícita do utilizador. | F | Deve ter | NOVO | Passo 5 / FA1 / FA6 / Exceção 4 | Dado um utilizador que apenas consulta filtros, altera a seleção, encontra uma falha de pré-visualização ou sai sem confirmar, quando abandona o ecrã, então nenhum pedido foi criado. |
| REQ-VID-FILT-017 | O sistema deve voltar a validar os limites do perfil, a quota disponível e o número de processamentos simultâneos na confirmação do pedido. | F | Deve ter | ALT | Passo 5 / FA4 / Exceção 3 | Dado uma condição que deixou de ser satisfeita após abrir o ecrã, quando o utilizador confirma, então o pedido é rejeitado. |
| REQ-VID-FILT-018 | O sistema deve limitar a 1 o número de processamentos de vídeo Em fila ou A processar por utilizador Registado. | NF — Capacidade / limites | Deve ter | ALT | RN8 / FA4 | Dado um Registado com um processamento ativo, quando confirma outro, então o novo pedido é rejeitado. |
| REQ-VID-FILT-019 | O sistema deve limitar a 3 o número de processamentos de vídeo Em fila ou A processar por utilizador Premium. | NF — Capacidade / limites | Deve ter | ALT | RN8 / FA4 | Dado um Premium com três processamentos ativos, quando confirma outro, então o novo pedido é rejeitado. |
| REQ-VID-FILT-020 | O sistema deve informar o utilizador quando o limite de processamentos simultâneos impedir a criação do pedido. | F | Deve ter | NOVO | FA4 | Dado o limite atingido, quando o utilizador confirma outro pedido, então recebe uma mensagem com a causa da rejeição. |
| REQ-VID-FILT-021 | O sistema deve permitir consultar os pedidos de aplicação de filtros e o estado atual de cada pedido. | F | Deve ter | NOVO | FA3 / FA4 / RN6 | Dado um utilizador com pedidos, quando os consulta ou regressa à aplicação, então vê o estado atual de cada pedido. |
| REQ-VID-FILT-022 | O sistema deve criar os pedidos aceites no estado Em fila. | F | Deve ter | NOVO | Passo 6 / RN6 | Dado uma confirmação válida e aceite pelo serviço, quando o pedido é criado, então o seu estado inicial é Em fila. |
| REQ-VID-FILT-023 | O sistema deve recusar a criação de pedidos quando o serviço estiver indisponível ou a fila estiver cheia, informando da indisponibilidade temporária. | F | Deve ter | NOVO | Exceção 6 | Dado uma das condições de indisponibilidade, quando o utilizador confirma, então nenhum pedido é criado e aparece uma mensagem de indisponibilidade. |
| REQ-VID-FILT-024 | O sistema deve passar o pedido para A processar quando iniciar o processamento. | F | Deve ter | NOVO | Passo 7 / RN6 | Dado um pedido Em fila, quando o processamento começa, então o estado passa para A processar. |
| REQ-VID-FILT-025 | O sistema deve apresentar a percentagem de progresso atualizada durante o processamento. | F | Deve ter | NOVO | Passos 7 e 8 | Dado um pedido A processar, quando o utilizador acompanha o processamento, então vê uma percentagem entre 0 % e 100 % que acompanha o avanço do pedido. |
| REQ-VID-FILT-026 | O sistema deve manter o processamento em segundo plano quando o utilizador navega para outro ecrã ou fecha o separador, enquanto a sessão se mantiver ativa. | F | Deve ter | NOVO | Passo 8 / FA3 | Dado um pedido ativo, quando o utilizador abandona o ecrã sem terminar a sessão, então o processamento continua. |
| REQ-VID-FILT-027 | O sistema deve aplicar o filtro selecionado a todos os fotogramas do vídeo. | F | Deve ter | NOVO | RN5 | Dado um vídeo de teste com fotogramas conhecidos, quando o processamento conclui, então todos os fotogramas do resultado apresentam a transformação do filtro selecionado. |
| REQ-VID-FILT-028 | O sistema deve preservar o áudio original no vídeo resultante da aplicação do filtro. | NF — Fiabilidade / integridade | Deve ter | NOVO | A3 | Dado um vídeo com áudio, quando o processamento conclui, então o resultado conserva o conteúdo sonoro e a sua posição temporal relativamente ao vídeo. |
| REQ-VID-FILT-029 | O sistema deve guardar o resultado como um novo vídeo na biblioteca do utilizador. | F | Deve ter | NOVO | Passo 9 / RN4 / Pós-condição de sucesso | Dado um pedido concluído, quando o utilizador abre a biblioteca, então encontra um novo vídeo distinto do original. |
| REQ-VID-FILT-030 | O sistema deve atribuir ao resultado o nome <nome original>_<nome do filtro>, acrescentando um sufixo numérico quando esse nome já existir. | F | Deve ter | NOVO | RN4 | Dado um resultado sem colisão de nome, quando é guardado, então recebe o nome definido; existindo esse nome, recebe um sufixo numérico que o distingue. |
| REQ-VID-FILT-031 | O sistema deve contabilizar o espaço ocupado pelo vídeo resultante no armazenamento utilizado pelo proprietário. | F | Deve ter | ALT | A7 | Dado um resultado guardado, quando se consulta o armazenamento utilizado, então o espaço ocupado por esse resultado está incluído no total. |
| REQ-VID-FILT-032 | O sistema deve passar o pedido para Concluído após guardar o resultado com sucesso. | F | Deve ter | NOVO | Passos 9 e 10 / RN6 | Dado um resultado guardado com sucesso, quando a operação termina, então o estado do pedido passa para Concluído. |
| REQ-VID-FILT-033 | O sistema deve contabilizar exatamente 1 operação na quota diária aplicável apenas quando o pedido terminar em Concluído. | F | Deve ter | ALT | Passo 10 / RN3 / A10 / Pós-condições | Dado pedidos concluídos, falhados, cancelados e não criados, quando se verifica a quota, então apenas cada pedido concluído acrescenta uma operação. |
| REQ-VID-FILT-034 | O sistema deve apresentar uma notificação interna quando o pedido terminar em Concluído. | F | Deveria ter | NOVO | Passo 10 / A6 | Dado um pedido concluído, quando o utilizador consulta a aplicação, então a notificação de conclusão está disponível. |
| REQ-VID-FILT-035 | O sistema deve permitir ao utilizador abrir o vídeo resultante com o filtro aplicado. | F | Deve ter | NOVO | Passo 11 | Dado um resultado disponível na biblioteca, quando o utilizador o abre, então o sistema apresenta o vídeo com o filtro selecionado aplicado. |
| REQ-VID-FILT-036 | O sistema deve aceitar o cancelamento pelo utilizador apenas nos estados Em fila ou A processar, passando o pedido para Cancelado. | F | Deve ter | NOVO | FA2 / RN6 / RN7 | Dado pedidos nos cinco estados, quando se tenta cancelar, então apenas Em fila e A processar aceitam a ação e passam para Cancelado. |
| REQ-VID-FILT-037 | O sistema deve interromper o processamento de um pedido quando este é cancelado. | F | Deve ter | NOVO | FA2 / FA5 | Dado um pedido A processar, quando é cancelado, então o processamento desse pedido termina. |
| REQ-VID-FILT-038 | O sistema deve cancelar os pedidos ativos de aplicação de filtros quando o utilizador termina explicitamente a sessão. | F | Deve ter | ALT | FA5 | Dado pedidos Em fila ou A processar, quando o utilizador faz logout, então esses pedidos são cancelados. |
| REQ-VID-FILT-039 | O sistema deve passar o pedido para Falhou quando ocorrer uma falha de processamento ou faltar espaço para guardar o resultado, informando o utilizador da causa. | F | Deve ter | NOVO | Exceções 5 e 7 | Dado uma falha de processamento ou falta de espaço, quando a condição é detetada, então o pedido passa para Falhou e aparece uma mensagem com a causa. |
| REQ-VID-FILT-040 | O sistema deve eliminar os resultados parciais de pedidos que terminem em Falhou ou Cancelado. | F | Deve ter | NOVO | FA2 / FA5 / Exceções 5 e 7 / Pós-condição mínima | Dado um pedido com resultados parciais, quando falha ou é cancelado, então esses resultados são eliminados e não ficam na biblioteca. |
| REQ-VID-FILT-041 | O sistema deve manter o ficheiro de vídeo original inalterado durante e após a aplicação do filtro. | NF — Fiabilidade / integridade | Deve ter | NOVO | Passo 11 / RN4 / Pós-condições | Dado um vídeo original, quando o pedido conclui, falha ou é cancelado, então o resumo criptográfico do ficheiro permanece igual ao inicial. |
| REQ-VID-FILT-042 | O sistema deve restringir o acesso ao vídeo original e ao resultado ao respetivo proprietário. | NF — Segurança / acesso | Deve ter | ALT | RN10 | Dado vídeos de um utilizador, quando outro utilizador tenta aceder-lhes, incluindo por pedido direto ao serviço, então o acesso é recusado. |

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisitos relacionados** |
| --- | --- | --- | --- |
| Perfis e permissões de utilização | Estender | Aplicar os perfis Registado e Premium à aplicação de filtros a vídeo, excluindo o Anónimo e introduzindo limites de duração, tamanho e simultaneidade. | REQ-VID-FILT-003, 006 a 009, 017 a 019 |
| Quota diária de operações | Estender | Incluir os pedidos de filtros na quota partilhada entre imagens e vídeos, mantendo cinco operações diárias para o Registado e ausência de limite diário para o Premium. Cada pedido concluído conta como uma operação, independentemente do número de fotogramas. A reserva de quota permanece em aberto em Q8. | REQ-VID-FILT-011, 017, 033 |
| Catálogo e ferramentas de filtros de imagem | Estender | Disponibilizar Preto e branco, Sépia e Vintage para vídeos, aplicando o filtro a todos os fotogramas. A8 propõe reutilizar ferramentas existentes, mas não impõe uma implementação técnica. | REQ-VID-FILT-012, 013, 027 |
| Interface de seleção e pré-visualização | Estender | Permitir selecionar e alterar um filtro antes da confirmação, visualizar o efeito e recuperar de falhas de pré-visualização. | REQ-VID-FILT-002, 012 a 016 |
| Processamento de operações e gestão de pedidos | Estender | Suportar pedidos de filtros a vídeo em segundo plano, com estados, progresso, consulta, cancelamento e tratamento de falhas. | REQ-VID-FILT-017 a 027, 032, 036 a 040 |
| Gestão da sessão | Estender | Associar o logout explícito ao cancelamento dos pedidos ativos, mantendo o processamento quando o utilizador apenas abandona o ecrã. | REQ-VID-FILT-026, 037, 038 |
| Biblioteca e gestão de ficheiros | Estender | Disponibilizar a biblioteca independente de vídeos prevista em A9, guardar novos resultados com nomes distinguíveis e preservar o original. | REQ-VID-FILT-001, 029, 030, 035, 041 |
| Armazenamento do utilizador | Estender | Contabilizar o resultado no espaço utilizado e tratar a falta de espaço sem deixar resultados parciais. | REQ-VID-FILT-031, 039, 040 |
| Notificações internas | Estender | Apresentar notificações de conclusão dos pedidos de filtros dentro da aplicação. | REQ-VID-FILT-034 |
| Controlo de acesso e privacidade | Estender | Aplicar o acesso exclusivo do proprietário aos vídeos originais e aos resultados. | REQ-VID-FILT-003, 042 |
| Projetos, encadeamento de ferramentas e processamento em lote | Manter | Nesta versão, os vídeos permanecem numa biblioteca independente dos projetos de imagens. A combinação de filtros, o processamento em lote e a integração com projetos continuam em aberto. | A2, A9, Q2, Q5 e Q9; sem requisitos de integração nesta versão |

### 4.3 Matriz de Rastreabilidade


| **Elemento do Caso de Uso** | **Descrição abreviada** | **Requisito(s) de Sistema** |
| --- | --- | --- |
| Pré-condições | Sessão iniciada e carregamento concluído | REQ-VID-FILT-003, 004 |
| Trigger | Selecionar vídeo e escolher Aplicar filtro | REQ-VID-FILT-002 |
| Passo 1 | Apresentar biblioteca de vídeos | REQ-VID-FILT-001 |
| Passo 2 | Selecionar vídeo e validar formato, limites e quota | REQ-VID-FILT-002, 005 a 011 |
| Passo 3 | Apresentar filtros e área de pré-visualização | REQ-VID-FILT-012, 014 |
| Passo 4 | Selecionar filtro e visualizar efeito | REQ-VID-FILT-013, 014 |
| Passo 5 | Confirmar e voltar a validar condições | REQ-VID-FILT-016, 017 |
| Passo 6 | Criar pedido Em fila | REQ-VID-FILT-022 |
| Passo 7 | Iniciar processamento e apresentar percentagem | REQ-VID-FILT-024, 025 |
| Passo 8 | Acompanhar progresso e utilizar outros ecrãs | REQ-VID-FILT-025, 026 |
| Passo 9 | Guardar novo vídeo | REQ-VID-FILT-029 |
| Passo 10 | Concluir, contabilizar e notificar | REQ-VID-FILT-032, 033, 034 |
| Passo 11 | Abrir resultado e preservar original | REQ-VID-FILT-035, 041 |
| FA1 | Alterar filtro antes da confirmação | REQ-VID-FILT-013, 014, 016 |
| FA2 | Cancelar processamento | REQ-VID-FILT-033, 036, 037, 040 |
| FA3 | Abandonar ecrã ou fechar separador | REQ-VID-FILT-021, 026 |
| FA4 | Limite de processamentos simultâneos | REQ-VID-FILT-017, 018, 019, 020, 021 |
| FA5 | Terminar explicitamente a sessão | REQ-VID-FILT-033, 037, 038, 040 |
| FA6 | Sair sem confirmar | REQ-VID-FILT-016, 033 |
| Exceção 1 | Formato não suportado | REQ-VID-FILT-005 |
| Exceção 2 | Duração ou tamanho acima dos limites | REQ-VID-FILT-006 a 010 |
| Exceção 3 | Quota esgotada | REQ-VID-FILT-011, 017 |
| Exceção 4 | Falha de pré-visualização | REQ-VID-FILT-015, 016 |
| Exceção 5 | Falha durante o processamento | REQ-VID-FILT-033, 039, 040, 041 |
| Exceção 6 | Serviço indisponível ou fila cheia | REQ-VID-FILT-023, 033 |
| Exceção 7 | Espaço insuficiente | REQ-VID-FILT-033, 039, 040 |
| Pós-condição de sucesso | Novo vídeo com filtro, original intacto, pedido concluído e operação contabilizada | REQ-VID-FILT-027, 029, 032, 033, 035, 041 |
| Pós-condição mínima | Sem resultados parciais, original preservado e quota inalterada | REQ-VID-FILT-016, 023, 033, 036 a 041 |
| RN1 | Formatos MP4 e MOV | REQ-VID-FILT-005 |
| RN2 | Perfis e limites dos vídeos | REQ-VID-FILT-003, 006, 007, 008, 009 |
| RN3 | Uma operação apenas na conclusão | REQ-VID-FILT-033 |
| RN4 | Novo vídeo, nome do resultado e original inalterado | REQ-VID-FILT-029, 030, 041 |
| RN5 | Filtro aplicado a todos os fotogramas | REQ-VID-FILT-027 |
| RN6 | Estados dos pedidos | REQ-VID-FILT-021, 022, 024, 032, 036, 039 |
| RN7 | Cancelamento apenas de pedidos ativos | REQ-VID-FILT-036 |
| RN8 | Limites de processamentos simultâneos | REQ-VID-FILT-017, 018, 019 |
| RN9 | Vídeo em carregamento não pode ser processado | REQ-VID-FILT-004 |
| RN10 | Acesso exclusivo do proprietário | REQ-VID-FILT-042 |
| RN11 | Catálogo inicial sem parâmetros | REQ-VID-FILT-012 |
| A1 | Vídeo armazenado e acessível ao serviço | Pressuposto do ambiente; não origina requisito autónomo. |
| A2 | Um filtro por pedido | REQ-VID-FILT-013 |
| A3 | Preservação do áudio original | REQ-VID-FILT-028 |
| A4 | Pré-visualização reduzida ou parcial permitida | REQ-VID-FILT-014; não se exige pré-visualização integral nem resolução original. |
| A5 | Resolução e taxa de fotogramas mantidas sempre que possível | Pendente de clarificação: faltam condições concretas para derivar um requisito verificável. |
| A6 | Notificação apenas interna | REQ-VID-FILT-034 |
| A7 | Resultado contabilizado no armazenamento | REQ-VID-FILT-031 |
| A8 | Possível reutilização de ferramentas de imagem | Orientação de implementação; não origina um requisito de sistema autónomo. |
| A9 | Biblioteca independente dos projetos | REQ-VID-FILT-001 |
| A10 | Quota partilhada entre imagens e vídeos | REQ-VID-FILT-011, 033 |
| Q1–Q9 | Questões em aberto | Não originam requisitos adicionais enquanto não forem decididas e incorporadas no caso de uso. |