# Exercício 1 - Entrega

### Casos de Uso · Fase 1: Suporte a Vídeo no PictuRAS

## 0. Identificação

| **Campo**               | **Valor**                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **Grupo / Equipa**      |                                                                                                  |
| **Autores**             | Eduarda Ferreira PG65368; Luana Vilaverde PG65367; Daniel Rodrigues PG63934; Lucas Pinto PG63997 |
| **Data**                | 2026-10-18                                                                                       |
| **Versão do documento** | v1.3                                                                                             |
| **Unidade Curricular**  | Requisitos e Arquiteturas de Software, MEI, Universidade do Minho                                |

---

## 1. Funcionalidade de vídeo escolhida

|**Campo**|**Valor**|
|---|---|
|**Funcionalidade**|Geração automática de legendas, como ferramenta de um projeto de vídeo|
|**Perfil(s) de utilizador abrangido(s)**|O perfil Anónimo fica de fora: não cria projetos de vídeo (UC-VID-004). O perfil Registado pode gerar legendas dentro da sua quota de 5 operações por dia. O perfil Premium utiliza a mesma funcionalidade sem limite diário de operações e com os limites superiores de duração e tamanho do vídeo definidos no carregamento (UC-VID-004, RN4).|

**Justificação no contexto do MVP**

A geração automática de legendas permite tornar o conteúdo falado de um vídeo acessível em formato textual sem exigir uma transcrição manual. É uma das ferramentas do editor de projetos de vídeo, a par de Recorte e Filtros, e assenta no caso de uso de carregamento de vídeos (UC-VID-004): o utilizador escolhe um vídeo do projeto e as legendas ficam associadas a esse vídeo. A funcionalidade permite ainda validar processamento de áudio, reconhecimento de fala, sincronização temporal e processamento assíncrono de vídeo.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

|**Secção**|**Detalhes**|
|---|---|
|**ID do Caso de Uso**|UC-VID-003|
|**Nome**|Gerar legendas automáticas para um vídeo de um projeto|
|**Versão**|v1.3|
|**Autor**|Eduarda Ferreira; Luana Vilaverde; Daniel Rodrigues; Lucas Pinto|
|**Data**|2026-10-18|
|**Objetivo**|Permitir ao utilizador gerar automaticamente legendas sincronizadas com o conteúdo falado de um vídeo de um projeto de vídeo.|
|**Âmbito**|Ferramenta Legendas do editor de projetos de vídeo, para vídeos falados em inglês: verificação do idioma, processamento da faixa de áudio, reconhecimento de fala, geração de segmentos de legenda sincronizados, armazenamento das legendas e controlo da quota de operações. Não inclui o carregamento, a listagem nem a visualização dos vídeos (UC-VID-004), nem as ferramentas Recorte e Filtros.|
|**Ator Principal**|Utilizador Registado. O Utilizador Premium utiliza o mesmo fluxo, com limites diferentes.|
|**Stakeholders e Interesses**|**Utilizador:** quer obter legendas sincronizadas sem ter de transcrever manualmente o conteúdo falado e quer manter o vídeo original inalterado.  <br>**Dono do sistema:** quer disponibilizar uma funcionalidade de vídeo útil, controlando simultaneamente os recursos utilizados no processamento.  <br>**Equipa de desenvolvimento:** quer garantir que o áudio é processado corretamente, que o texto gerado fica associado aos intervalos temporais adequados e que o processamento não bloqueia o resto da aplicação.|
|**Pré-condições**|O utilizador tem sessão iniciada como Registado ou Premium.  <br>Existe um projeto de vídeo com o vídeo selecionado já disponível para edição, ou seja, carregado, validado, guardado com miniatura e associado ao projeto (UC-VID-004, RN9).|
|**Trigger**|O utilizador seleciona, num projeto de vídeo, um vídeo pela sua miniatura e escolhe a ferramenta **Legendas**.|

### 2.2 Fluxo Principal

|**Passo**|**Ação do Ator**|**Resposta do Sistema**|
|---|---|---|
|1|O utilizador abre um projeto de vídeo e seleciona um vídeo pela sua miniatura|Apresenta o vídeo selecionado no leitor e as ferramentas de vídeo (UC-VID-004)|
|2|O utilizador escolhe a ferramenta **Legendas**|Verifica a existência de uma faixa de áudio e a quota diária restante|
|3||Apresenta o ecrã de geração de legendas, indicando que o único idioma suportado é o inglês|
|4||Regista o inglês como idioma do pedido|
|5|O utilizador confirma com **Gerar legendas**|Verifica novamente a quota diária, o espaço de armazenamento disponível no projeto e na conta e o número de pedidos de processamento de vídeo em simultâneo|
|6||Reserva 1 operação na quota diária quando aplicável, cria o pedido de processamento e apresenta o estado **A aguardar**|
|7||Inicia o processamento, passa o estado para **A processar** e apresenta o progresso|
|8||Processa a faixa de áudio, identifica o idioma da fala para confirmar que é inglês (RN4), reconhece a fala e gera segmentos de texto associados aos respetivos intervalos temporais|
|9|O utilizador acompanha o progresso e pode continuar a utilizar outros ecrãs do PictuRAS|Atualiza periodicamente o progresso|
|10||Guarda as legendas geradas, associa-as ao vídeo no respetivo projeto e atualiza o espaço ocupado no projeto e na conta|
|11||Passa o pedido para **Concluído**, mantém contabilizada a operação reservada no passo 6 e notifica o utilizador|
|12|O utilizador seleciona o vídeo no projeto pela sua miniatura|Apresenta o vídeo com as legendas sincronizadas, permitindo a sua visualização durante a reprodução|

### 2.3 Fluxos Alternativos

