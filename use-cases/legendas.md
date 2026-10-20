# Exercícios 1 e 2 — Entrega

### Casos de Uso e Especificação de Requisitos · Fase 1: Suporte a Vídeo no PictuRAS

## 0. Identificação

| **Campo**               | **Valor**                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **Grupo / Equipa**      | Grupo 5 PL1                                                                                      |
| **Autores**             | Eduarda Ferreira PG65368; Luana Vilaverde PG65367; Daniel Rodrigues PG63934; Lucas Pinto PG63997 |
| **Data**                | 2026-10-20                                                                                       |
| **Versão do documento** | v2.1                                                                                             |
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
|**Versão**|v1.6|
|**Autor**|Eduarda Ferreira; Luana Vilaverde; Daniel Rodrigues; Lucas Pinto|
|**Data**|2026-10-20|
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
|9|O utilizador acompanha o progresso e pode continuar a utilizar outros ecrãs do PictuRAS|Atualiza periodicamente o progresso. Enquanto o pedido está ativo, não permite iniciar outra geração para o mesmo vídeo; ao regressar, o ecrã apresenta o pedido mais recente do vídeo selecionado|
|10||Guarda as legendas geradas, associa-as ao vídeo no respetivo projeto e atualiza o espaço ocupado no projeto e na conta|
|11||Passa o pedido para **Concluído**, mantém contabilizada a operação reservada no passo 6, atualiza o contador de operações diárias restantes e notifica o utilizador|
|12|O utilizador seleciona o vídeo no projeto pela sua miniatura|Apresenta o vídeo com as legendas sincronizadas, ativas por omissão e identificadas pelo nome do idioma, permitindo a sua visualização durante a reprodução|

### 2.3 Fluxos Alternativos

|**Fluxo**|**Descrição**|
|---|---|
|**FA1 – Idioma da fala sem confiança suficiente**|No passo 8, o sistema não consegue identificar o idioma da fala com confiança suficiente (por exemplo, por ruído ou pouca fala). O sistema prossegue a geração em inglês. Se não houver fala reconhecível, aplica a exceção de ausência de fala|
|**FA3 – Cancelar o processamento**|Enquanto o pedido está **A aguardar** ou **A processar**, o utilizador seleciona **Cancelar**. O sistema interrompe o processamento, elimina quaisquer legendas parciais, passa o pedido para **Cancelado** e não contabiliza a operação|
|**FA4 – Utilizador abandona o ecrã**|Depois de iniciar o pedido, o utilizador navega para outro ecrã, muda de projeto ou fecha o separador. O processamento continua em segundo plano enquanto a sessão se mantiver ativa e o estado continua disponível quando o utilizador regressar|
|**FA5 – Limite de pedidos em simultâneo**|No passo 5, o utilizador já atingiu o número máximo de pedidos de processamento de vídeo em simultâneo permitido pelo seu perfil, em qualquer ferramenta de vídeo. O sistema não cria o pedido, informa o utilizador e oferece a navegação para a lista de pedidos, onde pode acompanhar ou cancelar os pedidos em curso|
|**FA6 – Utilizador termina a sessão**|O utilizador termina a sessão enquanto o pedido está **A aguardar** ou **A processar**. O sistema cancela o pedido, interrompe o processamento, elimina quaisquer resultados parciais e não contabiliza a operação. A tentativa de cancelamento nunca impede o fim da sessão: se não obtiver resposta em 5 segundos, a sessão termina na mesma|
|**FA7 – Vídeo já tem legendas**|No passo 2, o vídeo já tem legendas associadas. O sistema avisa que, se a nova geração terminar em **Concluído**, as legendas atuais serão substituídas. O utilizador confirma e o fluxo prossegue no passo 3, ou desiste e nenhum pedido é criado|
|**FA8 – Pedido já em curso para o vídeo**|No passo 5, já existe um pedido **A aguardar** ou **A processar** para o mesmo vídeo. O sistema não cria o pedido e informa que já estão a ser geradas legendas para este vídeo|
|**FA9 – Vídeo retirado do projeto**|No passo 5, o vídeo já não pertence ao projeto (por exemplo, foi eliminado noutro separador). O sistema não cria o pedido e informa que o vídeo não foi encontrado no projeto|
|**FA10 – Cancelamento tardio**|O utilizador seleciona **Cancelar** depois de as novas legendas já terem sido associadas ao vídeo (passo 10). O cancelamento já não tem efeito: o pedido termina em **Concluído** e a operação fica contabilizada|

<!--
**Fluxos retirados** (os IDs não serão reutilizados):
- v1.3 — FA2 (deteção automática inconclusiva): com o MVP só em inglês deixou de haver deteção automática do idioma; o caso de confiança insuficiente passou a ser tratado no FA1.
-->

### 2.4 Exceções

|**ID**|**Condição**|**Comportamento do Sistema**|
|---|---|---|
|**Exceção 1**|O vídeo não contém uma faixa de áudio (passo 2)|Apresenta **"Não foi encontrada uma faixa de áudio neste vídeo"** e não permite iniciar a geração de legendas|
|**Exceção 2**|A quota diária de operações está esgotada (passos 2 e 5)|Apresenta **"Atingiu o limite diário de operações"**, indica quando a quota será reposta e não cria o pedido|
|**Exceção 3**|Não é detetada fala reconhecível no áudio (passo 8)|Passa o pedido para **Falhou** com a mensagem **"Não foi possível identificar fala neste vídeo"**, não cria legendas e não contabiliza a operação|
|**Exceção 4**|O reconhecimento de fala falha durante o processamento (passo 8)|Passa o pedido para **Falhou**, elimina quaisquer legendas parciais, apresenta uma mensagem de erro e não contabiliza a operação|
|**Exceção 5**|O serviço de reconhecimento de fala está indisponível (passo 6)|Informa que o serviço está temporariamente indisponível, não cria o pedido e não contabiliza a operação|
|**Exceção 6**|O espaço livre no projeto ou na conta não chega para guardar as legendas (passo 5)|Apresenta **"Espaço de armazenamento insuficiente"** com o limite atingido (projeto ou conta), não cria o pedido e não contabiliza a operação|
|**Exceção 7**|Não existe espaço suficiente no projeto ou na conta para guardar as legendas no fim do processamento (passo 10)|Passa o pedido para **Falhou**, elimina qualquer resultado parcial, apresenta **"Espaço de armazenamento insuficiente"** e não contabiliza a operação|
|**Exceção 8**|A fala do vídeo está num idioma que não é o inglês (passo 8)|Passa o pedido para **Falhou** com a mensagem **"Este vídeo não parece estar em inglês"**, não cria legendas e não contabiliza a operação. O sistema não traduz o conteúdo falado|
|**Exceção 9**|Não se sabe se o vídeo tem faixa de áudio (vídeo carregado antes desta funcionalidade) e, durante o processamento, verifica-se que não tem (passo 8)|Passa o pedido para **Falhou** com a mensagem **"Não foi encontrada uma faixa de áudio neste vídeo"**, não cria legendas e não contabiliza a operação|

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
|**RN5**|Cada segmento de legenda contém um instante inicial, um instante final e o respetivo texto. As legendas são guardadas em formato WebVTT; o texto de cada segmento ocupa uma só linha e os caracteres especiais são escapados|
|**RN6**|Os instantes das legendas têm de estar dentro da duração total do vídeo e o instante inicial de cada segmento tem de ser anterior ao instante final. Os segmentos que ultrapassam a duração são ajustados ao fim do vídeo; os segmentos sem texto ou com intervalo inválido são descartados|
|**RN7**|A geração automática de legendas conta como 1 operação na quota diária. A operação é reservada quando o pedido é criado (passo 6) e devolvida se o pedido terminar em **Falhou** ou **Cancelado**; só os pedidos **Concluído** consomem quota. A reserva impede que pedidos em curso permitam ultrapassar o limite diário (como no UC-VID-001 e nos Filtros)|
|**RN8**|As legendas são armazenadas separadamente do ficheiro de vídeo, ficam associadas ao vídeo no respetivo projeto e contam para o espaço do projeto e da conta (UC-VID-004, RN7; a forma de contabilização fica em UC-VID-004, Q1). A sua geração não altera o vídeo original|
|**RN9**|O pedido pode assumir os estados **A aguardar**, **A processar**, **Concluído**, **Falhou** e **Cancelado**|
|**RN10**|Apenas pedidos nos estados **A aguardar** ou **A processar** podem ser cancelados. Um cancelamento que chega depois de as legendas estarem associadas ao vídeo já não tem efeito (FA10)|
|**RN11**|O perfil Registado pode ter no máximo 1 pedido de processamento de vídeo a aguardar ou a processar; o Premium, no máximo 3. O limite é global à conta, partilhado pelas ferramentas Recorte, Filtros e Legendas (UC-VID-001, RN7), e independente dos carregamentos simultâneos (UC-VID-004, RN10)|
|**RN12**|A ferramenta Legendas só é oferecida para vídeos disponíveis para edição, ou seja, recebidos, validados, guardados com miniatura e associados ao projeto (UC-VID-004, RN9). Um vídeo ainda em carregamento não pode ser utilizado para gerar legendas|
|**RN13**|Os pedidos de legendas, a faixa de áudio processada e as legendas geradas apenas podem ser acedidos pelo proprietário do vídeo. O acesso aos vídeos, miniaturas e projetos é regulado pelo UC-VID-004 (RN2) e fica sujeito às regras de privacidade e armazenamento do PictuRAS|
|**RN14**|Cada vídeo tem no máximo um conjunto de legendas. Uma nova geração só substitui as legendas existentes quando termina em **Concluído**; se falhar ou for cancelada, as legendas anteriores mantêm-se|
|**RN15**|Enquanto existir um pedido de legendas **A aguardar** ou **A processar**, o vídeo, ou o projeto que o contém, não pode ser eliminado; para o eliminar, o utilizador deve primeiro cancelar o pedido em curso (tal como no UC-VID-001, RN5). Quando um vídeo ou um projeto é eliminado, as respetivas legendas também são eliminadas e o espaço que ocupavam é libertado|
|**RN16**|Quando é aplicado um filtro (UC-VID-002) a um vídeo com legendas, o novo vídeo resultante recebe uma cópia das legendas do original, no mesmo idioma, porque o filtro não altera a duração nem os instantes do vídeo. A cópia é independente das legendas do original e conta para o espaço do projeto e da conta. Se a cópia falhar ou não houver espaço livre suficiente para ela, o resultado do filtro é guardado sem legendas e o pedido de filtro não falha por isso|
|**RN17**|Os pedidos **A aguardar** ou **A processar** interrompidos por um reinício do sistema passam a **Falhou** e a operação reservada é devolvida. Se as legendas já estavam associadas ao vídeo, o pedido passa a **Concluído**|
|**RN18**|Se a devolução de uma operação falhar (por exemplo, por indisponibilidade temporária do serviço de utilizadores), o sistema repete-a periodicamente, a cada minuto, durante o próprio dia|

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
|**A12**|O armazenamento do projeto e da conta e a sua contabilização seguem o UC-VID-004 (RN5 a RN7). Dado o tamanho reduzido das legendas face ao vídeo, não se reserva espaço antecipadamente: o espaço é verificado na confirmação (passo 5), com uma estimativa de 100 bytes por segundo de vídeo e um mínimo de 1 KB, e ao guardar (passo 10), com o tamanho real|
|**A13**|A interface é apresentada em inglês; as mensagens indicadas neste documento são o seu equivalente em português|
|**A14**|O reconhecimento de fala usa o modelo Whisper (variante *small*, multilingue), executado localmente em CPU, com deteção de atividade de voz para ignorar silêncio e ruído. A identificação do idioma (RN4) é a do próprio modelo|

