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

## 4. Esboço de requisitos derivados

### 4.1 Requisitos de Sistema

| **ID** | **Requisito** | **Tipo** | **Prioridade** | **Novo/Alt** | **Origem** | **Como verificar** |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-VID-LEG-001 | O sistema deve apresentar a lista de vídeos da biblioteca do utilizador com nome, duração e tamanho. | F | Deve ter | NOVO | Passo 1 / A9 | Dado um utilizador com vídeos, quando abre a biblioteca, então cada vídeo apresenta nome, duração e tamanho. |
| REQ-VID-LEG-002 | O sistema deve permitir ao utilizador selecionar um vídeo da sua biblioteca para solicitar a geração automática de legendas. | F | Deve ter | NOVO | Trigger / Passo 2 | Dado um vídeo da biblioteca, quando o utilizador o seleciona, então pode escolher Gerar legendas automáticas. |
| REQ-VID-LEG-003 | O sistema deve restringir a geração de legendas a utilizadores com sessão iniciada como Registado ou Premium. | NF — Segurança / acesso | Deve ter | ALT | Pré-condições / RN2 | Dado um utilizador sem sessão iniciada, quando tenta gerar legendas, então o acesso é recusado. |
| REQ-VID-LEG-004 | O sistema deve impedir a geração de legendas enquanto o carregamento do vídeo não estiver concluído. | F | Deve ter | NOVO | Pré-condições / RN12 | Dado um vídeo em carregamento, quando se tenta gerar legendas, então a operação é impedida. |
| REQ-VID-LEG-005 | O sistema deve rejeitar vídeos em formatos diferentes de MP4 ou MOV, apresentando a mensagem "Este formato de vídeo não é suportado para geração de legendas" e os formatos aceites. | F | Deve ter | NOVO | Passo 2 / Exceção 1 / RN1 | Dado um vídeo noutro formato, quando se escolhe gerar legendas, então aparece a mensagem com os formatos aceites e o ecrã de geração não abre. |
| REQ-VID-LEG-006 | O sistema deve rejeitar vídeos sem faixa de áudio, apresentando a mensagem "Não foi encontrada uma faixa de áudio neste vídeo". | F | Deve ter | NOVO | Passo 2 / Exceção 2 / RN3 | Dado um vídeo sem áudio, quando se escolhe gerar legendas, então aparece a mensagem indicada e a operação é impedida. |
| REQ-VID-LEG-007 | O sistema deve limitar os vídeos do perfil Registado a 60 s de duração e 100 MB de tamanho. | NF — Capacidade / limites | Deve ter | ALT | RN2 | Dado um Registado, quando seleciona um vídeo com 60 s e 100 MB, então passa esta validação; com 61 s ou 101 MB, é rejeitado. |
| REQ-VID-LEG-008 | O sistema deve limitar os vídeos do perfil Premium a 10 min de duração e 1 GB de tamanho. | NF — Capacidade / limites | Deve ter | ALT | RN2 | Dado um Premium, quando seleciona um vídeo com 10 min e 1 GB, então passa esta validação; acima de qualquer dos limites, é rejeitado. |
| REQ-VID-LEG-009 | O sistema deve apresentar os limites do perfil quando rejeitar um vídeo por excesso de duração ou tamanho, referindo os limites superiores do Premium no caso do Registado. | F | Deveria ter | NOVO | Exceção 3 | Dado um vídeo acima dos limites, quando é rejeitado, então a mensagem apresenta os limites aplicáveis e, para um Registado, refere o Premium. |
| REQ-VID-LEG-010 | O sistema deve impedir novos pedidos quando a quota diária aplicável estiver esgotada, apresentando a mensagem "Atingiu o limite diário de operações" e indicando quando será reposta. | F | Deve ter | ALT | Passos 2 e 5 / Exceção 4 | Dado um Registado sem quota disponível, quando abre ou confirma a geração, então nenhum pedido é criado e a mensagem indica a reposição. |
| REQ-VID-LEG-011 | O sistema deve solicitar confirmação quando o vídeo já tiver legendas, avisando que estas só serão substituídas se a nova geração terminar em Concluído. | F | Deve ter | NOVO | FA7 / RN14 | Dado um vídeo com legendas, quando se solicita uma nova geração, então aparece o aviso; se o utilizador desistir, nenhum pedido é criado. |
| REQ-VID-LEG-012 | O sistema deve apresentar o ecrã de geração com os idiomas suportados e a opção Detetar automaticamente. | F | Deve ter | NOVO | Passo 3 / FA1 / RN4 | Dado um vídeo elegível, quando o ecrã abre, então apresenta os idiomas suportados e a opção de deteção automática. |
| REQ-VID-LEG-013 | O sistema deve permitir ao utilizador escolher e registar o idioma do pedido, por seleção manual ou deteção automática. | F | Deve ter | NOVO | Passo 4 / FA1 / RN4 | Dado o ecrã de geração, quando o utilizador escolhe um idioma ou deteção automática, então o pedido conserva essa escolha. |
| REQ-VID-LEG-014 | O sistema deve aceitar a confirmação da geração apenas quando os limites do perfil, a quota diária e o número de processamentos simultâneos forem novamente validados. | F | Deve ter | ALT | Passo 5 / FA5 / Exceção 4 | Dado uma condição que deixou de ser satisfeita após abrir o ecrã, quando o utilizador confirma, então o pedido não é criado. |
| REQ-VID-LEG-015 | O sistema deve limitar os processamentos de vídeo Em fila ou A processar a 1 por utilizador Registado e a 3 por utilizador Premium. | NF — Capacidade / limites | Deve ter | ALT | RN11 / FA5 | Dado um Registado com 1 pedido ativo ou um Premium com 3, quando confirma outro, então o novo pedido é rejeitado. |
| REQ-VID-LEG-016 | O sistema deve informar o utilizador quando o limite de processamentos simultâneos for atingido. | F | Deve ter | NOVO | FA5 | Dado o limite atingido, quando o utilizador confirma outro pedido, então recebe uma mensagem com a causa da rejeição. |
| REQ-VID-LEG-017 | O sistema deve permitir ao utilizador consultar os seus pedidos de legendas e o estado atual de cada um. | F | Deve ter | NOVO | Passo 9 / FA4 / FA5 / RN9 | Dado um utilizador com pedidos, quando os consulta ou regressa ao ecrã, então vê os estados atuais. |
| REQ-VID-LEG-018 | O sistema deve criar os pedidos aceites no estado Em fila. | F | Deve ter | NOVO | Passo 6 / RN9 | Dado uma confirmação válida e aceite pelo serviço, quando o pedido é criado, então o seu estado inicial é Em fila. |
| REQ-VID-LEG-019 | O sistema deve recusar a criação do pedido quando o serviço estiver indisponível ou a fila estiver cheia, informando que o serviço está temporariamente indisponível. | F | Deve ter | NOVO | Exceção 7 | Dado uma das condições indicadas, quando o utilizador confirma, então nenhum pedido é criado e aparece a informação de indisponibilidade. |
| REQ-VID-LEG-020 | O sistema deve passar o pedido para A processar quando iniciar o processamento. | F | Deve ter | NOVO | Passo 7 / RN9 | Dado um pedido Em fila, quando o processamento começa, então o estado passa para A processar. |
| REQ-VID-LEG-021 | O sistema deve apresentar informação de progresso atualizada durante o processamento. | F | Deve ter | NOVO | Passos 7 e 9 | Dado um pedido em processamento, quando o utilizador o acompanha, então vê informação de progresso que acompanha o avanço do processamento. |
| REQ-VID-LEG-022 | O sistema deve manter o processamento em segundo plano quando o utilizador muda de ecrã ou fecha o separador, enquanto a sessão se mantiver ativa. | F | Deve ter | NOVO | Passo 9 / FA4 / A8 | Dado um pedido ativo, quando o utilizador abandona o ecrã sem terminar a sessão, então o processamento continua. |
| REQ-VID-LEG-023 | O sistema deve gerar segmentos de legenda a partir da fala, contendo cada segmento um instante inicial, um instante final e o texto reconhecido. | F | Deve ter | NOVO | Passo 8 / RN5 / A5 | Dado um vídeo com fala reconhecível, quando a geração conclui, então cada segmento contém os três elementos. |
| REQ-VID-LEG-024 | O sistema deve garantir que cada segmento satisfaz 0 ≤ instante inicial < instante final ≤ duração do vídeo. | NF — Integridade temporal | Deve ter | NOVO | RN6 | Dado legendas geradas, quando se verificam os tempos, então todos os segmentos satisfazem a condição. |
| REQ-VID-LEG-025 | O sistema deve identificar e utilizar o idioma da fala na geração das legendas quando for escolhida a deteção automática. | F | Deve ter | NOVO | FA1 / A4 | Dado um vídeo com idioma identificável, quando se escolhe deteção automática, então as legendas são geradas utilizando o idioma identificado. |
| REQ-VID-LEG-026 | O sistema deve passar o pedido para Falhou quando a deteção do idioma for inconclusiva, orientando o utilizador para repetir o pedido com seleção manual. | F | Deve ter | NOVO | FA2 | Dado uma deteção inconclusiva, quando o processamento chega a essa conclusão, então o pedido fica Falhou e a mensagem indica a seleção manual. |
| REQ-VID-LEG-027 | O sistema deve passar o pedido para Falhou quando não detetar fala reconhecível, apresentando a mensagem "Não foi possível identificar fala neste vídeo". | F | Deve ter | NOVO | Exceção 5 | Dado um vídeo sem fala reconhecível, quando é processado, então o pedido fica Falhou com a mensagem indicada. |
| REQ-VID-LEG-028 | O sistema deve passar o pedido para Falhou quando o reconhecimento de fala falhar, apresentando uma mensagem de erro. | F | Deve ter | NOVO | Exceção 6 | Dado uma falha do reconhecimento, quando ocorre, então o pedido fica Falhou e o utilizador recebe uma mensagem de erro. |
| REQ-VID-LEG-029 | O sistema deve passar o pedido para Falhou quando não existir espaço para guardar as legendas, informando o utilizador da causa. | F | Deve ter | NOVO | Exceção 8 | Dado espaço insuficiente, quando o armazenamento é tentado, então o pedido fica Falhou com indicação da causa. |
| REQ-VID-LEG-030 | O sistema deve guardar as legendas separadamente do ficheiro de vídeo, associadas ao vídeo que originou o pedido. | F | Deve ter | NOVO | Passo 10 / RN8 / Pós-condição de sucesso | Dado um pedido concluído, quando se consultam os recursos, então as legendas estão separadas do ficheiro de vídeo e associadas ao vídeo correto. |
| REQ-VID-LEG-031 | O sistema deve manter no máximo um conjunto de legendas associado ao vídeo, substituindo o anterior apenas quando a nova geração terminar em Concluído. | NF — Fiabilidade / integridade | Deve ter | NOVO | RN14 / FA7 / Pós-condições | Dado um vídeo com legendas, quando a nova geração conclui, então fica apenas o novo conjunto; se falhar ou for cancelada, permanece o anterior. |
| REQ-VID-LEG-032 | O sistema deve permitir cancelar apenas pedidos Em fila ou A processar, passando-os para Cancelado e interrompendo o respetivo processamento. | F | Deve ter | NOVO | FA3 / RN9 / RN10 | Dado pedidos nos cinco estados, quando se tenta cancelar, então apenas os ativos aceitam a ação, passam para Cancelado e deixam de ser processados. |
| REQ-VID-LEG-033 | O sistema deve cancelar os pedidos de legendas ativos quando o utilizador termina explicitamente a sessão. | F | Deve ter | ALT | FA6 / A8 | Dado pedidos Em fila ou A processar, quando o utilizador faz logout, então esses pedidos são cancelados. |
| REQ-VID-LEG-034 | O sistema deve eliminar os resultados parciais de pedidos que terminem em Falhou ou Cancelado. | F | Deve ter | NOVO | FA2 / FA3 / FA6 / Exceções 5, 6 e 8 / Pós-condição mínima | Dado um pedido com resultados parciais, quando falha ou é cancelado, então esses resultados são eliminados. |
| REQ-VID-LEG-035 | O sistema deve contabilizar exatamente 1 operação na quota diária aplicável apenas quando o pedido terminar em Concluído. | F | Deve ter | ALT | Passo 11 / RN7 / A10 / Pós-condições | Dado pedidos concluídos, falhados, cancelados e rejeitados, quando se verifica a quota, então apenas cada pedido concluído acrescenta 1 operação. |
| REQ-VID-LEG-036 | O sistema deve passar o pedido para Concluído após guardar e associar as legendas ao vídeo. | F | Deve ter | NOVO | Passos 10 e 11 / RN9 / Pós-condição de sucesso | Dado legendas guardadas e associadas, quando a operação termina com sucesso, então o pedido passa para Concluído. |
| REQ-VID-LEG-037 | O sistema deve notificar o utilizador dentro da aplicação quando o pedido terminar em Concluído. | F | Deveria ter | NOVO | Passo 11 / A7 | Dado um pedido concluído, quando o utilizador consulta a aplicação, então a notificação está disponível. |
| REQ-VID-LEG-038 | O sistema deve apresentar cada segmento de legenda durante o respetivo intervalo temporal na reprodução do vídeo. | F | Deve ter | NOVO | Passo 12 | Dado um vídeo com legendas, quando é reproduzido, então cada segmento aparece entre os seus instantes inicial e final. |
| REQ-VID-LEG-039 | O sistema deve manter o ficheiro de vídeo original inalterado durante e após a geração de legendas. | NF — Fiabilidade / integridade | Deve ter | NOVO | RN8 / Pós-condições | Dado um vídeo original, quando um pedido conclui, falha ou é cancelado, então o resumo criptográfico do ficheiro mantém-se igual ao inicial. |
| REQ-VID-LEG-040 | O sistema deve restringir o acesso ao vídeo, ao áudio processado e às legendas ao respetivo proprietário. | NF — Segurança / acesso | Deve ter | ALT | RN13 | Dado recursos de um utilizador, quando outro utilizador tenta aceder-lhes, então o acesso é recusado. |

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisitos relacionados** |
| --- | --- | --- | --- |
| Perfis e permissões | Estender | Aplicar os perfis Registado e Premium à geração de legendas, excluindo o Anónimo e introduzindo limites de duração, tamanho e simultaneidade. | REQ-VID-LEG-003, 007, 008, 014, 015 |
| Quota diária de operações | Estender | Integrar a geração de legendas na quota partilhada entre imagens e vídeos, verificando-a na abertura e confirmação e contabilizando apenas pedidos concluídos. | REQ-VID-LEG-010, 014, 035 |
| Gestão da sessão | Estender | Associar o logout explícito ao cancelamento dos pedidos ativos, mantendo o processamento quando o utilizador apenas abandona o ecrã. | REQ-VID-LEG-022, 033 |
| Armazenamento e gestão de recursos | Estender | Armazenar legendas separadas do vídeo e preservar o original e as legendas anteriores perante falhas ou cancelamentos. | REQ-VID-LEG-029, 030, 031, 034, 039 |
| Controlo de acesso e privacidade | Estender | Aplicar o acesso exclusivo do proprietário ao vídeo, ao áudio processado e às legendas. | REQ-VID-LEG-003, 040 |
| Interface da aplicação | Estender | Disponibilizar biblioteca de vídeos, geração de legendas, escolha do idioma, acompanhamento dos pedidos e reprodução com legendas. | REQ-VID-LEG-001, 002, 011, 012, 013, 017, 021, 038 |
| Notificações internas | Estender | Apresentar notificações de conclusão dos pedidos de legendas dentro da aplicação. | REQ-VID-LEG-037 |
| Projetos e encadeamento de ferramentas | Manter | A biblioteca de vídeos permanece independente dos projetos de imagens, conforme A9. A integração futura continua em aberto em Q14. | REQ-VID-LEG-001 |
| Restrição de desempenho das operações com IA | Manter | Não é introduzido um novo limite de processamento. A aplicação de R5 aos vídeos permanece em aberto em Q12. | Sem requisito derivado de Q12 |