|**Fluxo**|**Descrição**|
|---|---|
|**FA1 – Idioma da fala sem confiança suficiente**|No passo 8, o sistema não consegue identificar o idioma da fala com confiança suficiente (por exemplo, por ruído ou pouca fala). O sistema prossegue a geração em inglês. Se não houver fala reconhecível, aplica a exceção de ausência de fala|
|**FA3 – Cancelar o processamento**|Enquanto o pedido está **A aguardar** ou **A processar**, o utilizador seleciona **Cancelar**. O sistema interrompe o processamento, elimina quaisquer legendas parciais, passa o pedido para **Cancelado** e não contabiliza a operação|
|**FA4 – Utilizador abandona o ecrã**|Depois de iniciar o pedido, o utilizador navega para outro ecrã, muda de projeto ou fecha o separador. O processamento continua em segundo plano enquanto a sessão se mantiver ativa e o estado continua disponível quando o utilizador regressar|
|**FA5 – Limite de pedidos em simultâneo**|No passo 5, o utilizador já atingiu o número máximo de pedidos de processamento de vídeo em simultâneo permitido pelo seu perfil, em qualquer ferramenta de vídeo. O sistema não cria o pedido, informa o utilizador e oferece a navegação para a lista de pedidos, onde pode acompanhar ou cancelar os pedidos em curso|
|**FA6 – Utilizador termina a sessão**|O utilizador termina a sessão enquanto o pedido está **A aguardar** ou **A processar**. O sistema cancela o pedido, interrompe o processamento, elimina quaisquer resultados parciais e não contabiliza a operação|
|**FA7 – Vídeo já tem legendas**|No passo 2, o vídeo já tem legendas associadas. O sistema avisa que, se a nova geração terminar em **Concluído**, as legendas atuais serão substituídas. O utilizador confirma e o fluxo prossegue no passo 3, ou desiste e nenhum pedido é criado|

### 2.4 Exceções

|**Condição**|**Comportamento do Sistema**|
|---|---|
|O vídeo não contém uma faixa de áudio (passo 2)|Apresenta **"Não foi encontrada uma faixa de áudio neste vídeo"** e não permite iniciar a geração de legendas|
|A quota diária de operações está esgotada (passos 2 e 5)|Apresenta **"Atingiu o limite diário de operações"**, indica quando a quota será reposta e não cria o pedido|
|Não é detetada fala reconhecível no áudio (passo 8)|Passa o pedido para **Falhou** com a mensagem **"Não foi possível identificar fala neste vídeo"**, não cria legendas e não contabiliza a operação|
|O reconhecimento de fala falha durante o processamento (passo 8)|Passa o pedido para **Falhou**, elimina quaisquer legendas parciais, apresenta uma mensagem de erro e não contabiliza a operação|
|O serviço de processamento está indisponível ou a fila está cheia (passo 6)|Informa que o serviço está temporariamente indisponível, não cria o pedido e não contabiliza a operação|
|O espaço livre no projeto ou na conta não chega para guardar as legendas (passo 5)|Apresenta **"Espaço de armazenamento insuficiente"** com o limite atingido (projeto ou conta), não cria o pedido e não contabiliza a operação|
|Não existe espaço suficiente no projeto ou na conta para guardar as legendas no fim do processamento (passo 10)|Passa o pedido para **Falhou**, elimina qualquer resultado parcial, apresenta **"Espaço de armazenamento insuficiente"** e não contabiliza a operação|
|A fala do vídeo está num idioma que não é o inglês (passo 8)|Passa o pedido para **Falhou** com a mensagem **"Este vídeo não parece estar em inglês"**, não cria legendas e não contabiliza a operação. O sistema não traduz o conteúdo falado|

### 2.5 Pós-condições

|**Tipo**|**Resultado**|
|---|---|
|**Garantia de Sucesso**|Existe um conjunto de legendas associado ao vídeo do projeto (que substitui o anterior, se existia), constituído por segmentos de texto sincronizados com os respetivos intervalos temporais e contabilizado no espaço do projeto e da conta; o vídeo original mantém-se inalterado; o pedido encontra-se no estado **Concluído** e foi contabilizada 1 operação na quota diária, quando aplicável|
|**Garantia Mínima**|O vídeo original mantém-se inalterado; não ficam legendas parciais associadas ao vídeo e as legendas anteriores, se existirem, mantêm-se; o pedido fica no estado **Falhou** ou **Cancelado**, ou não chega a ser criado; a operação reservada, se existir, é devolvida e a quota diária não é consumida; o utilizador vê uma mensagem com a causa|

### 2.6 Regras de Negócio e Restrições