### 2.8 Questões em Aberto

|**ID**|**Questão**|**Resolução**|
|---|---|---|
|**Q3**|Deve o utilizador poder editar manualmente o texto das legendas depois da geração?|Adiada para uma fase posterior. No MVP as legendas são apenas geradas automaticamente; o utilizador só pode voltar a gerá-las (FA7, RN14)|
|**Q4**|Deve ser possível alterar manualmente os instantes inicial e final de cada segmento?|Adiada para uma fase posterior, pelo mesmo motivo da Q3: no MVP os instantes resultam apenas do reconhecimento de fala (RN5, RN6)|
|**Q5**|Deve ser possível exportar as legendas para formatos como SRT ou WebVTT?|Decidida para o MVP: não há exportação. O WebVTT é usado apenas pelo leitor do editor (RN5, DQ-005); a exportação fica para uma fase posterior|
|**Q6**|Deve existir uma opção para incorporar permanentemente as legendas na imagem do vídeo?|Adiada para uma fase posterior. Incorporar as legendas obrigaria a reprocessar o vídeo e a criar um novo ficheiro de vídeo; no MVP as legendas ficam separadas do vídeo (RN8)|
|**Q7**|Deve uma versão futura suportar vídeos em que são utilizados vários idiomas?|Adiada para uma fase posterior. No MVP o vídeo é falado num único idioma, o inglês (RN4, A3)|
|**Q8**|Deve o sistema conseguir identificar diferentes pessoas a falar no mesmo vídeo?|Adiada para uma fase posterior. A identificação de oradores não faz parte do MVP e o modelo usado (A14) não a disponibiliza|
|**Q9**|Deve existir uma funcionalidade separada para traduzir automaticamente as legendas, por exemplo para legendar em inglês vídeos falados noutros idiomas?|Adiada para uma fase posterior, como funcionalidade separada. No MVP o sistema nunca traduz o conteúdo falado (RN4, Exceção 8)|
|**Q11**|No sistema existente, as funcionalidades com IA são uma vantagem do perfil Premium. A geração de legendas, que usa reconhecimento de fala, deve estar disponível para o perfil Registado ou apenas para o Premium?|Decidida: a ferramenta está disponível para os perfis Registado e Premium (Secção 1, Ator Principal, RN2). O Registado fica limitado pela quota diária (RN7) e pelos limites de carregamento do UC-VID-004 (RN4)|
|**Q12**|A restrição R5 do sistema existente limita as operações com IA a 60 s de tempo de resposta médio. Como se aplica a vídeos Premium com até 10 min, cuja transcrição pode demorar mais? O alvo MVP de processamento está fixado na DQ-002 (REQ-VID-LEG-062); falta decidir o alvo face à R5 em produção|Parcialmente decidida: no MVP aplica-se o alvo da DQ-002 (REQ-VID-LEG-062). A compatibilização com a R5 e o RNF43 da baseline em produção fica para a Fase 2, dedicada aos aspetos não funcionais|
|**Q15**|Quando um vídeo com legendas é recortado (UC-VID-001), o novo vídeo deve herdar as legendas do intervalo, com os instantes ajustados, ou fica sem legendas (UC-VID-001, Q6)? No caso dos Filtros a questão está decidida na RN16|Decidida para o MVP: o resultado de um recorte não herda as legendas do original (é o comportamento implementado); o utilizador pode gerar legendas para o vídeo recortado. A herança com os instantes ajustados fica para uma fase posterior, em articulação com o UC-VID-001 (Q6)|
|**Q16**|Deve ser reservado espaço para as legendas na confirmação, como no recorte (UC-VID-001, A7), ou basta verificar o espaço na confirmação e ao guardar (A12)? Relacionado com UC-VID-004, Q1|Decidida na A12: não se reserva espaço; o espaço é verificado na confirmação, com uma estimativa, e ao guardar, com o tamanho real (REQ-VID-LEG-029 e 041)|

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
|Claude (Claude Code)|Alinhamento do caso de uso com o UC-VID-004 (carregamento) e o UC-VID-001 (recorte) na v1.1; decisões das versões v1.2 a v1.4 (cópia das legendas nos Filtros, só inglês com verificação do idioma, registo dos comportamentos já implementados); conversão da secção 4 para o formato da ERS do Exercício 2 na v2.0: separação em requisitos funcionais e não funcionais, classificação ISO/IEC 25010, alvos MVP e produção, verificação da completude, decisões de qualidade DQ-001 a DQ-006 e substituição dos requisitos cuja intenção mudou (REQ-VID-LEG-012, 013, 025 e 026 por 057 a 060); revisão da v2.0 face às diretrizes da Fase 1 na v2.1: numeração das exceções, resolução das questões em aberto, divisão dos requisitos não atómicos e identificação dos elementos do documento de requisitos de base afetados|Cada proposta foi revista pela equipa antes de ser integrada. As decisões de âmbito (só inglês, limiar de confiança de 0,5, reserva da operação ao criar o pedido, cópia das legendas nos Filtros, ausência de reserva de espaço) foram tomadas pela equipa; o agente redigiu o texto a partir dessas decisões. Os comportamentos registados na v1.4 foram confirmados na aplicação antes de entrarem no documento, e as resoluções das questões em aberto da v2.1 foram comparadas com o código existente (por exemplo, a Q15 reflete que o Recorte não copia as legendas). Evidência: commits da branch `video-subtitle`|

## 4. Especificação de Requisitos do Sistema (ERS)

**Caso de Uso:** UC-VID-003 — Gerar legendas automáticas para um vídeo de um projeto  
**Versão do dossiê:** v2.1  
**Baseline do Exercício 1:** dossiê v1.0 (UC-VID-003 v1.0); requisitos derivados REQ-VID-LEG-001 a REQ-VID-LEG-040

