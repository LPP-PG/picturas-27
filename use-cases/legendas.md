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
|**Funcionalidade**|Geração automática de legendas|
|**Perfil(s) de utilizador abrangido(s)**|A equipa optou por deixar o perfil Anónimo de fora (ver Q10), uma vez que as funcionalidades de vídeo exigem uma conta com limites de utilização controlados. O perfil Registado pode gerar legendas dentro da sua quota de 5 operações por dia. O perfil Premium utiliza a mesma funcionalidade sem limite diário de operações e com limites superiores de duração e tamanho do vídeo.|

**Justificação no contexto do MVP**

A geração automática de legendas permite tornar o conteúdo falado de um vídeo acessível em formato textual sem exigir uma transcrição manual. A funcionalidade permite ainda validar processamento de áudio, reconhecimento de fala, sincronização temporal e processamento assíncrono de vídeo.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

|**Secção**|**Detalhes**|
|---|---|
|**ID do Caso de Uso**|UC-VID-003|
|**Nome**|Gerar legendas automáticas para um vídeo|
|**Versão**|v1.0|
|**Autor**|Eduarda Ferreira; Luana Vilaverde; Daniel Rodrigues; Lucas Pinto|
|**Data**|2026-10-07|
|**Objetivo**|Permitir ao utilizador gerar automaticamente legendas sincronizadas com o conteúdo falado de um vídeo existente na sua biblioteca.|
|**Âmbito**|Módulo de vídeo do PictuRAS: seleção do idioma, processamento da faixa de áudio, reconhecimento de fala, geração de segmentos de legenda sincronizados, armazenamento das legendas e controlo da quota de operações.|
|**Ator Principal**|Utilizador Registado. O Utilizador Premium utiliza o mesmo fluxo, com limites diferentes.|
|**Stakeholders e Interesses**|**Utilizador:** quer obter legendas sincronizadas sem ter de transcrever manualmente o conteúdo falado e quer manter o vídeo original inalterado.  <br>**Dono do sistema:** quer disponibilizar uma funcionalidade de vídeo útil, controlando simultaneamente os recursos utilizados no processamento.  <br>**Equipa de desenvolvimento:** quer garantir que o áudio é processado corretamente, que o texto gerado fica associado aos intervalos temporais adequados e que o processamento não bloqueia o resto da aplicação.|
|**Pré-condições**|O utilizador tem sessão iniciada como Registado ou Premium.  <br>O vídeo já se encontra na biblioteca e o carregamento terminou.|
|**Trigger**|O utilizador seleciona um vídeo da biblioteca e escolhe a opção **Gerar legendas automáticas**.|

### 2.2 Fluxo Principal

|**Passo**|**Ação do Ator**|**Resposta do Sistema**|
|---|---|---|
|1|O utilizador abre a biblioteca de vídeos|Apresenta a lista de vídeos do utilizador, com nome, duração e tamanho|
|2|O utilizador seleciona um vídeo e escolhe **Gerar legendas automáticas**|Verifica o formato, a duração e o tamanho do vídeo, a existência de uma faixa de áudio e a quota diária restante|
|3||Apresenta o ecrã de geração de legendas e os idiomas suportados|
|4|O utilizador seleciona o idioma falado no vídeo|Regista o idioma selecionado|
|5|O utilizador confirma com **Gerar legendas**|Verifica novamente os limites do perfil, a quota e o número máximo de processamentos simultâneos|
|6||Cria o pedido de processamento e apresenta o estado **Em fila**|
|7||Inicia o processamento, passa o estado para **A processar** e apresenta o progresso|
|8||Processa a faixa de áudio, reconhece a fala e gera segmentos de texto associados aos respetivos intervalos temporais|
|9|O utilizador acompanha o progresso e pode continuar a utilizar outros ecrãs do PictuRAS|Atualiza periodicamente o progresso|
|10||Guarda as legendas geradas e associa-as ao vídeo|
|11||Passa o pedido para **Concluído**, contabiliza 1 operação na quota diária quando aplicável e notifica o utilizador|
|12|O utilizador abre o vídeo|Apresenta o vídeo com as legendas sincronizadas, permitindo a sua visualização durante a reprodução|

