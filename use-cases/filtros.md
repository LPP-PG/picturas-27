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