### 4.1 Requisitos da ERS

#### 4.1.1 Requisitos Funcionais

| **ID** | **Requisito** | **Prioridade** | **Evolução** | **Novo/Alt** | **Origem (UC / RN / decisão)** | **Justificação** | **Critério de aceitação / verificação** |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| REQ-VID-LEG-002 | O sistema deve disponibilizar a ferramenta Legendas para o vídeo selecionado num projeto de vídeo. | Deve ter | Refinado | NOVO | UC-VID-003: Trigger, Passo 2, A9; UC-VID-004: REQ-VID-UPLOAD-033 | A ferramenta deixa de partir de uma biblioteca e passa a fazer parte do editor de projetos de vídeo. | Dado um vídeo selecionado num projeto de vídeo, quando o utilizador consulta as ferramentas, então pode escolher Legendas para esse vídeo. |
| REQ-VID-LEG-006 | O sistema deve rejeitar vídeos sem faixa de áudio, apresentando a mensagem "Não foi encontrada uma faixa de áudio neste vídeo". | Deve ter | Mantido | NOVO | UC-VID-003: Passo 2, Exceção 1, RN3 | Sem áudio não há fala a transcrever; recusar cedo evita gastar uma operação. | Dado um vídeo sem áudio, quando se escolhe gerar legendas, então aparece a mensagem indicada e a operação é impedida. |
| REQ-VID-LEG-010 | O sistema deve impedir novos pedidos quando a quota diária aplicável estiver esgotada, apresentando a mensagem "Atingiu o limite diário de operações" e indicando quando será reposta. | Deve ter | Mantido | ALT | UC-VID-003: Passos 2 e 5, Exceção 2, RN7 | A geração de legendas passa a consumir a quota diária existente (A10). | Dado um Registado sem quota disponível, quando abre ou confirma a geração, então nenhum pedido é criado e a mensagem indica a reposição. |
| REQ-VID-LEG-011 | O sistema deve solicitar confirmação quando o vídeo já tiver legendas, avisando que estas só serão substituídas se a nova geração terminar em Concluído. | Deve ter | Mantido | NOVO | UC-VID-003: FA7, RN14 | Evita substituir legendas existentes sem o utilizador saber. | Dado um vídeo com legendas, quando se solicita uma nova geração, então aparece o aviso; se o utilizador desistir, nenhum pedido é criado. |
| REQ-VID-LEG-015 | O sistema deve limitar os pedidos de processamento de vídeo A aguardar ou A processar a 1 por utilizador Registado e a 3 por utilizador Premium, contando os pedidos de todas as ferramentas de vídeo da conta. | Deve ter | Refinado | ALT | UC-VID-003: RN11, FA5; UC-VID-001: RN7 | Regra de negócio partilhada com Recorte e Filtros; protege a capacidade de processamento. | Dado um Registado com 1 pedido ativo de qualquer ferramenta de vídeo (por exemplo, um recorte) ou um Premium com 3, quando confirma uma geração de legendas, então o novo pedido é rejeitado. |
| REQ-VID-LEG-016 | O sistema deve informar o utilizador quando o limite de pedidos em simultâneo for atingido e oferecer a navegação para a lista de pedidos. | Deve ter | Refinado | NOVO | UC-VID-003: FA5 | O utilizador precisa de saber porque é que o pedido foi recusado e onde ver os pedidos em curso. | Dado o limite atingido, quando o utilizador confirma outro pedido, então recebe uma mensagem com a causa da rejeição e pode abrir a lista de pedidos. |
| REQ-VID-LEG-017 | O sistema deve permitir ao utilizador consultar os seus pedidos de legendas e o estado atual de cada um. | Deve ter | Mantido | NOVO | UC-VID-003: Passo 9, FA4, FA5, RN9 | O processamento não é instantâneo; o utilizador tem de poder acompanhar os pedidos. | Dado um utilizador com pedidos, quando os consulta ou regressa ao ecrã, então vê os estados atuais. |
| REQ-VID-LEG-018 | O sistema deve criar os pedidos aceites no estado A aguardar. | Deve ter | Refinado | NOVO | UC-VID-003: Passo 6, RN9 | O pedido entra num estado inicial conhecido, a partir do qual o ciclo de vida é acompanhado. | Dado uma confirmação válida e aceite pelo serviço, quando o pedido é criado, então o seu estado inicial é A aguardar. |
| REQ-VID-LEG-019 | O sistema deve recusar a criação do pedido quando o serviço de reconhecimento de fala estiver indisponível, informando que o serviço está temporariamente indisponível. | Deve ter | Refinado | NOVO | UC-VID-003: Exceção 5 | Evita criar pedidos que não podem ser processados; no MVP não existe fila com capacidade limitada (4.1.3). | Dado o serviço de reconhecimento de fala parado, quando o utilizador confirma, então nenhum pedido é criado, aparece a informação de indisponibilidade e a quota não muda. |
| REQ-VID-LEG-020 | O sistema deve passar o pedido para A processar quando iniciar o processamento. | Deve ter | Refinado | NOVO | UC-VID-003: Passo 7, RN9 | Distingue os pedidos à espera dos que já estão a ser processados. | Dado um pedido A aguardar, quando o processamento começa, então o estado passa para A processar. |
| REQ-VID-LEG-023 | O sistema deve gerar segmentos de legenda a partir da fala, contendo cada segmento um instante inicial, um instante final e o texto reconhecido. | Deve ter | Mantido | NOVO | UC-VID-003: Passo 8, RN5, A5 | É o resultado que o utilizador procura. | Dado um vídeo com fala reconhecível, quando a geração conclui, então cada segmento contém os três elementos. |
| REQ-VID-LEG-024 | O sistema deve garantir que cada segmento satisfaz 0 ≤ instante inicial < instante final ≤ duração do vídeo. | Deve ter | Mantido | NOVO | UC-VID-003: RN6 | Regra de negócio sobre a validade dos segmentos; segmentos fora do vídeo não podem ser apresentados. | Dado legendas geradas, quando se verificam os tempos, então todos os segmentos satisfazem a condição. |
| REQ-VID-LEG-027 | O sistema deve passar o pedido para Falhou quando não detetar fala reconhecível, apresentando a mensagem "Não foi possível identificar fala neste vídeo". | Deve ter | Mantido | NOVO | UC-VID-003: Exceção 3, FA1 | O utilizador tem de saber porque é que não foram criadas legendas. | Dado um vídeo sem fala reconhecível, quando é processado, então o pedido fica Falhou com a mensagem indicada e a operação é devolvida. |
| REQ-VID-LEG-028 | O sistema deve passar o pedido para Falhou quando o reconhecimento de fala falhar, apresentando uma mensagem de erro. | Deve ter | Mantido | NOVO | UC-VID-003: Exceção 4 | Uma falha não pode deixar o pedido num estado indefinido. | Dado uma falha do reconhecimento, quando ocorre, então o pedido fica Falhou e o utilizador recebe uma mensagem de erro. |
| REQ-VID-LEG-029 | O sistema deve passar o pedido para Falhou quando não existir espaço no projeto ou na conta para guardar as legendas no fim do processamento, apresentando a mensagem "Espaço de armazenamento insuficiente" e o limite atingido. | Deve ter | Refinado | NOVO | UC-VID-003: Exceção 7, A12 | O espaço só é verificado com o tamanho real no fim, porque não há reserva (A12). | Dado espaço insuficiente no momento de guardar, quando o armazenamento é tentado, então o pedido fica Falhou com a mensagem indicada. |
| REQ-VID-LEG-030 | O sistema deve guardar as legendas separadamente do ficheiro de vídeo, associadas ao vídeo que originou o pedido, no respetivo projeto. | Deve ter | Refinado | NOVO | UC-VID-003: Passo 10, RN8, A9, Pós-condição de sucesso | Mantém o vídeo original intacto e permite substituir as legendas sem tocar no vídeo. | Dado um pedido concluído, quando se consultam os recursos, então as legendas estão separadas do ficheiro de vídeo e associadas ao vídeo correto, no seu projeto. |
| REQ-VID-LEG-031 | O sistema deve manter no máximo um conjunto de legendas associado ao vídeo, substituindo o anterior apenas quando a nova geração terminar em Concluído. | Deve ter | Mantido | NOVO | UC-VID-003: RN14, FA7, Pós-condições | Regra de negócio: uma geração falhada ou cancelada não pode fazer perder as legendas anteriores. | Dado um vídeo com legendas, quando a nova geração conclui, então fica apenas o novo conjunto; se falhar ou for cancelada, permanece o anterior. |
| REQ-VID-LEG-032 | O sistema deve permitir cancelar apenas pedidos A aguardar ou A processar, passando-os para Cancelado e interrompendo o respetivo processamento. | Deve ter | Refinado | NOVO | UC-VID-003: FA3, RN9, RN10 | O utilizador deve poder desistir de um pedido que já não lhe interessa. | Dado pedidos nos cinco estados, quando se tenta cancelar, então apenas os ativos aceitam a ação, passam para Cancelado e deixam de ser processados. |
| REQ-VID-LEG-033 | O sistema deve cancelar os pedidos de legendas ativos quando o utilizador termina explicitamente a sessão. | Deve ter | Refinado | ALT | UC-VID-003: FA6, A8 | Evita pedidos órfãos depois de o utilizador sair. | Dado pedidos A aguardar ou A processar, quando o utilizador faz logout, então esses pedidos são cancelados. |
| REQ-VID-LEG-034 | O sistema deve eliminar os resultados parciais de pedidos que terminem em Falhou ou Cancelado. | Deve ter | Mantido | NOVO | UC-VID-003: FA3, FA6, Exceções 3, 4, 7, 8 e 9, Pós-condição mínima | Nenhum resultado incompleto pode ficar associado ao vídeo nem ocupar espaço. | Dado um pedido com resultados parciais, quando falha ou é cancelado, então esses resultados são eliminados. |
| REQ-VID-LEG-035 | O sistema deve reservar 1 operação na quota diária aplicável no momento em que cria o pedido de legendas. | Deve ter | Refinado | ALT | UC-VID-003: Passos 6 e 11, Exceção 5, RN7, A10, Pós-condição de sucesso | A reserva impede ultrapassar o limite diário com pedidos em curso (antiga Q13); um pedido Concluído mantém a operação reservada. | Dado um Registado com 4 operações gastas, quando confirma uma geração, então a quota passa a 5 e uma nova operação sobre imagem é recusada; se o pedido terminar em Concluído, a quota mantém-se em 5; pedidos rejeitados antes de criados não alteram a quota. |
| REQ-VID-LEG-036 | O sistema deve passar o pedido para Concluído após guardar e associar as legendas ao vídeo. | Deve ter | Mantido | NOVO | UC-VID-003: Passos 10 e 11, RN9, Pós-condição de sucesso | Marca o fim do pedido só quando o resultado está disponível. | Dado legendas guardadas e associadas, quando a operação termina com sucesso, então o pedido passa para Concluído. |
| REQ-VID-LEG-037 | O sistema deve apresentar uma notificação na aplicação no máximo 2 segundos depois de um pedido passar a Concluído, enquanto o utilizador está no editor do projeto. | Deveria ter | Refinado | NOVO | UC-VID-003: Passo 11, A7 | Evita que o utilizador tenha de verificar manualmente se as legendas ficaram prontas. | Dado o editor aberto e um pedido A processar, quando o pedido passa a Concluído, então aparece a notificação "Subtitles ready" em no máximo 2 segundos. |
| REQ-VID-LEG-038 | O sistema deve apresentar cada segmento de legenda durante o respetivo intervalo temporal na reprodução do vídeo. | Deve ter | Mantido | NOVO | UC-VID-003: Passo 12 | É a forma de o utilizador ver o resultado. | Dado um vídeo com legendas, quando é reproduzido, então cada segmento aparece entre os seus instantes inicial e final. |
| REQ-VID-LEG-041 | O sistema deve recusar o pedido quando o espaço livre no projeto ou na conta não chegar para guardar as legendas, apresentando a mensagem "Espaço de armazenamento insuficiente" e indicando o limite atingido. | Deve ter | Novo | NOVO | UC-VID-003: Passo 5, Exceção 6, A12 | Evita processar legendas que não vão caber no espaço disponível. | Dado um projeto ou uma conta sem espaço livre, quando o utilizador confirma a geração, então o pedido não é criado e a mensagem indica o limite atingido (projeto ou conta). |
| REQ-VID-LEG-042 | O sistema deve impedir a eliminação do vídeo, ou do projeto que o contém, enquanto existir um pedido de legendas associado nos estados A aguardar ou A processar. | Deve ter | Novo | NOVO | UC-VID-003: RN15 | Impede perder o vídeo sobre o qual existe um pedido em curso. | Dado um vídeo com um pedido A aguardar ou A processar, quando o utilizador tenta eliminar o vídeo ou o projeto, então o sistema impede a eliminação. |
| REQ-VID-LEG-043 | O sistema deve contabilizar as legendas guardadas no espaço ocupado do projeto e da conta. | Deve ter | Novo | ALT | UC-VID-003: Passo 10, RN8, A12; UC-VID-004: RN7 | As legendas são ficheiros guardados como os vídeos e contam para os limites de espaço. | Dado um pedido concluído, quando se consulta o espaço ocupado do projeto e da conta, então ambos incluem o espaço das legendas. |
| REQ-VID-LEG-044 | O sistema deve copiar as legendas de um vídeo para o novo vídeo criado quando lhe é aplicado um filtro, mantendo o idioma e os instantes. | Deveria ter | Novo | NOVO | UC-VID-003: RN16; UC-VID-002 | O filtro não altera os tempos do vídeo, por isso as legendas continuam válidas no resultado. | Dado um vídeo com legendas, quando um filtro termina em Concluído, então o novo vídeo tem legendas com o mesmo texto, idioma e instantes; o original mantém as suas; se o original não tinha legendas, o resultado também não tem. |
| REQ-VID-LEG-045 | O sistema deve recusar um novo pedido de legendas para um vídeo que já tenha um pedido A aguardar ou A processar, informando que já estão a ser geradas legendas para esse vídeo. | Deve ter | Novo | NOVO | UC-VID-003: FA8 | Dois pedidos para o mesmo vídeo gastariam duas operações e o último a terminar substituiria o outro. | Dado um vídeo com um pedido ativo, quando o utilizador confirma outro pedido para o mesmo vídeo, então nenhum pedido é criado e a mensagem é apresentada. |
| REQ-VID-LEG-046 | O sistema deve recusar o pedido quando o vídeo já não pertence ao projeto. | Deveria ter | Novo | NOVO | UC-VID-003: FA9 | Evita gerar legendas para um vídeo que está a ser eliminado. | Dado um vídeo retirado do projeto, quando o utilizador confirma a geração, então nenhum pedido é criado e é indicado que o vídeo não foi encontrado no projeto. |
| REQ-VID-LEG-047 | O sistema deve terminar em Concluído, com a operação contabilizada, um pedido cujo cancelamento chegue depois de as legendas estarem associadas ao vídeo. | Deveria ter | Novo | NOVO | UC-VID-003: FA10, RN10 | Depois de associadas, as legendas já estão disponíveis; anular o pedido deixaria o resultado sem pedido correspondente. | Dado um pedido cujas legendas já foram associadas, quando o cancelamento chega, então o pedido fica Concluído e as legendas mantêm-se. |
| REQ-VID-LEG-048 | O sistema deve verificar a existência de faixa de áudio durante o processamento quando essa informação não é conhecida, passando o pedido para Falhou se não existir. | Deve ter | Novo | NOVO | UC-VID-003: Exceção 9, RN3 | Os vídeos carregados antes desta funcionalidade não têm a informação de áudio registada. | Dado um vídeo antigo sem informação de áudio e sem áudio, quando é processado, então o pedido fica Falhou com a mensagem de ausência de áudio e a operação é devolvida. |
| REQ-VID-LEG-051 | O sistema deve eliminar as legendas de um vídeo quando o vídeo ou o projeto que o contém é eliminado, libertando o espaço ocupado. | Deve ter | Novo | NOVO | UC-VID-003: RN15 | Legendas sem vídeo continuariam a ocupar espaço da conta. | Dado um vídeo com legendas, quando é eliminado, então o ficheiro de legendas deixa de existir e o espaço ocupado da conta diminui. |
| REQ-VID-LEG-052 | O sistema deve guardar as legendas em WebVTT, com o texto de cada segmento numa só linha e os caracteres especiais escapados. | Deve ter | Novo | NOVO | UC-VID-003: RN5, RN6; DQ-005 | WebVTT é o formato de legendas que os navegadores reproduzem diretamente. | Dado um segmento com quebras de linha ou caracteres como < e &, quando as legendas são guardadas, então o ficheiro WebVTT é válido e o texto ocupa uma linha. |
| REQ-VID-LEG-053 | O sistema deve tornar indisponível a opção de gerar legendas para um vídeo enquanto existir um pedido ativo para esse vídeo. | Deveria ter | Refinado | NOVO | UC-VID-003: Passo 9, FA8 | Evita pedidos duplicados por engano. | Dado um pedido ativo para o vídeo, quando o utilizador observa o ecrã de geração, então a opção de gerar está indisponível. |
| REQ-VID-LEG-054 | O sistema deve atualizar o contador de operações diárias restantes quando o pedido é criado e quando termina. | Deveria ter | Novo | ALT | UC-VID-003: Passos 6 e 11, RN7 | O contador existente tem de refletir a reserva e a devolução da operação. | Dado um Registado com 1 operação restante, quando cria um pedido, então o contador passa a 0; se o pedido falhar, volta a 1. |
| REQ-VID-LEG-055 | O sistema deve apresentar as legendas ativas por omissão na reprodução, identificadas pelo nome do idioma. | Deveria ter | Novo | NOVO | UC-VID-003: Passo 12 | O utilizador não tem de procurar no leitor como ativar as legendas. | Dado um vídeo com legendas, quando é reproduzido, então as legendas aparecem sem o utilizador as ativar e o nome do idioma é apresentado no leitor. |
| REQ-VID-LEG-057 | O sistema deve apresentar o ecrã de geração indicando que o único idioma suportado é o inglês, sem oferecer outros idiomas nem deteção automática. | Deve ter | Novo | NOVO | UC-VID-003: Passo 3, RN4 | Substitui o REQ-VID-LEG-012: o MVP passou a suportar apenas o inglês. | Dado um vídeo elegível, quando o ecrã abre, então indica o inglês como idioma e não oferece outras opções. |
| REQ-VID-LEG-058 | O sistema deve registar o inglês como idioma de todos os pedidos de legendas e recusar pedidos com outro idioma. | Deve ter | Novo | NOVO | UC-VID-003: Passo 4, RN4 | Substitui o REQ-VID-LEG-013. | Dado um pedido criado, quando se consulta, então o idioma é o inglês; um pedido com outro idioma é recusado sem ser criado. |
| REQ-VID-LEG-059 | O sistema deve identificar o idioma da fala antes de gerar as legendas e só prosseguir quando a fala for inglesa ou o idioma não for identificado com confiança ≥ 0,5. | Deve ter | Novo | NOVO | UC-VID-003: Passo 8, FA1, RN4, A4 | Substitui o REQ-VID-LEG-025; impede legendas de má qualidade em vídeos noutros idiomas. | Dado um vídeo em inglês, quando é processado, então as legendas são geradas em inglês; dado um vídeo com idioma não identificável, então a geração prossegue em inglês. |
| REQ-VID-LEG-060 | O sistema deve passar o pedido para Falhou quando a fala estiver noutro idioma identificado com confiança ≥ 0,5, apresentando a mensagem "Este vídeo não parece estar em inglês", sem traduzir o conteúdo. | Deve ter | Novo | NOVO | UC-VID-003: Exceção 8, RN4 | Substitui o REQ-VID-LEG-026; a tradução é uma funcionalidade separada (Q9). | Dado um vídeo falado em português, quando é processado, então o pedido fica Falhou com a mensagem indicada, não são criadas legendas e a operação é devolvida. |
| REQ-VID-LEG-068 | O sistema deve devolver a operação reservada quando o pedido de legendas terminar em Falhou ou Cancelado. | Deve ter | Novo | ALT | UC-VID-003: FA3, FA6, Exceções 3, 4, 7, 8 e 9, RN7, Pós-condição mínima | Só os pedidos concluídos consomem quota (RN7). Resulta da divisão do REQ-VID-LEG-035. | Dado um Registado com 4 operações gastas e um pedido ativo (quota em 5), quando o pedido falha ou é cancelado, então a quota volta a 4. |
| REQ-VID-LEG-070 | O sistema deve apresentar, quando o utilizador volta a selecionar um vídeo, o estado do pedido de legendas mais recente desse vídeo. | Deveria ter | Novo | NOVO | UC-VID-003: Passo 9, FA4 | Mostra sempre o estado relevante quando o utilizador regressa ao vídeo. Resulta da divisão do REQ-VID-LEG-053. | Dado um pedido de legendas para um vídeo, quando o utilizador sai do vídeo e volta a selecioná-lo, então vê o estado atual desse pedido. |