|**ID**|**Regra**|
|---|---|
|**RN1**|Os formatos de vídeo aceites (MP4 e MOV) e a validação do conteúdo são os do UC-VID-004 (RN3), verificados no carregamento; a geração de legendas não os repete|
|**RN2**|Só os perfis Registado e Premium têm acesso a projetos de vídeo e, por isso, à ferramenta Legendas (UC-VID-004, RN2). Os limites de duração e de tamanho dos vídeos são os do UC-VID-004 (RN4), verificados no carregamento; a geração de legendas não os repete|
|**RN3**|Para gerar legendas, o vídeo tem de possuir uma faixa de áudio|
|**RN4**|Só é suportado o inglês. Antes de transcrever, o sistema identifica o idioma da fala: se for outro idioma com confiança ≥ 0,5, o pedido falha (Exceção 8); com confiança inferior, a geração prossegue em inglês (FA1). O sistema nunca traduz o conteúdo falado; a tradução é uma funcionalidade separada (Q9)|
|**RN5**|Cada segmento de legenda contém um instante inicial, um instante final e o respetivo texto|
|**RN6**|Os instantes das legendas têm de estar dentro da duração total do vídeo e o instante inicial de cada segmento tem de ser anterior ao instante final|
|**RN7**|A geração automática de legendas conta como 1 operação na quota diária. A operação é reservada quando o pedido é criado (passo 6) e devolvida se o pedido terminar em **Falhou** ou **Cancelado**; só os pedidos **Concluído** consomem quota. A reserva impede que pedidos em curso permitam ultrapassar o limite diário (como no UC-VID-001 e nos Filtros)|
|**RN8**|As legendas são armazenadas separadamente do ficheiro de vídeo, ficam associadas ao vídeo no respetivo projeto e contam para o espaço do projeto e da conta (UC-VID-004, RN7; a forma de contabilização fica em UC-VID-004, Q1). A sua geração não altera o vídeo original|
|**RN9**|O pedido pode assumir os estados **A aguardar**, **A processar**, **Concluído**, **Falhou** e **Cancelado**|
|**RN10**|Apenas pedidos nos estados **A aguardar** ou **A processar** podem ser cancelados|
|**RN11**|O perfil Registado pode ter no máximo 1 pedido de processamento de vídeo a aguardar ou a processar; o Premium, no máximo 3. O limite é global à conta, partilhado pelas ferramentas Recorte, Filtros e Legendas (UC-VID-001, RN7), e independente dos carregamentos simultâneos (UC-VID-004, RN10)|
|**RN12**|A ferramenta Legendas só é oferecida para vídeos disponíveis para edição, ou seja, recebidos, validados, guardados com miniatura e associados ao projeto (UC-VID-004, RN9). Um vídeo ainda em carregamento não pode ser utilizado para gerar legendas|
|**RN13**|Os pedidos de legendas, a faixa de áudio processada e as legendas geradas apenas podem ser acedidos pelo proprietário do vídeo. O acesso aos vídeos, miniaturas e projetos é regulado pelo UC-VID-004 (RN2) e fica sujeito às regras de privacidade e armazenamento do PictuRAS|
|**RN14**|Cada vídeo tem no máximo um conjunto de legendas. Uma nova geração só substitui as legendas existentes quando termina em **Concluído**; se falhar ou for cancelada, as legendas anteriores mantêm-se|
|**RN15**|Enquanto existir um pedido de legendas **A aguardar** ou **A processar**, o vídeo, ou o projeto que o contém, não pode ser eliminado; para o eliminar, o utilizador deve primeiro cancelar o pedido em curso (tal como no UC-VID-001, RN5)|
|**RN16**|Quando é aplicado um filtro (UC-VID-002) a um vídeo com legendas, o novo vídeo resultante recebe uma cópia das legendas do original, no mesmo idioma, porque o filtro não altera a duração nem os instantes do vídeo. A cópia é independente das legendas do original e conta para o espaço do projeto e da conta. Se a cópia falhar, o resultado do filtro é guardado sem legendas e o pedido de filtro não falha por isso|

### 2.7 Assunções

|**ID**|**Assunção**|
|---|---|
|**A1**|O vídeo encontra-se integralmente armazenado e acessível ao serviço de processamento no momento do pedido|
|**A2**|A faixa de áudio do vídeo pode ser extraída e processada pelo serviço de geração de legendas|
|**A3**|Todo o conteúdo falado do vídeo está em inglês, num único idioma durante toda a sua duração|
|**A4**|A identificação do idioma serve apenas para confirmar que a fala está em inglês; não é usada para gerar legendas noutros idiomas|
|**A5**|O serviço de reconhecimento de fala consegue devolver informação temporal suficiente para sincronizar os segmentos de texto com o vídeo|
|**A6**|A geração automática de legendas pode conter erros quando existe ruído, fala pouco clara ou sobreposição de vozes|
|**A7**|A notificação de conclusão é apresentada apenas dentro da aplicação|
|**A8**|Durante a utilização deste caso de uso, não é considerada a expiração automática da sessão por timeout; a sessão pode terminar por ação explícita do utilizador|
|**A9**|Os vídeos estão organizados em projetos de vídeo (UC-VID-004, A6). As legendas ficam associadas ao vídeo, no projeto a que este pertence|
|**A10**|A quota diária de 5 operações do perfil Registado é partilhada entre as operações sobre imagens e as operações sobre vídeos|
|**A11**|Todos os vídeos de um projeto de vídeo estão em MP4 ou MOV e dentro dos limites do perfil, verificados no carregamento (UC-VID-004, RN3 e RN4). A geração de legendas não repete estas verificações|
|**A12**|O armazenamento do projeto e da conta e a sua contabilização seguem o UC-VID-004 (RN5 a RN7). Dado o tamanho reduzido das legendas face ao vídeo, não se reserva espaço antecipadamente: o espaço é verificado na confirmação (passo 5) e ao guardar (passo 10)|

### 2.8 Questões em Aberto