### 4.3 Matriz de Rastreabilidade


| **Elemento do Caso de Uso** | **Descrição abreviada** | **Requisito(s) de Sistema** |
| --- | --- | --- |
| Pré-condições | Sessão iniciada e vídeo carregado | REQ-VID-LEG-003, 004 |
| Trigger | Selecionar vídeo e solicitar geração | REQ-VID-LEG-002 |
| Passo 1 | Apresentar biblioteca | REQ-VID-LEG-001 |
| Passo 2 | Seleção e validações iniciais | REQ-VID-LEG-002, 005, 006, 007, 008, 010 |
| Passo 3 | Ecrã de geração e idiomas | REQ-VID-LEG-012 |
| Passo 4 | Escolha e registo do idioma | REQ-VID-LEG-013 |
| Passo 5 | Confirmação e revalidação | REQ-VID-LEG-014 |
| Passo 6 | Criar pedido Em fila | REQ-VID-LEG-018 |
| Passo 7 | Iniciar processamento e apresentar progresso | REQ-VID-LEG-020, 021 |
| Passo 8 | Reconhecer fala e gerar segmentos | REQ-VID-LEG-023 |
| Passo 9 | Acompanhamento e processamento em segundo plano | REQ-VID-LEG-017, 021, 022 |
| Passo 10 | Guardar e associar legendas | REQ-VID-LEG-030 |
| Passo 11 | Conclusão, contabilização e notificação | REQ-VID-LEG-035, 036, 037 |
| Passo 12 | Reprodução com legendas | REQ-VID-LEG-038 |
| FA1 | Deteção automática do idioma | REQ-VID-LEG-012, 013, 025 |
| FA2 | Deteção automática inconclusiva | REQ-VID-LEG-026, 034, 035 |
| FA3 | Cancelar processamento | REQ-VID-LEG-032, 034, 035 |
| FA4 | Abandonar o ecrã ou fechar o separador | REQ-VID-LEG-017, 022 |
| FA5 | Limite de processamentos simultâneos | REQ-VID-LEG-014, 015, 016, 017 |
| FA6 | Terminar explicitamente a sessão | REQ-VID-LEG-033, 034, 035 |
| FA7 | Vídeo com legendas existentes | REQ-VID-LEG-011, 031 |
| Exceção 1 | Formato não suportado | REQ-VID-LEG-005 |
| Exceção 2 | Ausência de áudio | REQ-VID-LEG-006 |
| Exceção 3 | Limites excedidos | REQ-VID-LEG-007, 008, 009 |
| Exceção 4 | Quota esgotada | REQ-VID-LEG-010, 014 |
| Exceção 5 | Ausência de fala reconhecível | REQ-VID-LEG-027, 034, 035 |
| Exceção 6 | Falha do reconhecimento | REQ-VID-LEG-028, 034, 035 |
| Exceção 7 | Serviço indisponível ou fila cheia | REQ-VID-LEG-019, 035 |
| Exceção 8 | Espaço insuficiente | REQ-VID-LEG-029, 034, 035 |
| Pós-condição de sucesso | Legendas associadas, original intacto e operação contabilizada | REQ-VID-LEG-023, 030, 031, 035, 036, 038, 039 |
| Pós-condição mínima | Sem parciais; original, legendas anteriores e quota preservados | REQ-VID-LEG-026 a 029, 031, 032, 033, 034, 035, 039 |
| RN1 | Formatos MP4 e MOV | REQ-VID-LEG-005 |
| RN2 | Perfis e limites dos vídeos | REQ-VID-LEG-003, 007, 008 |
| RN3 | Faixa de áudio obrigatória | REQ-VID-LEG-006 |
| RN4 | Idioma manual ou automático | REQ-VID-LEG-012, 013, 025 |
| RN5 | Estrutura dos segmentos | REQ-VID-LEG-023 |
| RN6 | Intervalos temporais válidos | REQ-VID-LEG-024 |
| RN7 | Uma operação apenas na conclusão | REQ-VID-LEG-035 |
| RN8 | Legendas separadas e original inalterado | REQ-VID-LEG-030, 039 |
| RN9 | Estados dos pedidos | REQ-VID-LEG-017, 018, 020, 026, 027, 028, 029, 032, 036 |
| RN10 | Cancelamento apenas de pedidos ativos | REQ-VID-LEG-032 |
| RN11 | Simultaneidade por perfil | REQ-VID-LEG-014, 015 |
| RN12 | Impedir geração durante carregamento | REQ-VID-LEG-004 |
| RN13 | Acesso exclusivo do proprietário | REQ-VID-LEG-040 |
| RN14 | Um conjunto de legendas e substituição apenas na conclusão | REQ-VID-LEG-011, 031 |
| A1 | Vídeo armazenado e acessível | Pressuposto do ambiente; não origina um requisito autónomo. |
| A2 | Áudio extraível e processável | REQ-VID-LEG-023; pressuposto de viabilidade. |
| A3 | Um único idioma por vídeo | Delimitação do âmbito; não exige suporte a vários idiomas. |
| A4 | Utilização do idioma detetado | REQ-VID-LEG-025 |
| A5 | Informação temporal para sincronização | REQ-VID-LEG-023, 024, 038 |
| A6 | Possibilidade de erros de reconhecimento | Limitação assumida; não estabelece um alvo mensurável de precisão. |
| A7 | Notificação apenas interna | REQ-VID-LEG-037 |
| A8 | Logout explícito e ausência de timeout | REQ-VID-LEG-022, 033 |
| A9 | Biblioteca independente dos projetos | REQ-VID-LEG-001 |
| A10 | Quota partilhada entre imagens e vídeos | REQ-VID-LEG-010, 035 |
| Q1–Q14 | Questões em aberto | Não originam requisitos adicionais enquanto não forem decididas e incorporadas no caso de uso. |