<!--
**IDs retirados** (nunca serão reutilizados):
- v1.1 — REQ-VID-LEG-001: listagem de vídeos na biblioteca, que deixa de existir; a listagem e a seleção dos vídeos do projeto são do UC-VID-004 (REQ-VID-UPLOAD-030 e REQ-VID-UPLOAD-031).
- v1.1 — REQ-VID-LEG-003: acesso reservado a Registado e Premium, coberto pelo UC-VID-004 (REQ-VID-UPLOAD-009).
- v1.1 — REQ-VID-LEG-004: disponibilidade do vídeo para edição, coberta pelo UC-VID-004 (REQ-VID-UPLOAD-029).
- v1.1 — REQ-VID-LEG-005, REQ-VID-LEG-007, REQ-VID-LEG-008 e REQ-VID-LEG-009: formato e limites de duração e tamanho por perfil, verificados no carregamento (UC-VID-004, REQ-VID-UPLOAD-011 a REQ-VID-UPLOAD-013).
- v2.1 — REQ-VID-LEG-014: revalidação de várias condições na confirmação, num só requisito; cada condição já tinha requisito próprio verificado na confirmação: quota (REQ-VID-LEG-010), espaço (REQ-VID-LEG-041) e pedidos em simultâneo (REQ-VID-LEG-015).
- v2.0 — REQ-VID-LEG-012, REQ-VID-LEG-013, REQ-VID-LEG-025 e REQ-VID-LEG-026: escolha do idioma e deteção automática; com o MVP só em inglês a intenção mudou materialmente e foram substituídos por REQ-VID-LEG-057 a REQ-VID-LEG-060.
-->