|**ID**|**Questão**|
|---|---|
|**Q3**|Deve o utilizador poder editar manualmente o texto das legendas depois da geração?|
|**Q4**|Deve ser possível alterar manualmente os instantes inicial e final de cada segmento?|
|**Q5**|Deve ser possível exportar as legendas para formatos como SRT ou WebVTT?|
|**Q6**|Deve existir uma opção para incorporar permanentemente as legendas na imagem do vídeo?|
|**Q7**|Deve uma versão futura suportar vídeos em que são utilizados vários idiomas?|
|**Q8**|Deve o sistema conseguir identificar diferentes pessoas a falar no mesmo vídeo?|
|**Q9**|Deve existir uma funcionalidade separada para traduzir automaticamente as legendas, por exemplo para legendar em inglês vídeos falados noutros idiomas?|
|**Q11**|No sistema existente, as funcionalidades com IA são uma vantagem do perfil Premium. A geração de legendas, que usa reconhecimento de fala, deve estar disponível para o perfil Registado ou apenas para o Premium?|
|**Q12**|A restrição R5 do sistema existente limita as operações com IA a 60 s de tempo de resposta médio. Como se aplica a vídeos Premium com até 10 min, cuja transcrição pode demorar mais?|
|**Q15**|Quando um vídeo com legendas é recortado (UC-VID-001), o novo vídeo deve herdar as legendas do intervalo, com os instantes ajustados, ou fica sem legendas (UC-VID-001, Q6)? No caso dos Filtros a questão está decidida na RN16|
|**Q16**|Deve ser reservado espaço para as legendas na confirmação, como no recorte (UC-VID-001, A7), ou basta verificar o espaço na confirmação e ao guardar (A12)? Relacionado com UC-VID-004, Q1|

<!--
**Questões retiradas na v1.1** (os IDs não serão reutilizados):
- Q10: acesso do perfil Anónimo; decidido no UC-VID-004 (RN2): o Anónimo não cria projetos de vídeo.
- Q14: relação entre vídeos e projetos; decidido no UC-VID-004 (A6 e RN14): os vídeos ficam em projetos de vídeo, sem encadeamento nem processamento em lote no MVP.
- Q1: idiomas suportados; decidido na RN4: só inglês.
- Q2: confiança mínima da identificação do idioma; decidido na RN4: 0,5.
- Q13: reserva da operação na confirmação; decidido na RN7: a operação é reservada ao criar o pedido e devolvida em falha ou cancelamento.
-->

---

## 3. Utilização de agentes de IA

|**Ferramenta / skill**|**Tarefa apoiada**|**Validação realizada pela equipa**|
|---|---|---|
|ChatGPT (OpenAI)|Discussão e exploração das minúcias e possibilidades associadas à funcionalidade de geração automática de legendas, nomeadamente comportamentos, limitações e situações excecionais|A IA foi utilizada apenas como apoio à discussão das funcionalidades. Todas as decisões sobre o caso de uso, regras, fluxos e comportamentos foram tomadas pela equipa, que também foi responsável pela redação do documento|
|Claude (claude.ai)|Revisão do caso de uso face ao template v2, aos exemplos de referência e ao documento de requisitos 2025/26: deteção de inconsistências entre fluxos, exceções e pré-condições e de lacunas de alinhamento com o sistema existente|Cada sugestão foi analisada pela equipa antes de ser incorporada. Foram corrigidas as contradições entre FA1 e FA2 e entre as pré-condições e as exceções, removida a exceção de idioma não suportado e acrescentados o fluxo FA7, a regra RN14, as assunções A9 e A10 e as questões Q10 a Q14|
|Claude (Claude Code)|Alinhamento da v1.1 com o UC-VID-004 (carregamento) e o UC-VID-001 v2.0 (recorte): vídeos organizados em projetos, remoção das validações já feitas no carregamento, nomes dos estados, limite de pedidos em simultâneo global à conta, verificação e contabilização do espaço, bloqueio da eliminação com pedido ativo e relação com o recorte (RN15, A11, A12, Q15, Q16 e REQ-VID-LEG-041 a 043)|(a equipa descreve aqui o que reviu, aceitou, alterou ou rejeitou)|

## 4. Esboço de requisitos derivados

### 4.1 Requisitos de Sistema