### 2.3 Fluxos Alternativos

|**Fluxo**|**Descrição**|
|---|---|
|**FA1 – Deteção automática do idioma**|No passo 4, o utilizador seleciona **Detetar automaticamente** em vez de escolher um idioma. Durante o processamento, o sistema analisa a fala presente no vídeo e determina o idioma. Se conseguir identificá-lo, utiliza-o na geração das legendas e o fluxo prossegue normalmente|
|**FA2 – Deteção automática inconclusiva**|No FA1, durante o processamento, o sistema não consegue determinar o idioma com confiança suficiente. O sistema interrompe o processamento, passa o pedido para **Falhou** sem guardar legendas, não contabiliza a operação e informa o utilizador de que deve repetir o pedido escolhendo manualmente um dos idiomas suportados|
|**FA3 – Cancelar o processamento**|Enquanto o pedido está **Em fila** ou **A processar**, o utilizador seleciona **Cancelar**. O sistema interrompe o processamento, elimina quaisquer legendas parciais, passa o pedido para **Cancelado** e não contabiliza a operação|
|**FA4 – Utilizador abandona o ecrã**|Depois de iniciar o pedido, o utilizador navega para outro ecrã ou fecha o separador. O processamento continua em segundo plano enquanto a sessão se mantiver ativa e o estado continua disponível quando o utilizador regressar|
|**FA5 – Limite de processamentos simultâneos**|No passo 5, o utilizador já atingiu o número máximo de processamentos simultâneos permitido pelo seu perfil. O sistema não cria o pedido, informa o utilizador e permite consultar os pedidos em curso|
|**FA6 – Utilizador termina a sessão**|O utilizador termina a sessão enquanto o pedido está **Em fila** ou **A processar**. O sistema cancela o pedido, interrompe o processamento, elimina quaisquer resultados parciais e não contabiliza a operação|
|**FA7 – Vídeo já tem legendas**|No passo 2, o vídeo já tem legendas associadas. O sistema avisa que, se a nova geração terminar em **Concluído**, as legendas atuais serão substituídas. O utilizador confirma e o fluxo prossegue no passo 3, ou desiste e nenhum pedido é criado|

### 2.4 Exceções

|**Condição**|**Comportamento do Sistema**|
|---|---|
|O formato do vídeo não é suportado (passo 2)|Apresenta **"Este formato de vídeo não é suportado para geração de legendas"**, indica os formatos aceites e não abre o ecrã de geração|
|O vídeo não contém uma faixa de áudio (passo 2)|Apresenta **"Não foi encontrada uma faixa de áudio neste vídeo"** e não permite iniciar a geração de legendas|
|A duração ou o tamanho do vídeo excedem os limites do perfil (passo 2)|Apresenta os limites do perfil atual e, no caso do Registado, informa que o perfil Premium permite limites superiores; não abre o ecrã de geração|
|A quota diária de operações está esgotada (passos 2 e 5)|Apresenta **"Atingiu o limite diário de operações"**, indica quando a quota será reposta e não cria o pedido|
|Não é detetada fala reconhecível no áudio (passo 8)|Passa o pedido para **Falhou** com a mensagem **"Não foi possível identificar fala neste vídeo"**, não cria legendas e não contabiliza a operação|
|O reconhecimento de fala falha durante o processamento (passo 8)|Passa o pedido para **Falhou**, elimina quaisquer legendas parciais, apresenta uma mensagem de erro e não contabiliza a operação|
|O serviço de processamento está indisponível ou a fila está cheia (passo 6)|Informa que o serviço está temporariamente indisponível, não cria o pedido e não contabiliza a operação|
|Não existe espaço suficiente para guardar os dados associados às legendas (passo 10)|Passa o pedido para **Falhou**, elimina qualquer resultado parcial, informa o utilizador e não contabiliza a operação|