#### 4.1.2 Requisitos Não Funcionais e de Qualidade

| **ID** | **Requisito** | **Característica ISO/IEC 25010** | **Alvo MVP** | **Alvo produção** | **Evolução** | **Origem (UC / DQ)** | **Critério de aceitação / verificação** |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| REQ-VID-LEG-021 | O sistema deve apresentar a percentagem de progresso do pedido e atualizá-la pelo menos a cada 5 segundos enquanto este está A processar. | Usabilidade | ≤ 5 s entre atualizações | ≤ 2 s entre atualizações | Refinado | UC-VID-003: Passos 7 e 9; DQ-001 | Dado um pedido A processar, quando decorrem 5 segundos sem o pedido terminar, então a percentagem apresentada foi atualizada. |
| REQ-VID-LEG-022 | O sistema deve executar o processamento de forma assíncrona, mantendo-o ativo quando o utilizador muda de ecrã ou de projeto ou fecha o separador, enquanto a sessão se mantiver ativa. | Eficiência de Desempenho / Usabilidade | Obrigatório | Obrigatório (igual: sem isto, o utilizador ficaria bloqueado durante o processamento) | Refinado | UC-VID-003: Passo 9, FA4, A8 | Dado um pedido ativo, quando o utilizador abandona o ecrã sem terminar a sessão, então o processamento continua e o estado está visível quando regressa. |
| REQ-VID-LEG-039 | O sistema deve manter o ficheiro de vídeo original inalterado durante e após a geração de legendas. | Fiabilidade | Obrigatório: original inalterado após pedidos Concluídos, Falhados e Cancelados | Obrigatório (igual: a integridade do original não é negociável) | Mantido | UC-VID-003: RN8, Pós-condições | Dado um vídeo original, quando um pedido conclui, falha ou é cancelado, então o resumo criptográfico do ficheiro mantém-se igual ao inicial. |
| REQ-VID-LEG-040 | O sistema deve permitir o acesso aos pedidos de legendas, ao áudio processado e às legendas apenas ao proprietário do vídeo. | Segurança | Obrigatório | Obrigatório (igual: o controlo de acesso não é negociável no MVP) | Refinado | UC-VID-003: RN13 | Dado um pedido ou legendas de um utilizador, quando outro utilizador tenta consultá-los, cancelá-los ou descarregá-los, então o sistema recusa o acesso. |
| REQ-VID-LEG-049 | O sistema deve, ao arrancar, passar para Falhou os pedidos A aguardar ou A processar interrompidos por um reinício cujas legendas ainda não estavam associadas ao vídeo. | Fiabilidade | Obrigatório: nenhum pedido sem legendas associadas fica A aguardar ou A processar depois de um reinício | Obrigatório, com retoma do pedido interrompido em vez de falha (DQ-003) | Refinado | UC-VID-003: RN17; DQ-003 | Dado um pedido A processar sem legendas associadas, quando o sistema reinicia, então o pedido fica Falhou e a operação é devolvida (REQ-VID-LEG-068). |
| REQ-VID-LEG-050 | O sistema deve repetir, a cada minuto e durante o próprio dia, as devoluções de operações que tenham falhado. | Fiabilidade | Repetição a cada 60 s | Repetição a cada 60 s, com alerta ao operador se falhar durante mais de 1 h | Novo | UC-VID-003: RN18 | Dado o serviço de utilizadores indisponível no momento da devolução, quando volta a estar disponível, então a operação é devolvida no máximo um minuto depois. |
| REQ-VID-LEG-056 | O sistema deve terminar a sessão mesmo que o cancelamento dos pedidos ativos falhe ou não responda em 5 segundos. | Usabilidade | ≤ 5 s | ≤ 2 s | Novo | UC-VID-003: FA6 | Dado o serviço de vídeos sem resposta, quando o utilizador faz logout, então a sessão termina em no máximo 5 segundos. |
| REQ-VID-LEG-061 | O sistema deve confirmar a criação do pedido de legendas, apresentando o estado A aguardar, em menos de 3 segundos após a confirmação do utilizador, independentemente da duração do vídeo. | Eficiência de Desempenho | < 3 s | < 1 s | Novo | UC-VID-003: Passos 5 e 6; DQ-002 | Dado um vídeo curto e um vídeo no limite de duração do perfil, quando o utilizador confirma, então o estado A aguardar é apresentado em menos de 3 s nos dois casos (10 medições por vídeo, todas abaixo do alvo). |
| REQ-VID-LEG-062 | O sistema deve concluir a geração de legendas num tempo não superior à duração do vídeo. | Eficiência de Desempenho | ≤ 1 × a duração do vídeo | ≤ 0,25 × a duração do vídeo | Novo | UC-VID-003: Passos 7 a 11; DQ-002 | Dado um vídeo de 60 s com fala, no ambiente de referência (Docker, 2 fios de CPU para o reconhecimento), quando o pedido passa a A processar, então atinge Concluído em não mais de 60 s. |
| REQ-VID-LEG-063 | O sistema deve, quando o processamento falha, passar o pedido para Falhou sem deixar legendas parciais associadas ao vídeo nem repetir automaticamente o pedido. | Fiabilidade | Sem retoma nem repetição automática; o utilizador repete o pedido | Repetição automática de falhas transitórias (até 3 tentativas) antes de passar a Falhou | Novo | UC-VID-003: Exceções 4 e 7, Pós-condição mínima; DQ-003 | Dado um pedido em que o serviço de reconhecimento é parado a meio, quando a falha é detetada, então o pedido fica Falhou, não há legendas parciais e a operação é devolvida. |
| REQ-VID-LEG-064 | O sistema deve disponibilizar as legendas apenas através da API autenticada, sem endereços públicos ou adivinháveis para os ficheiros de legendas. | Segurança | Obrigatório | Obrigatório, com registo dos acessos às legendas | Novo | UC-VID-003: RN13; DQ-004 | Dado o identificador de um ficheiro de legendas, quando se tenta obtê-lo sem sessão válida ou com a sessão de outro utilizador, então o acesso é recusado. |
| REQ-VID-LEG-065 | O sistema deve produzir legendas que os navegadores de referência apresentam diretamente no leitor de vídeo, sem conversão adicional. | Compatibilidade | Verificado no navegador usado pela equipa nos testes (Chrome) | Todos os navegadores suportados pelo PictuRAS (lista definida na Fase 2) | Novo | UC-VID-003: Passo 12, RN5; DQ-005 | Dado um vídeo com legendas, quando é reproduzido num navegador de referência, então as legendas são apresentadas sincronizadas e sem erros. |
| REQ-VID-LEG-066 | A adição de uma nova ferramenta de vídeo não deve exigir alterações ao código das legendas, além da contagem partilhada de pedidos em simultâneo. | Manutenibilidade | Objetivo | Obrigatório | Novo | DQ-006 | Demonstração com o Recorte e os Filtros, que coexistem com as Legendas sem alterar o processamento das legendas. |
| REQ-VID-LEG-067 | O serviço de reconhecimento de fala e o processamento de áudio devem poder ser implantados sem instalação manual de software adicional no ambiente de destino. | Portabilidade | Obrigatório (implantação documentada e repetível em contentores) | Obrigatório, verificado em dois ambientes de execução distintos | Novo | UC-VID-003: A14; DQ-006 | Dado um ambiente de execução limpo, quando os serviços são implantados com o procedimento documentado, então a geração de legendas funciona sem instalação manual; o modelo é descarregado automaticamente no primeiro arranque. |
| REQ-VID-LEG-069 | O sistema deve, ao arrancar, passar para Concluído os pedidos interrompidos por um reinício cujas legendas já estavam associadas ao vídeo. | Fiabilidade | Obrigatório | Obrigatório (igual: as legendas associadas já estão disponíveis ao utilizador) | Novo | UC-VID-003: RN17; DQ-003 | Dado um pedido A processar cujas legendas já foram associadas ao vídeo, quando o sistema reinicia, então o pedido fica Concluído, as legendas mantêm-se e a operação continua contabilizada. Resulta da divisão do REQ-VID-LEG-049. |