| **ID** | **Requisito** | **Tipo** | **Prioridade** | **Novo/Alt** | **Origem** | **Como verificar** |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-VID-LEG-002 | O sistema deve disponibilizar a ferramenta Legendas para o vídeo selecionado num projeto de vídeo. | F | Deve ter | NOVO | Trigger / Passo 2 / A9; UC-VID-004: REQ-VID-UPLOAD-033 | Dado um vídeo selecionado num projeto de vídeo, quando o utilizador consulta as ferramentas, então pode escolher Legendas para esse vídeo. |
| REQ-VID-LEG-006 | O sistema deve rejeitar vídeos sem faixa de áudio, apresentando a mensagem "Não foi encontrada uma faixa de áudio neste vídeo". | F | Deve ter | NOVO | Passo 2 / Exceção 1 / RN3 | Dado um vídeo sem áudio, quando se escolhe gerar legendas, então aparece a mensagem indicada e a operação é impedida. |
| REQ-VID-LEG-010 | O sistema deve impedir novos pedidos quando a quota diária aplicável estiver esgotada, apresentando a mensagem "Atingiu o limite diário de operações" e indicando quando será reposta. | F | Deve ter | ALT | Passos 2 e 5 / Exceção 2 | Dado um Registado sem quota disponível, quando abre ou confirma a geração, então nenhum pedido é criado e a mensagem indica a reposição. |
| REQ-VID-LEG-011 | O sistema deve solicitar confirmação quando o vídeo já tiver legendas, avisando que estas só serão substituídas se a nova geração terminar em Concluído. | F | Deve ter | NOVO | FA7 / RN14 | Dado um vídeo com legendas, quando se solicita uma nova geração, então aparece o aviso; se o utilizador desistir, nenhum pedido é criado. |
| REQ-VID-LEG-012 | O sistema deve apresentar o ecrã de geração indicando que o único idioma suportado é o inglês. | F | Deve ter | NOVO | Passo 3 / RN4 | Dado um vídeo elegível, quando o ecrã abre, então indica o inglês como idioma e não oferece outros idiomas nem deteção automática. |
| REQ-VID-LEG-013 | O sistema deve registar o inglês como idioma de todos os pedidos de legendas. | F | Deve ter | NOVO | Passo 4 / RN4 | Dado um pedido criado, quando se consulta, então o idioma do pedido é o inglês; um pedido com outro idioma é recusado. |
| REQ-VID-LEG-014 | O sistema deve aceitar a confirmação da geração apenas quando a quota diária, o espaço de armazenamento disponível e o número de pedidos de processamento de vídeo em simultâneo forem novamente validados. | F | Deve ter | ALT | Passo 5 / FA5 / Exceções 2 e 6 | Dado uma condição que deixou de ser satisfeita após abrir o ecrã, quando o utilizador confirma, então o pedido não é criado. |
| REQ-VID-LEG-015 | O sistema deve limitar os pedidos de processamento de vídeo A aguardar ou A processar a 1 por utilizador Registado e a 3 por utilizador Premium, contando os pedidos de todas as ferramentas de vídeo da conta. | NF — Capacidade / limites | Deve ter | ALT | RN11 / FA5 | Dado um Registado com 1 pedido ativo de qualquer ferramenta de vídeo (por exemplo, um recorte) ou um Premium com 3, quando confirma uma geração de legendas, então o novo pedido é rejeitado. |
| REQ-VID-LEG-016 | O sistema deve informar o utilizador quando o limite de pedidos em simultâneo for atingido e oferecer a navegação para a lista de pedidos. | F | Deve ter | NOVO | FA5 | Dado o limite atingido, quando o utilizador confirma outro pedido, então recebe uma mensagem com a causa da rejeição e pode abrir a lista de pedidos. |
| REQ-VID-LEG-017 | O sistema deve permitir ao utilizador consultar os seus pedidos de legendas e o estado atual de cada um. | F | Deve ter | NOVO | Passo 9 / FA4 / FA5 / RN9 | Dado um utilizador com pedidos, quando os consulta ou regressa ao ecrã, então vê os estados atuais. |
| REQ-VID-LEG-018 | O sistema deve criar os pedidos aceites no estado A aguardar. | F | Deve ter | NOVO | Passo 6 / RN9 | Dado uma confirmação válida e aceite pelo serviço, quando o pedido é criado, então o seu estado inicial é A aguardar. |
| REQ-VID-LEG-019 | O sistema deve recusar a criação do pedido quando o serviço estiver indisponível ou a fila estiver cheia, informando que o serviço está temporariamente indisponível. | F | Deve ter | NOVO | Exceção 5 | Dado uma das condições indicadas, quando o utilizador confirma, então nenhum pedido é criado e aparece a informação de indisponibilidade. |
| REQ-VID-LEG-020 | O sistema deve passar o pedido para A processar quando iniciar o processamento. | F | Deve ter | NOVO | Passo 7 / RN9 | Dado um pedido A aguardar, quando o processamento começa, então o estado passa para A processar. |
| REQ-VID-LEG-021 | O sistema deve apresentar informação de progresso atualizada durante o processamento. | F | Deve ter | NOVO | Passos 7 e 9 | Dado um pedido em processamento, quando o utilizador o acompanha, então vê informação de progresso que acompanha o avanço do processamento. |
| REQ-VID-LEG-022 | O sistema deve manter o processamento em segundo plano quando o utilizador muda de ecrã ou de projeto ou fecha o separador, enquanto a sessão se mantiver ativa. | F | Deve ter | NOVO | Passo 9 / FA4 / A8 | Dado um pedido ativo, quando o utilizador abandona o ecrã sem terminar a sessão, então o processamento continua. |
| REQ-VID-LEG-023 | O sistema deve gerar segmentos de legenda a partir da fala, contendo cada segmento um instante inicial, um instante final e o texto reconhecido. | F | Deve ter | NOVO | Passo 8 / RN5 / A5 | Dado um vídeo com fala reconhecível, quando a geração conclui, então cada segmento contém os três elementos. |
| REQ-VID-LEG-024 | O sistema deve garantir que cada segmento satisfaz 0 ≤ instante inicial < instante final ≤ duração do vídeo. | NF — Integridade temporal | Deve ter | NOVO | RN6 | Dado legendas geradas, quando se verificam os tempos, então todos os segmentos satisfazem a condição. |
| REQ-VID-LEG-025 | O sistema deve identificar o idioma da fala antes de gerar as legendas e só prosseguir quando a fala for inglesa ou o idioma não for identificado com confiança ≥ 0,5. | F | Deve ter | NOVO | Passo 8 / FA1 / RN4 / A4 | Dado um vídeo em inglês, quando é processado, então as legendas são geradas em inglês; dado um vídeo com idioma não identificável, então a geração prossegue em inglês. |
| REQ-VID-LEG-026 | O sistema deve passar o pedido para Falhou quando a fala estiver noutro idioma identificado com confiança ≥ 0,5, apresentando a mensagem "Este vídeo não parece estar em inglês", sem traduzir o conteúdo. | F | Deve ter | NOVO | Exceção 8 / RN4 | Dado um vídeo falado em português, quando é processado, então o pedido fica Falhou com a mensagem indicada, não são criadas legendas e a operação é devolvida. |
| REQ-VID-LEG-027 | O sistema deve passar o pedido para Falhou quando não detetar fala reconhecível, apresentando a mensagem "Não foi possível identificar fala neste vídeo". | F | Deve ter | NOVO | Exceção 3 | Dado um vídeo sem fala reconhecível, quando é processado, então o pedido fica Falhou com a mensagem indicada. |
| REQ-VID-LEG-028 | O sistema deve passar o pedido para Falhou quando o reconhecimento de fala falhar, apresentando uma mensagem de erro. | F | Deve ter | NOVO | Exceção 4 | Dado uma falha do reconhecimento, quando ocorre, então o pedido fica Falhou e o utilizador recebe uma mensagem de erro. |
| REQ-VID-LEG-029 | O sistema deve passar o pedido para Falhou quando não existir espaço no projeto ou na conta para guardar as legendas no fim do processamento, apresentando a mensagem "Espaço de armazenamento insuficiente". | F | Deve ter | NOVO | Exceção 7 / A12 | Dado espaço insuficiente no momento de guardar, quando o armazenamento é tentado, então o pedido fica Falhou com a mensagem indicada. |
| REQ-VID-LEG-030 | O sistema deve guardar as legendas separadamente do ficheiro de vídeo, associadas ao vídeo que originou o pedido, no respetivo projeto. | F | Deve ter | NOVO | Passo 10 / RN8 / A9 / Pós-condição de sucesso | Dado um pedido concluído, quando se consultam os recursos, então as legendas estão separadas do ficheiro de vídeo e associadas ao vídeo correto, no seu projeto. |
| REQ-VID-LEG-031 | O sistema deve manter no máximo um conjunto de legendas associado ao vídeo, substituindo o anterior apenas quando a nova geração terminar em Concluído. | NF — Fiabilidade / integridade | Deve ter | NOVO | RN14 / FA7 / Pós-condições | Dado um vídeo com legendas, quando a nova geração conclui, então fica apenas o novo conjunto; se falhar ou for cancelada, permanece o anterior. |
| REQ-VID-LEG-032 | O sistema deve permitir cancelar apenas pedidos A aguardar ou A processar, passando-os para Cancelado e interrompendo o respetivo processamento. | F | Deve ter | NOVO | FA3 / RN9 / RN10 | Dado pedidos nos cinco estados, quando se tenta cancelar, então apenas os ativos aceitam a ação, passam para Cancelado e deixam de ser processados. |
| REQ-VID-LEG-033 | O sistema deve cancelar os pedidos de legendas ativos quando o utilizador termina explicitamente a sessão. | F | Deve ter | ALT | FA6 / A8 | Dado pedidos A aguardar ou A processar, quando o utilizador faz logout, então esses pedidos são cancelados. |
| REQ-VID-LEG-034 | O sistema deve eliminar os resultados parciais de pedidos que terminem em Falhou ou Cancelado. | F | Deve ter | NOVO | FA3 / FA6 / Exceções 3, 4, 7 e 8 / Pós-condição mínima | Dado um pedido com resultados parciais, quando falha ou é cancelado, então esses resultados são eliminados. |
| REQ-VID-LEG-035 | O sistema deve reservar 1 operação na quota diária aplicável ao criar o pedido e devolvê-la quando o pedido terminar em Falhou ou Cancelado. | F | Deve ter | ALT | Passos 6 e 11 / RN7 / A10 / Pós-condições | Dado um Registado com 4 operações gastas, quando confirma uma geração, então a quota passa a 5 e uma nova operação sobre imagem é recusada; se o pedido falhar ou for cancelado, a quota volta a 4; pedidos rejeitados antes de criados não alteram a quota. |
| REQ-VID-LEG-036 | O sistema deve passar o pedido para Concluído após guardar e associar as legendas ao vídeo. | F | Deve ter | NOVO | Passos 10 e 11 / RN9 / Pós-condição de sucesso | Dado legendas guardadas e associadas, quando a operação termina com sucesso, então o pedido passa para Concluído. |
| REQ-VID-LEG-037 | O sistema deve notificar o utilizador dentro da aplicação quando o pedido terminar em Concluído. | F | Deveria ter | NOVO | Passo 11 / A7 | Dado um pedido concluído, quando o utilizador consulta a aplicação, então a notificação está disponível. |
| REQ-VID-LEG-038 | O sistema deve apresentar cada segmento de legenda durante o respetivo intervalo temporal na reprodução do vídeo. | F | Deve ter | NOVO | Passo 12 | Dado um vídeo com legendas, quando é reproduzido, então cada segmento aparece entre os seus instantes inicial e final. |
| REQ-VID-LEG-039 | O sistema deve manter o ficheiro de vídeo original inalterado durante e após a geração de legendas. | NF — Fiabilidade / integridade | Deve ter | NOVO | RN8 / Pós-condições | Dado um vídeo original, quando um pedido conclui, falha ou é cancelado, então o resumo criptográfico do ficheiro mantém-se igual ao inicial. |
| REQ-VID-LEG-040 | O sistema deve restringir o acesso aos pedidos de legendas, ao áudio processado e às legendas ao proprietário do vídeo. | NF — Segurança / acesso | Deve ter | ALT | RN13 | Dado recursos de um utilizador, quando outro utilizador tenta aceder-lhes, então o acesso é recusado. |
| REQ-VID-LEG-041 | O sistema deve recusar o pedido quando o espaço livre no projeto ou na conta não chegar para guardar as legendas, apresentando a mensagem "Espaço de armazenamento insuficiente" e indicando o limite atingido. | F | Deve ter | NOVO | Passo 5 / Exceção 6 / A12 | Dado um projeto ou uma conta sem espaço livre, quando o utilizador confirma a geração, então o pedido não é criado e a mensagem indica o limite atingido (projeto ou conta). |
| REQ-VID-LEG-042 | O sistema deve impedir a eliminação do vídeo, ou do projeto que o contém, enquanto existir um pedido de legendas associado nos estados A aguardar ou A processar. | F | Deve ter | NOVO | RN15 | Dado um vídeo com um pedido A aguardar ou A processar, quando o utilizador tenta eliminar o vídeo ou o projeto, então o sistema impede a eliminação. |
| REQ-VID-LEG-043 | O sistema deve contabilizar as legendas guardadas no espaço ocupado do projeto e da conta. | F | Deve ter | ALT | Passo 10 / RN8 / A12; UC-VID-004: RN7 | Dado um pedido concluído, quando se consulta o espaço ocupado do projeto e da conta, então ambos incluem o espaço das legendas. |
| REQ-VID-LEG-044 | O sistema deve copiar as legendas de um vídeo para o novo vídeo criado quando lhe é aplicado um filtro, mantendo o idioma e os instantes. | F | Deveria ter | NOVO | RN16; UC-VID-002 | Dado um vídeo com legendas, quando um filtro termina em Concluído, então o novo vídeo tem legendas com o mesmo texto, idioma e instantes; o original mantém as suas; se o original não tinha legendas, o resultado também não tem. |