### 2.5 Pós-condições

|**Tipo**|**Resultado**|
|---|---|
|**Garantia de Sucesso**|Existe um conjunto de legendas associado ao vídeo (que substitui o anterior, se existia), constituído por segmentos de texto sincronizados com os respetivos intervalos temporais; o vídeo original mantém-se inalterado; o pedido encontra-se no estado **Concluído** e foi contabilizada 1 operação na quota diária, quando aplicável|
|**Garantia Mínima**|O vídeo original mantém-se inalterado; não ficam legendas parciais associadas ao vídeo e as legendas anteriores, se existirem, mantêm-se; o pedido fica no estado **Falhou** ou **Cancelado**, ou não chega a ser criado; a quota diária não é consumida; o utilizador vê uma mensagem com a causa|

### 2.6 Regras de Negócio e Restrições

|**ID**|**Regra**|
|---|---|
|**RN1**|Os formatos de vídeo aceites para geração automática de legendas são MP4 e MOV|
|**RN2**|O perfil Registado pode processar vídeos com duração ≤ 60 s e tamanho ≤ 100 MB; o Premium, vídeos com duração ≤ 10 min e tamanho ≤ 1 GB. O perfil Anónimo não tem acesso às funcionalidades de vídeo|
|**RN3**|Para gerar legendas, o vídeo tem de possuir uma faixa de áudio|
|**RN4**|O utilizador pode selecionar manualmente um idioma suportado ou solicitar a deteção automática do idioma|
|**RN5**|Cada segmento de legenda contém um instante inicial, um instante final e o respetivo texto|
|**RN6**|Os instantes das legendas têm de estar dentro da duração total do vídeo e o instante inicial de cada segmento tem de ser anterior ao instante final|
|**RN7**|A geração automática de legendas conta como 1 operação na quota diária. A operação só é contabilizada quando o pedido termina em **Concluído**|
|**RN8**|As legendas são armazenadas separadamente do ficheiro de vídeo e a sua geração não altera o vídeo original|
|**RN9**|O pedido pode assumir os estados **Em fila**, **A processar**, **Concluído**, **Falhou** e **Cancelado**|
|**RN10**|Apenas pedidos nos estados **Em fila** ou **A processar** podem ser cancelados|
|**RN11**|O perfil Registado pode ter no máximo 1 processamento de vídeo em fila ou a processar; o Premium pode ter no máximo 3|
|**RN12**|Um vídeo ainda em carregamento não pode ser utilizado para gerar legendas|
|**RN13**|O vídeo, a faixa de áudio processada e as legendas geradas apenas podem ser acedidos pelo respetivo proprietário e estão sujeitos às regras de privacidade e armazenamento do PictuRAS|
|**RN14**|Cada vídeo tem no máximo um conjunto de legendas. Uma nova geração só substitui as legendas existentes quando termina em **Concluído**; se falhar ou for cancelada, as legendas anteriores mantêm-se|

### 2.7 Assunções