#### 4.1.3 Verificação da completude e dos limites do âmbito

| **Tópico a verificar** | **Aplicável?** | **Decisão / justificação** | **Requisito(s) relacionado(s)** |
| :-- | :-- | :-- | :-- |
| Formato, codec, duração e dimensão do vídeo | Sim (parcial) | O formato de entrada, os limites de duração e tamanho e a validação do conteúdo são do UC-VID-004 (RN3 e RN4) e as Legendas não os repetem (RN1, RN2, A11). Especificamente das Legendas: o vídeo tem de ter faixa de áudio, verificada no pedido ou durante o processamento, e a fala tem de estar em inglês. A saída é um ficheiro WebVTT reproduzível no leitor. | REQ-VID-LEG-006, 048, 052, 059, 060, 065 |
| Estado, progresso, cancelamento e resultado | Sim | Estados A aguardar, A processar, Concluído, Falhou e Cancelado, progresso em percentagem, cancelamento manual e no logout, um único pedido ativo por vídeo e resultado associado ao vídeo, com notificação e reprodução. A confirmação e o processamento têm alvos de tempo (DQ-002). | REQ-VID-LEG-017, 018, 020, 021, 022, 032, 033, 036, 037, 038, 045, 047, 053, 055, 061, 062, 070 |
| Falhas durante o processamento | Sim | Uma falha leva o pedido a Falhou, com a causa, sem legendas parciais e com a operação devolvida. No MVP não há retoma nem repetição automática (DQ-003). Os pedidos interrompidos por um reinício são recuperados e as devoluções falhadas são repetidas. Com o serviço indisponível, o pedido não é criado; não existe fila com capacidade limitada no MVP. | REQ-VID-LEG-019, 027, 028, 029, 034, 048, 049, 050, 060, 063, 069 |
| Persistência e expiração dos ficheiros | Sim (persistência); Não (expiração) | As legendas ficam guardadas, separadas do vídeo, até serem substituídas por uma nova geração ou até o vídeo ou o projeto ser eliminado. Não há expiração automática no MVP (DQ-004). Os ficheiros temporários (cópia do vídeo e áudio extraído) são eliminados no fim de cada pedido. | REQ-VID-LEG-030, 031, 043, 051, 064 |
| Perfis e contagem de operações | Sim | O acesso a vídeo e os limites de duração e tamanho são do UC-VID-004. Cada geração consome uma operação da quota diária partilhada com as imagens, reservada ao criar o pedido e devolvida em falha ou cancelamento; o limite de pedidos em simultâneo é global à conta e partilhado pelas ferramentas de vídeo. | REQ-VID-LEG-010, 015, 016, 035, 054, 068 |
| Encadeamento de ferramentas e processamento em lote | Não (exclusão explícita) | No MVP a geração de legendas é uma operação isolada sobre um vídeo, não encadeável nem aplicável em lote (UC-VID-004, RN14). A cópia das legendas para o resultado de um filtro (RN16) não é encadeamento: acontece dentro do pedido de filtro. | N/A (relacionado: REQ-VID-LEG-044) |

**Evolução:** *Mantido* = requisito preservado; *Refinado* = clarificado ou tornado verificável sem mudar a intenção; *Novo* = acrescentado para completar a ERS. **NOVO/ALT** indica o impacto face ao PictuRAS existente, não a novidade face ao Exercício 1.

### 4.2 Impacto no sistema existente

A coluna **Elemento da baseline** indica o elemento do documento de requisitos de base (doc-ext-requisitos.pdf, PictuRAS 2025/26) afetado; R*n* são as restrições do projeto desse documento (secção 4).