<!--
**IDs retirados na v1.1** (nunca serão reutilizados):
- REQ-VID-LEG-001: listagem de vídeos na biblioteca, que deixa de existir; a listagem e a seleção dos vídeos do projeto são do UC-VID-004 (REQ-VID-UPLOAD-030 e REQ-VID-UPLOAD-031).
- REQ-VID-LEG-003: acesso reservado a Registado e Premium, coberto pelo UC-VID-004 (REQ-VID-UPLOAD-009).
- REQ-VID-LEG-004: disponibilidade do vídeo para edição, coberta pelo UC-VID-004 (REQ-VID-UPLOAD-029).
- REQ-VID-LEG-005, REQ-VID-LEG-007, REQ-VID-LEG-008 e REQ-VID-LEG-009: formato e limites de duração e tamanho por perfil, verificados no carregamento (UC-VID-004, REQ-VID-UPLOAD-011 a REQ-VID-UPLOAD-013).
-->

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisitos relacionados** |
| --- | --- | --- | --- |
| Perfis e permissões | Estender | O acesso a vídeo e os limites de duração e tamanho por perfil são definidos no UC-VID-004. A geração de legendas aplica o limite de pedidos de processamento de vídeo em simultâneo por perfil, global à conta e partilhado pelas ferramentas de vídeo. | REQ-VID-LEG-014, 015 |
| Quota diária de operações | Estender | Integrar a geração de legendas na quota partilhada entre imagens e vídeos, verificando-a na abertura e confirmação, reservando a operação ao criar o pedido e devolvendo-a em falha ou cancelamento. | REQ-VID-LEG-010, 014, 035 |
| Gestão da sessão | Estender | Associar o logout explícito ao cancelamento dos pedidos ativos, mantendo o processamento quando o utilizador apenas abandona o ecrã. | REQ-VID-LEG-022, 033 |
| Armazenamento e gestão de recursos | Estender | Armazenar legendas separadas do vídeo, contabilizadas no espaço do projeto e da conta (UC-VID-004, RN7), verificar o espaço na confirmação e ao guardar e preservar o original e as legendas anteriores perante falhas ou cancelamentos. | REQ-VID-LEG-029, 030, 031, 034, 039, 041, 043 |
| Controlo de acesso e privacidade | Estender | Aplicar o acesso exclusivo do proprietário aos pedidos, ao áudio processado e às legendas; o acesso aos vídeos e aos projetos segue o UC-VID-004. | REQ-VID-LEG-040 |
| Editor do projeto de vídeo | Estender | A ferramenta Legendas passa a fazer parte do catálogo de ferramentas do editor de projetos de vídeo (UC-VID-004, REQ-VID-UPLOAD-033), apenas para inglês, acompanhamento dos pedidos e reprodução com legendas. | REQ-VID-LEG-002, 011, 012, 013, 017, 021, 038 |
| Notificações internas | Estender | Apresentar notificações de conclusão dos pedidos de legendas dentro da aplicação. | REQ-VID-LEG-037 |
| Projetos de vídeo e gestão de vídeos | Estender | As legendas ficam associadas a um vídeo de um projeto de vídeo (A9; UC-VID-004, A6). Nem o vídeo nem o projeto podem ser eliminados enquanto existir um pedido de legendas ativo. O encadeamento de ferramentas e o processamento em lote ficam fora do MVP (UC-VID-004, RN14). O resultado de um filtro recebe uma cópia das legendas do original (RN16). | REQ-VID-LEG-030, 042, 044 |
| Restrição de desempenho das operações com IA | Manter | Não é introduzido um novo limite de processamento. A aplicação de R5 aos vídeos permanece em aberto em Q12. | Sem requisito derivado de Q12 |