|**ID**|**Assunção**|
|---|---|
|**A1**|O vídeo encontra-se integralmente armazenado e acessível ao serviço de processamento no momento do pedido|
|**A2**|A faixa de áudio do vídeo pode ser extraída e processada pelo serviço de geração de legendas|
|**A3**|Todo o conteúdo falado do vídeo utiliza um único idioma durante toda a sua duração|
|**A4**|Quando é utilizada a deteção automática, o idioma identificado é utilizado durante todo o processo de geração das legendas|
|**A5**|O serviço de reconhecimento de fala consegue devolver informação temporal suficiente para sincronizar os segmentos de texto com o vídeo|
|**A6**|A geração automática de legendas pode conter erros quando existe ruído, fala pouco clara ou sobreposição de vozes|
|**A7**|A notificação de conclusão é apresentada apenas dentro da aplicação|
|**A8**|Durante a utilização deste caso de uso, não é considerada a expiração automática da sessão por timeout; a sessão pode terminar por ação explícita do utilizador|
|**A9**|Os vídeos ficam numa biblioteca de vídeos do utilizador, nova e independente dos projetos do PictuRAS; no MVP, os vídeos não são adicionados a projetos de imagens|
|**A10**|A quota diária de 5 operações do perfil Registado é partilhada entre as operações sobre imagens e as operações sobre vídeos|

### 2.8 Questões em Aberto

|**ID**|**Questão**|
|---|---|
|**Q1**|Que idiomas devem ser suportados pela geração automática de legendas?|
|**Q2**|Que nível de confiança deve ser considerado suficiente para aceitar automaticamente o idioma detetado?|
|**Q3**|Deve o utilizador poder editar manualmente o texto das legendas depois da geração?|
|**Q4**|Deve ser possível alterar manualmente os instantes inicial e final de cada segmento?|
|**Q5**|Deve ser possível exportar as legendas para formatos como SRT ou WebVTT?|
|**Q6**|Deve existir uma opção para incorporar permanentemente as legendas na imagem do vídeo?|
|**Q7**|Deve uma versão futura suportar vídeos em que são utilizados vários idiomas?|
|**Q8**|Deve o sistema conseguir identificar diferentes pessoas a falar no mesmo vídeo?|
|**Q9**|Deve existir uma funcionalidade separada para traduzir automaticamente as legendas?|
|**Q10**|O perfil Anónimo deve poder aceder a esta funcionalidade, com limites mais apertados?|
|**Q11**|No sistema existente, as funcionalidades com IA são uma vantagem do perfil Premium. A geração de legendas, que usa reconhecimento de fala, deve estar disponível para o perfil Registado ou apenas para o Premium?|
|**Q12**|A restrição R5 do sistema existente limita as operações com IA a 60 s de tempo de resposta médio. Como se aplica a vídeos Premium com até 10 min, cuja transcrição pode demorar mais?|
|**Q13**|Deve a operação ser reservada na quota no momento da confirmação? Com a regra atual, a operação só é contabilizada no fim: um utilizador Registado pode iniciar o pedido com 4 operações gastas, fazer uma operação sobre uma imagem enquanto o vídeo é processado e terminar o dia com 6 operações|
|**Q14**|Como se relacionam os vídeos com os projetos existentes do PictuRAS? Deve ser possível adicionar vídeos a um projeto, ao lado das imagens, e usá-los no encadeamento de ferramentas?|

---

## 3. Utilização de agentes de IA

|**Ferramenta / skill**|**Tarefa apoiada**|**Validação realizada pela equipa**|
|---|---|---|
|ChatGPT (OpenAI)|Discussão e exploração das minúcias e possibilidades associadas à funcionalidade de geração automática de legendas, nomeadamente comportamentos, limitações e situações excecionais|A IA foi utilizada apenas como apoio à discussão das funcionalidades. Todas as decisões sobre o caso de uso, regras, fluxos e comportamentos foram tomadas pela equipa, que também foi responsável pela redação do documento|
|Claude (claude.ai)|Revisão do caso de uso face ao template v2, aos exemplos de referência e ao documento de requisitos 2025/26: deteção de inconsistências entre fluxos, exceções e pré-condições e de lacunas de alinhamento com o sistema existente|Cada sugestão foi analisada pela equipa antes de ser incorporada. Foram corrigidas as contradições entre FA1 e FA2 e entre as pré-condições e as exceções, removida a exceção de idioma não suportado e acrescentados o fluxo FA7, a regra RN14, as assunções A9 e A10 e as questões Q10 a Q14|