| **Elemento existente afetado** | **Elemento da baseline** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisito(s) relacionado(s)** |
| :-- | :-- | :-- | :-- | :-- |
| Perfis e permissões | Perfis de utilização (secção 3.1) | Estender | O acesso a vídeo e os limites de duração e tamanho por perfil são definidos no UC-VID-004. A geração de legendas aplica o limite de pedidos de processamento de vídeo em simultâneo por perfil, global à conta e partilhado pelas ferramentas de vídeo. | REQ-VID-LEG-015, 016 |
| Quota diária de operações | Perfil Registado com operações diárias limitadas (secção 3.1); RNF48 (exibir limite diário de operações) | Estender | A geração de legendas passa a consumir a quota partilhada entre imagens e vídeos: verificada na abertura e na confirmação, reservada ao criar o pedido e devolvida em falha ou cancelamento, com repetição das devoluções que falharem. O contador de operações restantes é atualizado. | REQ-VID-LEG-010, 035, 050, 054, 068 |
| Gestão da sessão | Caso de uso Login (Figura 2; sem ID no documento de base) | Estender | O logout explícito cancela os pedidos ativos sem nunca impedir o fim da sessão; o processamento continua quando o utilizador apenas abandona o ecrã. | REQ-VID-LEG-022, 033, 056 |
| Armazenamento e gestão de recursos | R2 (limite de armazenamento por utilizador); RNF45 (armazenamento local e cloud) | Estender | As legendas são guardadas separadas do vídeo e contabilizadas no espaço do projeto e da conta (UC-VID-004, RN7). O espaço é verificado na confirmação e ao guardar, o original e as legendas anteriores são preservados perante falhas ou cancelamentos e as legendas são eliminadas com o vídeo ou o projeto. | REQ-VID-LEG-029, 030, 031, 034, 039, 041, 043, 051, 052 |
| Controlo de acesso e privacidade | RNF44 (segurança e privacidade dos dados); R3 (RGPD) | Estender | O acesso aos pedidos, ao áudio processado e às legendas é exclusivo do proprietário; as legendas só são obtidas pela API autenticada. O acesso aos vídeos e aos projetos segue o UC-VID-004. | REQ-VID-LEG-040, 064 |
| Editor do projeto de vídeo | Nenhum: o editor de vídeo é novo (UC-VID-004); o equivalente para imagens é o UC04 | Estender | A ferramenta Legendas passa a fazer parte do catálogo do editor de projetos de vídeo (UC-VID-004, REQ-VID-UPLOAD-033), apenas para inglês, com acompanhamento dos pedidos, notificação de conclusão e reprodução com legendas ativas por omissão. | REQ-VID-LEG-002, 011, 017, 021, 037, 038, 053, 055, 057, 070 |
| Projetos de vídeo e gestão de vídeos | Entidade Projeto do modelo de domínio (Figura 1) | Estender | As legendas ficam associadas a um vídeo de um projeto de vídeo (A9; UC-VID-004, A6). Nem o vídeo nem o projeto podem ser eliminados enquanto existir um pedido de legendas ativo, e não são aceites pedidos para vídeos já retirados do projeto. O resultado de um filtro recebe uma cópia das legendas do original (RN16). | REQ-VID-LEG-030, 042, 044, 046 |
| Processamento de operações e gestão de pedidos | R5 (controlo de tarefas em fila) | Estender | Novo tipo de pedido assíncrono, com estados, progresso, um pedido ativo por vídeo, cancelamento, tratamento de falhas sem retoma no MVP e recuperação após um reinício. Aplicam-se alvos de tempo de confirmação e de processamento (DQ-002). | REQ-VID-LEG-018, 020, 021, 022, 032, 045, 049, 061, 062, 063, 069 |
| Restrição de desempenho das operações com IA (R5) | R5; RNF43 (filtros com IA em menos de 1 minuto) | Manter | Não é alterada a restrição existente. O alvo MVP de processamento das legendas fica fixado em REQ-VID-LEG-062; a relação com o limite de 60 s da R5 para vídeos Premium longos permanece em aberto em Q12. | REQ-VID-LEG-062 |
| Implantação e execução dos serviços | R7 (compatibilidade com a arquitetura base) | Estender | Passa a existir um serviço de reconhecimento de fala em contentor próprio, com o modelo guardado num volume, e o serviço de projetos passa a usar o FFmpeg para extrair o áudio. Nenhum dos dois exige instalação manual. | REQ-VID-LEG-067 |
| Modelo de ferramentas de processamento | Entidade Ferramenta, Básica e Avançada, do modelo de domínio (Figura 1) | Estender | As Legendas são acrescentadas como ferramenta de vídeo independente; a única peça partilhada com o Recorte e os Filtros é a contagem de pedidos em simultâneo. | REQ-VID-LEG-066 |
| Exportação e formatos de saída | R4 (compatibilidade com navegadores modernos) | Estender | Passa a ser produzido um novo tipo de ficheiro, as legendas WebVTT, apresentadas no leitor. A exportação das legendas para o utilizador não faz parte do MVP (Q5). | REQ-VID-LEG-052, 065 |
| Encadeamento de ferramentas e processamento em lote | Caso de uso Aplicar encadeamento de ferramentas a conjunto de imagens (Figura 2; sem ID no documento de base) | Manter | A geração de legendas é uma operação isolada; não há alterações ao encadeamento nem ao processamento em lote. | Sem requisitos diretos (4.1.3) |

### 4.3 Matriz de Rastreabilidade Atualizada