### 4.3 Matriz de Rastreabilidade


| **Elemento do Caso de Uso** | **Descrição abreviada** | **Requisito(s) de Sistema** |
| --- | --- | --- |
| Pré-condições | Sessão iniciada e vídeo disponível para edição | Coberto por UC-VID-004 (REQ-VID-UPLOAD-009, REQ-VID-UPLOAD-029) |
| Trigger | Selecionar vídeo no projeto e escolher Legendas | REQ-VID-LEG-002 |
| Passo 1 | Selecionar o vídeo pela miniatura | Coberto por UC-VID-004 (REQ-VID-UPLOAD-030, REQ-VID-UPLOAD-031) |
| Passo 2 | Escolher Legendas; validar áudio e quota | REQ-VID-LEG-002, 006, 010, 011 |
| Passo 3 | Ecrã de geração (só inglês) | REQ-VID-LEG-012 |
| Passo 4 | Registo do inglês como idioma | REQ-VID-LEG-013 |
| Passo 5 | Confirmação e revalidação | REQ-VID-LEG-014, 041 |
| Passo 6 | Reservar a operação e criar pedido A aguardar | REQ-VID-LEG-018, 035 |
| Passo 7 | Iniciar processamento e apresentar progresso | REQ-VID-LEG-020, 021 |
| Passo 8 | Reconhecer fala e gerar segmentos | REQ-VID-LEG-023 |
| Passo 9 | Acompanhamento e processamento em segundo plano | REQ-VID-LEG-017, 021, 022 |
| Passo 10 | Guardar, associar e contabilizar legendas | REQ-VID-LEG-030, 043 |
| Passo 11 | Conclusão, contabilização e notificação | REQ-VID-LEG-035, 036, 037 |
| Passo 12 | Reprodução com legendas | REQ-VID-LEG-038 |
| FA1 | Idioma da fala sem confiança suficiente | REQ-VID-LEG-025 |
| FA3 | Cancelar processamento | REQ-VID-LEG-032, 034, 035 |
| FA4 | Abandonar o ecrã ou fechar o separador | REQ-VID-LEG-017, 022 |
| FA5 | Limite de pedidos em simultâneo | REQ-VID-LEG-014, 015, 016, 017 |
| FA6 | Terminar explicitamente a sessão | REQ-VID-LEG-033, 034, 035 |
| FA7 | Vídeo com legendas existentes | REQ-VID-LEG-011, 031 |
| Exceção 1 | Ausência de áudio | REQ-VID-LEG-006 |
| Exceção 2 | Quota esgotada | REQ-VID-LEG-010, 014 |
| Exceção 3 | Ausência de fala reconhecível | REQ-VID-LEG-027, 034, 035 |
| Exceção 4 | Falha do reconhecimento | REQ-VID-LEG-028, 034, 035 |
| Exceção 5 | Serviço indisponível ou fila cheia | REQ-VID-LEG-019, 035 |
| Exceção 6 | Espaço insuficiente na confirmação | REQ-VID-LEG-014, 041 |
| Exceção 7 | Espaço insuficiente ao guardar | REQ-VID-LEG-029, 034, 035 |
| Exceção 8 | Fala noutro idioma | REQ-VID-LEG-026, 034, 035 |
| Pós-condição de sucesso | Legendas associadas e contabilizadas, original intacto e operação contabilizada | REQ-VID-LEG-023, 030, 031, 035, 036, 038, 039, 043 |
| Pós-condição mínima | Sem parciais; original, legendas anteriores e quota preservados | REQ-VID-LEG-026 a 029, 031, 032, 033, 034, 035, 039 |
| RN1 | Formatos e validação do UC-VID-004 | Coberto por UC-VID-004 (REQ-VID-UPLOAD-011) |
| RN2 | Acesso e limites por perfil do UC-VID-004 | Coberto por UC-VID-004 (REQ-VID-UPLOAD-009, 012, 013) |
| RN3 | Faixa de áudio obrigatória | REQ-VID-LEG-006 |
| RN4 | Só inglês, com verificação do idioma e sem tradução | REQ-VID-LEG-012, 013, 025, 026 |
| RN5 | Estrutura dos segmentos | REQ-VID-LEG-023 |
| RN6 | Intervalos temporais válidos | REQ-VID-LEG-024 |
| RN7 | Operação reservada ao criar o pedido e devolvida em falha ou cancelamento | REQ-VID-LEG-035 |
| RN8 | Legendas separadas, associadas ao vídeo do projeto e contabilizadas; original inalterado | REQ-VID-LEG-030, 039, 043 |
| RN9 | Estados dos pedidos | REQ-VID-LEG-017, 018, 020, 026, 027, 028, 029, 032, 036 |
| RN10 | Cancelamento apenas de pedidos ativos | REQ-VID-LEG-032 |
| RN11 | Pedidos em simultâneo por perfil, globais à conta | REQ-VID-LEG-014, 015 |
| RN12 | Vídeo disponível para edição | Coberto por UC-VID-004 (REQ-VID-UPLOAD-029) |
| RN13 | Acesso exclusivo do proprietário | REQ-VID-LEG-040 |
| RN14 | Um conjunto de legendas e substituição apenas na conclusão | REQ-VID-LEG-011, 031 |
| RN15 | Vídeo e projeto não elimináveis com pedido ativo | REQ-VID-LEG-042 |
| RN16 | Resultado de um filtro recebe cópia das legendas | REQ-VID-LEG-044 |
| A1 | Vídeo armazenado e acessível | Pressuposto do ambiente; não origina um requisito autónomo. |
| A2 | Áudio extraível e processável | REQ-VID-LEG-023; pressuposto de viabilidade. |
| A3 | Fala em inglês, num único idioma | Delimitação do âmbito; não exige suporte a outros idiomas. |
| A4 | Identificação do idioma só para verificação | REQ-VID-LEG-025 |
| A5 | Informação temporal para sincronização | REQ-VID-LEG-023, 024, 038 |
| A6 | Possibilidade de erros de reconhecimento | Limitação assumida; não estabelece um alvo mensurável de precisão. |
| A7 | Notificação apenas interna | REQ-VID-LEG-037 |
| A8 | Logout explícito e ausência de timeout | REQ-VID-LEG-022, 033 |
| A9 | Vídeos organizados em projetos de vídeo | REQ-VID-LEG-002, 030 |
| A10 | Quota partilhada entre imagens e vídeos | REQ-VID-LEG-010, 035 |
| A11 | Vídeos já validados no carregamento | Coberto por UC-VID-004 (REQ-VID-UPLOAD-011 a 013) |
| A12 | Espaço verificado na confirmação e ao guardar, sem reserva | REQ-VID-LEG-029, 041, 043 |
| Q3–Q16 | Questões em aberto (Q1, Q2, Q10, Q13 e Q14 retiradas) | Não originam requisitos adicionais enquanto não forem decididas e incorporadas no caso de uso. |