| **Elemento de origem** | **Descrição abreviada** | **Requisito(s) relacionado(s)** |
| :-- | :-- | :-- |
| Pré-condições | Sessão iniciada e vídeo disponível para edição. Sem requisito neste caso de uso: coberto por UC-VID-004 (REQ-VID-UPLOAD-009, REQ-VID-UPLOAD-029) | — |
| Trigger | Selecionar vídeo no projeto e escolher Legendas | REQ-VID-LEG-002 |
| Passo 1 | Selecionar o vídeo pela miniatura. Sem requisito neste caso de uso: coberto por UC-VID-004 (REQ-VID-UPLOAD-030, REQ-VID-UPLOAD-031) | — |
| Passo 2 | Escolher Legendas; validar áudio e quota | REQ-VID-LEG-002, 006, 010, 011 |
| Passo 3 | Ecrã de geração (só inglês) | REQ-VID-LEG-057 |
| Passo 4 | Registo do inglês como idioma | REQ-VID-LEG-058 |
| Passo 5 | Confirmação e revalidação | REQ-VID-LEG-010, 015, 041, 061 |
| Passo 6 | Reservar a operação e criar pedido A aguardar | REQ-VID-LEG-018, 035, 054, 061 |
| Passo 7 | Iniciar processamento e apresentar progresso | REQ-VID-LEG-020, 021, 062 |
| Passo 8 | Verificar o idioma, reconhecer a fala e gerar segmentos | REQ-VID-LEG-023, 059, 062 |
| Passo 9 | Acompanhamento e processamento em segundo plano | REQ-VID-LEG-017, 021, 022, 053, 070 |
| Passo 10 | Guardar, associar e contabilizar legendas | REQ-VID-LEG-030, 043 |
| Passo 11 | Conclusão, contabilização e notificação | REQ-VID-LEG-035, 036, 037, 054 |
| Passo 12 | Reprodução com legendas ativas por omissão | REQ-VID-LEG-038, 055, 065 |
| FA1 | Idioma da fala sem confiança suficiente | REQ-VID-LEG-027, 059 |
| FA3 | Cancelar processamento | REQ-VID-LEG-032, 034, 068 |
| FA4 | Abandonar o ecrã ou fechar o separador | REQ-VID-LEG-017, 022, 070 |
| FA5 | Limite de pedidos em simultâneo | REQ-VID-LEG-015, 016, 017 |
| FA6 | Terminar explicitamente a sessão | REQ-VID-LEG-033, 034, 056, 068 |
| FA7 | Vídeo com legendas existentes | REQ-VID-LEG-011, 031 |
| FA8 | Pedido já em curso para o vídeo | REQ-VID-LEG-045, 053 |
| FA9 | Vídeo retirado do projeto | REQ-VID-LEG-046 |
| FA10 | Cancelamento tardio | REQ-VID-LEG-047 |
| Exceção 1 | Ausência de áudio | REQ-VID-LEG-006 |
| Exceção 2 | Quota esgotada | REQ-VID-LEG-010 |
| Exceção 3 | Ausência de fala reconhecível | REQ-VID-LEG-027, 034, 068 |
| Exceção 4 | Falha do reconhecimento | REQ-VID-LEG-028, 034, 063, 068 |
| Exceção 5 | Serviço de reconhecimento indisponível | REQ-VID-LEG-019, 035 |
| Exceção 6 | Espaço insuficiente na confirmação | REQ-VID-LEG-041 |
| Exceção 7 | Espaço insuficiente ao guardar | REQ-VID-LEG-029, 034, 063, 068 |
| Exceção 8 | Fala noutro idioma | REQ-VID-LEG-060, 034, 068 |
| Exceção 9 | Ausência de áudio detetada no processamento | REQ-VID-LEG-048, 034, 068 |
| Pós-condição de sucesso | Legendas associadas e contabilizadas, original intacto e operação contabilizada | REQ-VID-LEG-023, 030, 031, 035, 036, 038, 039, 043 |
| Pós-condição mínima | Sem parciais; original, legendas anteriores e quota preservados | REQ-VID-LEG-027, 028, 029, 031, 032, 033, 034, 039, 060, 063, 068 |
| RN1 | Formatos e validação do UC-VID-004. Sem requisito neste caso de uso: coberto por UC-VID-004 (REQ-VID-UPLOAD-011) | — |
| RN2 | Acesso e limites por perfil do UC-VID-004. Sem requisito neste caso de uso: coberto por UC-VID-004 (REQ-VID-UPLOAD-009, 012, 013) | — |
| RN3 | Faixa de áudio obrigatória | REQ-VID-LEG-006, 048 |
| RN4 | Só inglês, com verificação do idioma e sem tradução | REQ-VID-LEG-057, 058, 059, 060 |
| RN5 | Estrutura dos segmentos e formato WebVTT | REQ-VID-LEG-023, 052, 065 |
| RN6 | Intervalos temporais válidos, ajustados ou descartados | REQ-VID-LEG-024, 052 |
| RN7 | Operação reservada ao criar o pedido e devolvida em falha ou cancelamento | REQ-VID-LEG-010, 035, 054, 068 |
| RN8 | Legendas separadas, associadas ao vídeo do projeto e contabilizadas; original inalterado | REQ-VID-LEG-030, 039, 043 |
| RN9 | Estados dos pedidos | REQ-VID-LEG-017, 018, 020, 027, 028, 029, 032, 036, 060 |
| RN10 | Cancelamento apenas de pedidos ativos e cancelamento tardio | REQ-VID-LEG-032, 047 |
| RN11 | Pedidos em simultâneo por perfil, globais à conta | REQ-VID-LEG-015 |
| RN12 | Vídeo disponível para edição. Sem requisito neste caso de uso: coberto por UC-VID-004 (REQ-VID-UPLOAD-029) | — |
| RN13 | Acesso exclusivo do proprietário | REQ-VID-LEG-040, 064 |
| RN14 | Um conjunto de legendas e substituição apenas na conclusão | REQ-VID-LEG-011, 031 |
| RN15 | Vídeo e projeto não elimináveis com pedido ativo; legendas eliminadas com o vídeo | REQ-VID-LEG-042, 051 |
| RN16 | Resultado de um filtro recebe cópia das legendas | REQ-VID-LEG-044 |
| RN17 | Recuperação após reinício | REQ-VID-LEG-049, 069 |
| RN18 | Repetição das devoluções falhadas | REQ-VID-LEG-050 |
| A1 | Vídeo armazenado e acessível. Sem requisito: condição assumida do ambiente | — |
| A2 | Áudio extraível e processável | REQ-VID-LEG-023; pressuposto de viabilidade |
| A3 | Fala em inglês, num único idioma. Delimitação do âmbito; não exige suporte a outros idiomas | — |
| A4 | Identificação do idioma só para verificação | REQ-VID-LEG-059 |
| A5 | Informação temporal para sincronização | REQ-VID-LEG-023, 024, 038 |
| A6 | Possibilidade de erros de reconhecimento. Limitação assumida; não estabelece um alvo mensurável de precisão | — |
| A7 | Notificação apenas interna | REQ-VID-LEG-037 |
| A8 | Logout explícito e ausência de timeout | REQ-VID-LEG-022, 033 |
| A9 | Vídeos organizados em projetos de vídeo | REQ-VID-LEG-002, 030 |
| A10 | Quota partilhada entre imagens e vídeos | REQ-VID-LEG-010, 035 |
| A11 | Vídeos já validados no carregamento. Sem requisito neste caso de uso: coberto por UC-VID-004 (REQ-VID-UPLOAD-011 a 013) | — |
| A12 | Espaço verificado na confirmação e ao guardar, sem reserva | REQ-VID-LEG-029, 041, 043 |
| A13 | Interface em inglês. Delimitação da apresentação; não origina um requisito autónomo | — |
| A14 | Modelo de reconhecimento de fala executado localmente | REQ-VID-LEG-059, 060, 062, 067 |
| UC-VID-004 – RN7 | Ocupação do espaço do projeto e da conta, incluindo resultados | REQ-VID-LEG-043 |
| UC-VID-002 | Aplicação de filtros a um vídeo com legendas | REQ-VID-LEG-044 |
| DQ-001 | Intervalo máximo de atualização do progresso | REQ-VID-LEG-021 |
| DQ-002 | Alvos de desempenho: confirmação do pedido e tempo de processamento | REQ-VID-LEG-061, 062 |
| DQ-003 | Sem retoma nem repetição automática no MVP | REQ-VID-LEG-049, 063, 069 |
| DQ-004 | Legendas sem expiração automática e só acessíveis pela API autenticada | REQ-VID-LEG-064 |
| DQ-005 | Formato WebVTT e compatibilidade com os navegadores | REQ-VID-LEG-052, 065 |
| DQ-006 | Ferramentas de vídeo independentes e implantação sem passos manuais | REQ-VID-LEG-066, 067 |
| Q3–Q16 | Questões com resolução na 2.8 (Q1, Q2, Q10, Q13 e Q14 retiradas). As adiadas não originam requisitos; a Q16 é concretizada pela A12 e as Q5, Q11 e Q15 confirmam comportamentos já cobertos, sem requisitos novos | REQ-VID-LEG-029, 041 (Q16) |

**Decisões de qualidade**

| **ID** | **Decisão de qualidade** | **Justificação** | **Requisito(s) relacionado(s)** |
| :-- | :-- | :-- | :-- |
| DQ-001 | O progresso do pedido é atualizado com um intervalo máximo de 5 s no MVP e de 2 s em produção. | O caso de uso só dizia que o progresso é atualizado periodicamente. A geração pode demorar de segundos a minutos; 5 s é exequível na Fase 1 e igual ao Recorte. | REQ-VID-LEG-021 |
| DQ-002 | Alvos de desempenho: confirmação do pedido em menos de 3 s no MVP e de 1 s em produção; processamento em não mais do que a duração do vídeo no MVP e em 25 % dessa duração em produção. | A confirmação não depende da duração do vídeo, porque o processamento é assíncrono. Nos testes da equipa, com o modelo *small* em CPU (2 fios), um vídeo de 15,5 s foi legendado em cerca de 5 s, o que deixa margem para o alvo MVP. O alvo de produção serve de referência para a Fase 2 e para a Q12. A capacidade global de pedidos em simultâneo fica limitada pelo RN11. | REQ-VID-LEG-061, 062 |
| DQ-003 | No MVP não há retoma nem repetição automática: uma falha leva o pedido a Falhou e os pedidos interrompidos por um reinício passam a Falhou (ou a Concluído, se as legendas já estavam associadas). Em produção, as falhas transitórias seriam repetidas automaticamente e os pedidos interrompidos retomados. | A Fase 1 valida o fluxo funcional; a operação é sempre devolvida, por isso o utilizador pode repetir o pedido sem custo. | REQ-VID-LEG-049, 063, 069 |
| DQ-004 | As legendas não expiram automaticamente: ficam guardadas até serem substituídas ou até o vídeo ou o projeto ser eliminado. Só são obtidas pela API autenticada, nunca por endereço público. | Os casos de uso não definem prazos de retenção; manter as legendas evita perder trabalho e o espaço que ocupam é pequeno (A12). O acesso pela API autenticada responde à pergunta sobre endereços adivinháveis. | REQ-VID-LEG-064 |
| DQ-005 | As legendas são produzidas em WebVTT e verificadas no navegador usado pela equipa no MVP; em produção, em todos os navegadores suportados. | O WebVTT é o formato de legendas que os navegadores reproduzem diretamente no elemento de vídeo, sem bibliotecas adicionais. | REQ-VID-LEG-052, 065 |
| DQ-006 | As ferramentas de vídeo são independentes entre si (objetivo no MVP, obrigatório em produção) e o reconhecimento de fala corre num serviço em contentor, com o modelo descarregado automaticamente (obrigatório no MVP). | O processamento depende de software externo (FFmpeg e o modelo Whisper), que tem de ser isolado e instalável de forma repetível. | REQ-VID-LEG-066, 067 |


