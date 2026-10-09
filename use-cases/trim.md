# 📝 Exercício 1 — Entrega
### Casos de Uso · Fase 1: Suporte a Vídeo no PictuRAS

---

## 0. Identificação

| **Campo** | **Valor** |
| :-- | :-- |
| **Grupo / Equipa** | (preencher) |
| **Autores** | Eduarda Ferreira PG65368; Luana Vilaverde PG65367; Daniel Rodrigues PG63934; Lucas Pinto PG63997 |
| **Data** | 2026-10-09 |
| **Versão do documento** | v3.0 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
| :-- | :-- |
| **Funcionalidade** | Recorte temporal de vídeo (*trim*) |
| **Perfil(s) de utilizador abrangido(s)** | O perfil Anónimo fica de fora: o PictuRAS só lhe permite operações básicas sobre imagens pequenas, e o vídeo, por serem ficheiros grandes de processamento demorado, exige uma conta com limites controlados. O perfil Registado pode recortar vídeos dentro da sua quota de 5 operações por dia (cada recorte conta como 1 operação), o que chega para validar a funcionalidade, embora a limite. O perfil Premium, com uso ilimitado, é o mais adequado para esta funcionalidade, por não ter limite de operações. |

**Justificação no contexto do MVP**

O recorte temporal permite ao utilizador reduzir um vídeo longo ao excerto que lhe interessa, obtendo um ficheiro mais curto e fácil de partilhar. É uma das operações mais básicas sobre vídeo e é fácil de verificar: o novo vídeo tem uma duração dentro da tolerância definida para o intervalo escolhido e o original fica inalterado. Obriga o sistema a processar o vídeo durante algum tempo, com estados e progresso, e a tratar falhas e cancelamentos sem deixar resultados a meio. Sem ela, ficaria por validar o processamento demorado de vídeo no PictuRAS.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
| :-- | :-- |
| **ID do Caso de Uso** | UC-VID-001 |
| **Nome** | Recortar um intervalo temporal de um vídeo |
| **Versão** | v1.4 |
| **Autor** | Eduarda Ferreira; Luana Vilaverde; Daniel Rodrigues; Lucas Pinto |
| **Data** | 2026-10-09 |
| **Objetivo** | Permitir ao utilizador obter um novo vídeo contendo apenas o intervalo temporal que escolheu de um vídeo já existente na sua biblioteca, acompanhando o processamento até à conclusão. |
| **Âmbito** | Módulo de vídeo do PictuRAS: a biblioteca de vídeos, o recorte em si (que corre em segundo plano, para o utilizador não ficar à espera e poder acompanhar o estado do pedido) e a contagem de operações de cada perfil. |
| **Ator Principal** | Utilizador Registado (gratuito). O Utilizador Premium usa o mesmo fluxo, com limites diferentes. |
| **Stakeholders e Interesses** | **Utilizador:** quer ficar só com a parte do vídeo que interessa, saber em que ponto está o recorte e não perder o vídeo original<br>**Dono do sistema:** quer que o vídeo dê motivo para subscrever o Premium, sem gastar demasiados recursos<br>**Equipa de desenvolvimento:** quer testar que o sistema consegue processar um vídeo durante algum tempo, sem bloquear o resto da aplicação |
| **Pré-condições** | O utilizador tem sessão iniciada (Registado ou Premium)<br>O vídeo já está na biblioteca e o carregamento terminou |
| **Trigger** | O utilizador seleciona um vídeo da biblioteca e escolhe a opção **Recortar** |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
| :-- | :-- | :-- |
| 1 | O utilizador abre a biblioteca de vídeos | Apresenta a lista de vídeos do utilizador, com nome, duração e tamanho |
| 2 | O utilizador seleciona um vídeo e escolhe **Recortar** | Verifica a duração e o tamanho do vídeo face aos limites do perfil do utilizador e a quota diária restante |
| 3 | — | Apresenta o ecrã de recorte: leitor do vídeo com a linha temporal, a duração total, os campos de instante inicial e instante final e a escolha do formato de saída (por falta de escolha, igual ao original) |
| 4 | O utilizador define o instante inicial e o instante final do intervalo | Valida em tempo real que o intervalo é válido e mostra a duração do resultado |
| 5 | O utilizador escolhe o formato de saída ou mantém o formato por omissão | — |
| 6 | O utilizador confirma a operação através de **Iniciar recorte** | Verifica novamente os limites aplicáveis, a quota diária disponível e o número de recortes em simultâneo. Se todas as validações forem satisfeitas, cria o pedido no estado **Em fila** |
| 7 | — | Inicia o processamento, altera o estado do pedido para **A processar** e apresenta o progresso em percentagem |
| 8 | O utilizador acompanha o progresso (pode continuar a usar o PictuRAS noutros ecrãs) | Atualiza o progresso periodicamente |
| 9 | — | Conclui o processamento, grava o novo vídeo na biblioteca e passa o estado para **Concluído** |
| 10 | — | Contabiliza 1 operação na quota diária do perfil e notifica o utilizador da conclusão |
| 11 | O utilizador abre o vídeo resultante na biblioteca | Apresenta o vídeo recortado, com duração dentro de uma tolerância de ±1 segundo relativamente ao intervalo escolhido; o vídeo original mantém-se inalterado |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
| :-- | :-- |
| FA1 – Cancelar o processamento | O utilizador seleciona **Cancelar** enquanto o pedido está **Em fila** ou **A processar** → O sistema altera o estado do pedido para **Cancelado**. Se o processamento já tiver começado, interrompe-o e elimina qualquer resultado parcial. A operação não é contabilizada na quota e o vídeo original mantém-se inalterado |
| FA2 – Utilizador abandona o ecrã | O utilizador sai do ecrã de recorte ou fecha o separador depois de iniciado o pedido → O processamento continua em segundo plano. Quando o utilizador voltar à aplicação, o estado do pedido está visível |
| FA3 – Intervalo igual à duração total | O utilizador escolhe um intervalo que corresponde à duração total do vídeo (passo 4) → O sistema informa que o resultado seria igual ao vídeo original e impede o início do recorte até ser selecionado um intervalo diferente |
| FA4 – Formato de saída diferente do original | O utilizador escolhe um formato de saída diferente do original (passo 5) → O sistema converte o resultado para o formato escolhido durante o processamento; o fluxo prossegue normalmente no passo 6 |
| FA5 – Limite de recortes em simultâneo | O utilizador já atingiu o número máximo de recortes em simultâneo permitido pelo seu perfil quando confirma (passo 6) → O sistema não cria o pedido, informa que o limite de recortes em simultâneo foi atingido e oferece a navegação para a lista de pedidos, onde o utilizador pode acompanhar ou cancelar os recortes em curso |
| FA6 – Utilizador termina a sessão | O utilizador termina a sessão enquanto existe um recorte **Em fila** ou **A processar** → O sistema cancela o pedido e altera o seu estado para **Cancelado**. Se o processamento já tiver começado, interrompe-o e elimina qualquer resultado parcial. O vídeo original permanece inalterado e a operação não é contabilizada na quota |

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
| :-- | :-- |
| A duração ou o tamanho do vídeo excedem o limite do perfil (passo 2) | Apresenta uma mensagem com o limite do perfil atual e sugere o plano Premium se o utilizador for Registado; não abre o ecrã de recorte |
| A quota diária de operações do perfil está esgotada (passos 2 e 6) | Apresenta *"Atingiu o limite diário de operações"* e indica quando a quota é reposta. Se a situação for detetada no passo 2, não abre o ecrã de recorte; se for detetada no passo 6, não cria o pedido |
| O intervalo é inválido: início ≥ fim, instantes fora da duração do vídeo ou intervalo inferior ao mínimo (passo 4) | Assinala o campo em erro, mantém o botão **Iniciar recorte** desativado e não cria pedido |
| O processamento falha a meio (passos 7 a 8) | Passa o estado para **Falhou**, descarta o resultado parcial, apresenta *"Não foi possível recortar o vídeo. Tente novamente."* com a opção de repetir o pedido com os mesmos parâmetros, não contabiliza a operação na quota e mantém o original inalterado |
| O serviço de processamento está indisponível ou a fila está cheia (passo 6) | Apresenta *"O serviço está temporariamente indisponível. Tente mais tarde."*, não cria o pedido e não contabiliza a operação |
| O espaço de armazenamento do utilizador não chega para guardar o resultado (passo 9) | Passa o estado para **Falhou** com a mensagem *"Espaço de armazenamento insuficiente"*, descarta o resultado e não contabiliza a operação |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
| :-- | :-- |
| Garantia de Sucesso | Existe na biblioteca um novo vídeo cuja duração difere, no máximo, 1 segundo do intervalo escolhido, no formato escolhido; o vídeo original mantém-se inalterado; o pedido está no estado **Concluído**; foi contabilizada 1 operação na quota diária, quando aplicável |
| Garantia Mínima | O vídeo original mantém-se inalterado; não existe vídeo parcial na biblioteca; o pedido fica no estado **Falhou** ou **Cancelado** (ou não chega a existir); a quota diária não é consumida; o utilizador vê uma mensagem com a causa |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
| :-- | :-- |
| RN1 | Os formatos de vídeo aceites para recorte são MP4 e MOV. Os formatos de saída possíveis são os mesmos |
| RN2 | Limites por perfil: o Registado só pode recortar vídeos com duração ≤ 60 s e tamanho ≤ 100 MB; o Premium, duração ≤ 10 min e tamanho ≤ 1 GB. O perfil Anónimo não tem acesso a funcionalidades de vídeo |
| RN3 | O utilizador escolhe o início e o fim do recorte, com precisão de 1 segundo. O início tem de ser anterior ao fim, ambos têm de estar dentro da duração do vídeo e o recorte tem de ter pelo menos 1 segundo. Não é permitido selecionar um intervalo correspondente à duração total do vídeo |
| RN4 | Um recorte conta como 1 operação na quota diária (5/dia no perfil Registado; ilimitada no Premium), partilhada com as operações sobre imagens (A10). Uma operação só é contabilizada quando o pedido termina no estado **Concluído**; pedidos nos estados **Falhou** ou **Cancelado** não consomem quota. A disponibilidade da quota é verificada ao abrir o ecrã de recorte e novamente no momento da confirmação do pedido |
| RN5 | O recorte nunca altera o vídeo original: o resultado é sempre um novo vídeo na biblioteca, com o nome `<nome original>_recorte` (se esse nome já existir, acrescenta-se um sufixo numérico, por exemplo `<nome original>_recorte_2`). Enquanto existir um recorte em fila ou a processar, o vídeo original não pode ser eliminado. Para o eliminar, o utilizador deve primeiro cancelar o recorte em curso |
| RN6 | O pedido percorre os estados **Em fila**, **A processar**, **Concluído**, **Falhou** e **Cancelado**, sempre visíveis ao utilizador; só **Em fila** e **A processar** admitem cancelamento |
| RN7 | O perfil Registado pode ter no máximo 1 recorte em fila ou a processar; o Premium, no máximo 3 |
| RN8 | O processamento do recorte é realizado de forma assíncrona enquanto a sessão do utilizador se mantém ativa. O sistema apresenta o estado e o progresso do pedido durante o processamento |
| RN9 | Um vídeo ainda em carregamento não pode ser recortado: a opção **Recortar** fica indisponível até o carregamento terminar |
| RN10 | Os vídeos e os resultados só são acessíveis ao utilizador proprietário e ficam sujeitos às regras de privacidade (RGPD) e de armazenamento do PictuRAS |

### 2.7 Assunções

| **ID** | **Assunção** |
| :-- | :-- |
| A1 | O vídeo está integralmente armazenado e acessível ao serviço de processamento no momento do pedido |
| A2 | Os valores de RN2 (60 s/100 MB e 10 min/1 GB), o limite de recortes em simultâneo (RN7) e a precisão de 1 s (RN3) são valores razoáveis para um MVP e podem ser ajustados |
| A3 | A conversão de formato (FA4) é feita no mesmo pedido, sem custar uma operação adicional na quota |
| A4 | O recorte mantém a resolução, a taxa de fotogramas e o áudio do vídeo original, alterando apenas o intervalo temporal e, se escolhido, o formato do ficheiro |
| A5 | A notificação de conclusão é apenas dentro da aplicação |
| A6 | Existe um limite de armazenamento por utilizador, aplicável também aos vídeos e aos respetivos recortes |
| A7 | Os vídeos originais e os vídeos recortados são contabilizados no espaço de armazenamento do utilizador |
| A8 | Assume-se que, durante a utilização deste caso de uso, a sessão permanece ativa e não é considerada a expiração automática por timeout. A sessão pode terminar por ação explícita do utilizador, através do logout, situação tratada no FA6 |
| A9 | Os vídeos ficam numa biblioteca de vídeos do utilizador, nova e independente dos projetos do PictuRAS; no MVP, os vídeos não são adicionados a projetos de imagens |
| A10 | A quota diária de 5 operações do perfil Registado é partilhada entre as operações sobre imagens e as operações sobre vídeos |
| A11 | O carregamento de vídeos só aceita ficheiros MP4 ou MOV, pelo que todos os vídeos da biblioteca estão num destes formatos |

### 2.8 Questões em Aberto

| **ID** | **Questão** |
| :-- | :-- |
| Q1 | O perfil Anónimo deve poder aceder a vídeo, com limites mais apertados? |
| Q2 | O recorte deve conseguir ser encadeado com outras ferramentas (por exemplo, recortar e depois aplicar uma ferramenta a todos os fotogramas) num único pedido, ou só é possível usá-lo isoladamente no MVP? |
| Q3 | O recorte deve estar disponível no processamento em lote (vários vídeos, mesmo intervalo)? Se sim, conta como 1 operação ou como N? |
| Q4 | Faz falta pré-visualizar o resultado antes de iniciar o processamento? |
| Q5 | Um recorte que demora muito deve ser cancelado automaticamente ao fim de um tempo máximo? |
| Q6 | Devem ser preservadas legendas e faixas de áudio adicionais no resultado? |
| Q7 | Deve a operação ser reservada na quota no momento da confirmação? Com a regra atual, a operação só é contabilizada no fim: um utilizador Registado pode iniciar o pedido com 4 operações gastas, fazer uma operação sobre uma imagem enquanto o vídeo é processado e terminar o dia com 6 operações |
| Q8 | Terminar a sessão deve mesmo cancelar o recorte em curso (FA6), ou o processamento deve continuar e o resultado ficar disponível no próximo início de sessão, tal como acontece ao fechar o separador (FA2)? |
| Q9 | Como se relacionam os vídeos com os projetos existentes do PictuRAS? Deve ser possível adicionar vídeos a um projeto, ao lado das imagens, e usá-los no encadeamento de ferramentas? |

---

## 3. Utilização de agentes de IA

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
| :-- | :-- | :-- |
| Claude (claude.ai) | Discussão e exploração das minúcias e possibilidades associadas à funcionalidade de recorte de vídeo, nomeadamente comportamentos, limitações e situações excecionais | A IA foi utilizada apenas como apoio à discussão das funcionalidades. Todas as decisões sobre o caso de uso, regras, fluxos e comportamentos foram tomadas pela equipa, que também foi responsável pela redação do documento |
| Claude (claude.ai) | Revisão do caso de uso face ao template v2, aos exemplos de referência e ao documento de requisitos 2025/26: deteção de inconsistências entre fluxos, exceções e pré-condições e de lacunas de alinhamento com o sistema existente | Cada sugestão foi analisada pela equipa antes de ser incorporada. Foram acrescentadas as assunções A9 e A10 e as questões Q7 a Q9, corrigida a regra RN5 (colisão de nomes) e indicados os passos em todas as exceções |
| Claude (claude.ai) | Análise dos requisitos de sistema propostos pela equipa na secção 4 (4.1 e 4.2), com sugestões de correção e melhoria e discussão das decisões a tomar; apoio na elaboração da matriz de rastreabilidade (4.3); revisão final de todo o documento e deteção de inconsistências entre a secção 4 e o caso de uso | Os requisitos e o impacto no sistema existente foram redigidos pela equipa, e cada sugestão foi analisada e aceite, alterada ou rejeitada por esta. A matriz de rastreabilidade e o documento final foram revistos pela equipa. Entre as decisões tomadas: remoção da exceção de formato não suportado (o carregamento só aceita MP4 e MOV, A11), tolerância de ±1 segundo na duração do resultado e preservação da resolução, da taxa de fotogramas e do áudio (A4) |
---

## 4. Esboço de requisitos derivados

### 4.1 Requisitos de Sistema

| **ID** | **Requisito** | **Tipo** | **Prioridade** | **Novo/Alt** | **Origem** | **Como verificar** |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| REQ-VID-TRIM-001 | O sistema deve apresentar na biblioteca os vídeos disponíveis ao utilizador, indicando o nome, a duração e o tamanho de cada vídeo. | F | Deve ter | NOVO | Passo 1 | Dado um utilizador autenticado com vídeos na biblioteca, quando acede à biblioteca, então cada vídeo é apresentado com nome, duração e tamanho. |
| REQ-VID-TRIM-002 | O sistema deve indisponibilizar a opção Recortar enquanto o carregamento do vídeo não estiver concluído. | F | Deve ter | NOVO | Pré-condições / Passo 2 / RN9 | Dado um vídeo cujo carregamento ainda não terminou, quando o utilizador consulta as opções do vídeo, então a opção Recortar não está disponível, e passa a estar quando o carregamento termina. |
| REQ-VID-TRIM-003 | O sistema deve rejeitar o recorte de um vídeo que exceda os limites aplicáveis ao perfil do utilizador, indicar o limite relevante e, no caso de utilizadores Registados, sugerir o plano Premium. | F | Deve ter | NOVO | Passo 2 / Exceção 1 / RN2 | Dado um vídeo que excede um limite do perfil, quando o utilizador seleciona a opção Recortar, então o sistema rejeita a operação, apresenta o limite aplicável e não abre o ecrã de recorte; se o utilizador for Registado, o sistema sugere também o plano Premium. |
| REQ-VID-TRIM-004 | O sistema deve apresentar uma interface de recorte com leitor de vídeo, linha temporal, duração total e campos para definir o início e o fim do intervalo. | F | Deve ter | NOVO | Passo 3 | Dado um vídeo elegível para recorte, quando o utilizador inicia a operação, então o sistema apresenta o leitor, a linha temporal, a duração total e os campos de início e fim. |
| REQ-VID-TRIM-005 | O sistema deve apresentar como formato de saída predefinido o formato do vídeo original. | F | Deveria ter | NOVO | Passo 3 | Dado um vídeo elegível, quando o sistema apresenta a interface de recorte, então o formato de saída predefinido corresponde ao formato original. |
| REQ-VID-TRIM-006 | O sistema deve permitir definir os instantes inicial e final do recorte e apresentar a duração resultante. | F | Deve ter | NOVO | Passo 4 | Dado que a interface de recorte está apresentada, quando o utilizador define os instantes inicial e final, então o sistema apresenta a duração correspondente ao intervalo. |
| REQ-VID-TRIM-007 | O sistema deve rejeitar intervalos cujo início seja maior ou igual ao fim, que ultrapassem a duração do vídeo ou que tenham duração inferior a um segundo. | F | Deve ter | NOVO | Passo 4 / Exceção 3 / RN3 | Dado um intervalo inválido, quando o utilizador altera os instantes inicial ou final, então o sistema assinala o campo inválido e mantém o botão Iniciar recorte desativado. |
| REQ-VID-TRIM-008 | O sistema deve aceitar instantes inicial e final apenas em múltiplos inteiros de 1 segundo, não aceitando frações de segundo. | NF - Precisão | Deve ter | NOVO | Passo 4 / RN3 | Dado um vídeo elegível, quando o utilizador introduz os instantes inicial e final, então o sistema aceita valores em segundos inteiros e rejeita valores com frações de segundo. |
| REQ-VID-TRIM-009 | O sistema deve impedir o recorte quando o intervalo selecionado corresponde à duração total do vídeo e explicar o motivo. | F | Deveria ter | NOVO | FA3 / RN3 | Dado um intervalo igual à duração total do vídeo, quando o utilizador tenta iniciar o recorte, então o sistema impede a operação e informa que o resultado seria igual ao original. |
| REQ-VID-TRIM-010 | O sistema deve permitir MP4 ou MOV como formato de saída e converter o resultado quando o formato selecionado for diferente do original. | F | Deve ter | NOVO | Passo 5 / FA4 / RN1 | Dado um vídeo elegível, quando o utilizador seleciona um formato de saída diferente do original e o recorte termina, então o resultado é guardado no formato selecionado. |
| REQ-VID-TRIM-011 | O sistema deve voltar a validar os limites do vídeo, a quota diária e o número máximo de recortes simultâneos no momento da confirmação. | F | Deve ter | NOVO | Passo 6 / FA5 / Exceção 2 / RN2, RN4, RN7 | Dado que, entre a abertura do ecrã de recorte e a confirmação, a quota se esgotou (ou o utilizador atingiu o limite de simultâneos), quando o utilizador confirma, então o pedido não é criado. |
| REQ-VID-TRIM-012 | O sistema deve criar o pedido no estado Em fila quando todas as validações forem satisfeitas e permitir acompanhar os seus estados. | F | Deve ter | NOVO | Passo 6 / RN6 | Dado um pedido que cumpre todas as validações, quando o utilizador confirma o recorte, então o sistema cria o pedido no estado Em fila e disponibiliza o seu estado. |
| REQ-VID-TRIM-013 | O sistema deve executar o processamento de forma assíncrona, mantendo-o ativo quando o utilizador sai do ecrã de recorte. | F | Deve ter | NOVO | Passos 7 e 8 / FA2 / RN8 | Dado um pedido em fila ou em processamento, quando o utilizador sai do ecrã de recorte, então o processamento não é interrompido por esse motivo. |
| REQ-VID-TRIM-014 | O sistema deve apresentar a percentagem de progresso do pedido e atualizá-la pelo menos a cada 5 segundos enquanto este está a ser processado. | F | Deve ter | NOVO | Passos 7 e 8 / RN8 | Dado um pedido no estado A processar, quando decorrem 5 segundos de processamento, então o sistema atualiza a percentagem de progresso, desde que o pedido ainda não tenha terminado. |
| REQ-VID-TRIM-015 | O sistema deve permitir ao utilizador consultar a lista dos seus pedidos de recorte e o estado atual de cada pedido | F | Deve ter | NOVO | Passo 8 / FA2 / Pós-condição de sucesso / RN6 | Dado um utilizador com pedidos de recorte, quando consulta a lista de pedidos, então o sistema apresenta cada pedido e o respetivo estado atual |
| REQ-VID-TRIM-016 | O sistema deve guardar o resultado como um novo vídeo na biblioteca, no formato escolhido, com duração que difira no máximo 1 segundo do intervalo selecionado e com o conteúdo do vídeo original correspondente a esse intervalo. | F | Deve ter | NOVO | Passos 9 e 11 / Pós-condição de sucesso / RN5 | Dado um recorte concluído, quando o utilizador abre o resultado na biblioteca, então existe um novo vídeo no formato escolhido, com duração dentro da tolerância de ±1 segundo e cujo conteúdo corresponde ao intervalo recortado. |
| REQ-VID-TRIM-017 | O sistema deve manter o vídeo original inalterado durante e após o recorte. | NF - Fiabilidade / Integridade | Deve ter | NOVO | Passo 11 / FA1 e FA6 / Pós-condições de sucesso e mínima / RN5 | Dado um vídeo original e um recorte concluído ou falhado, quando o utilizador consulta o original, então o seu conteúdo permanece igual ao anterior à operação. |
| REQ-VID-TRIM-018 | O sistema deve notificar o utilizador na aplicação quando o recorte terminar com sucesso. | F | Deveria ter | NOVO | Passo 10 / A5 | Dado um recorte concluído, quando o processamento termina, então o sistema apresenta uma notificação de conclusão na aplicação. |
| REQ-VID-TRIM-019 | O sistema só deve contabilizar uma operação na quota diária quando o pedido atingir o estado Concluído. | F | Deve ter | ALT | Passo 10 / FA1 e FA6 / Pós-condições de sucesso e mínima / RN4 | Dado um pedido de recorte, quando este termina nos estados Concluído, Falhou ou Cancelado, então a quota só é consumida no caso Concluído. |
| REQ-VID-TRIM-020 | O sistema deve incluir os recortes de vídeo na quota diária global de operações do utilizador, partilhada com as operações sobre imagens, limitando o perfil Registado a cinco operações concluídas por dia e permitindo ao perfil Premium realizar operações sem limite diário. | NF - Capacidade / limites | Deve ter | ALT | RN4 / A10 | Dado um utilizador Registado ou Premium, quando tenta realizar recortes após atingir cinco operações concluídas no mesmo dia, então o Registado é limitado pela quota e o Premium não é bloqueado por esse limite. |
| REQ-VID-TRIM-021 | O sistema deve limitar a duração dos vídeos de entrada dos utilizadores Registados a 60 segundos. | NF - Capacidade / limites | Deve ter | NOVO | RN2 | Dado um utilizador Registado, quando tenta recortar um vídeo com mais de 60 segundos, então o sistema rejeita a operação. |
| REQ-VID-TRIM-022 | O sistema deve limitar o tamanho dos vídeos de entrada dos utilizadores Registados a 100 MB. | NF - Capacidade / limites | Deve ter | NOVO | RN2 | Dado um utilizador Registado, quando tenta recortar um vídeo com mais de 100 MB, então o sistema rejeita a operação. |
| REQ-VID-TRIM-023 | O sistema deve limitar a duração dos vídeos de entrada dos utilizadores Premium a 10 minutos. | NF - Capacidade / limites | Deveria ter | NOVO | RN2 | Dado um utilizador Premium, quando tenta recortar um vídeo com mais de 10 minutos, então o sistema rejeita a operação. |
| REQ-VID-TRIM-024 | O sistema deve limitar o tamanho dos vídeos de entrada dos utilizadores Premium a 1 GB. | NF - Capacidade / limites | Deveria ter | NOVO | RN2 | Dado um utilizador Premium, quando tenta recortar um vídeo com mais de 1 GB, então o sistema rejeita a operação. |
| REQ-VID-TRIM-025 | O sistema deve permitir aos utilizadores Registados ter, no máximo, um pedido de recorte em fila ou em processamento. | F | Deve ter | NOVO | FA5 / RN7 | Dado um utilizador Registado com um pedido em fila ou em processamento, quando tenta iniciar outro recorte, então o sistema rejeita o novo pedido. |
| REQ-VID-TRIM-026 | O sistema deve permitir aos utilizadores Premium ter, no máximo, três pedidos de recorte em fila ou em processamento. | F | Deveria ter | NOVO | FA5 / RN7 | Dado um utilizador Premium com três pedidos em fila ou em processamento, quando tenta iniciar outro recorte, então o sistema rejeita o novo pedido. |
| REQ-VID-TRIM-027 | O sistema deve contabilizar como ativos, para efeitos do limite de simultaneidade, apenas os pedidos nos estados Em fila ou A processar. | F | Deve ter | NOVO | FA5 / RN6, RN7 | Dado um utilizador com pedidos em diferentes estados, quando o sistema verifica o limite de simultaneidade, então conta apenas os pedidos Em fila ou A processar. |
| REQ-VID-TRIM-028 | O sistema deve informar o utilizador quando a quota diária estiver esgotada, indicar quando será reposta e impedir a continuação da operação. | F | Deveria ter | ALT | Passo 2 / Exceção 2 / RN4 | Dado que a quota diária do utilizador está esgotada, quando este seleciona um vídeo para recortar ou tenta confirmar um recorte, então o sistema informa quando a quota será reposta, não abre o ecrã de recorte no primeiro caso e não cria o pedido no segundo. |
| REQ-VID-TRIM-029 | O sistema deve permitir cancelar pedidos apenas nos estados Em fila ou A processar, alterando o estado para Cancelado e interrompendo o processamento, quando iniciado, com eliminação dos dados parciais. | F | Deve ter | NOVO | FA1 / Pós-condição mínima / RN6 | Dado um pedido Em fila ou A processar, quando o utilizador o cancela, então o pedido passa a Cancelado e, se já estava em processamento, este é interrompido e os dados parciais são eliminados. |
| REQ-VID-TRIM-030 | O sistema deve cancelar os pedidos ativos do utilizador quando este termina a sessão, interrompendo o processamento iniciado e eliminando os dados parciais. | F | Deveria ter | NOVO | FA6 / Pós-condição mínima | Dado um utilizador com um pedido Em fila ou A processar, quando termina a sessão, então o pedido passa a Cancelado e os dados parciais são eliminados, se existirem. |
| REQ-VID-TRIM-031 | O sistema deve alterar para Falhou o estado de um pedido cujo processamento não seja concluído com sucesso, eliminar os dados parciais e informar o utilizador. | F | Deve ter | NOVO | Exceções 4 e 6 / Pós-condição mínima | Dado um pedido cujo processamento falha, incluindo por falta de armazenamento, quando o sistema deteta a falha, então o pedido passa a Falhou, os dados parciais são eliminados e o utilizador é informado. |
| REQ-VID-TRIM-032 | O sistema deve informar o utilizador e não criar o pedido quando o serviço de processamento estiver indisponível ou a fila estiver cheia. | F | Deve ter | NOVO | Exceção 5 / Pós-condição mínima | Dado que o serviço está indisponível ou a fila está cheia, quando o utilizador tenta iniciar um recorte, então o sistema informa o utilizador e não cria o pedido. |
| REQ-VID-TRIM-033 | O sistema deve impedir a eliminação do vídeo original enquanto existir um pedido de recorte associado nos estados Em fila ou A processar. | F | Deve ter | NOVO | RN5 | Dado um vídeo com um pedido Em fila ou A processar, quando o utilizador tenta eliminar o original, então o sistema impede a eliminação. |
| REQ-VID-TRIM-034 | O sistema deve garantir que apenas o proprietário pode aceder aos vídeos e aos respetivos resultados de recorte. | NF - Segurança / acesso | Deve ter | NOVO | RN10 | Dado um vídeo pertencente a um utilizador, quando outro utilizador tenta aceder ao vídeo ou ao seu resultado, então o sistema recusa o acesso. |
| REQ-VID-TRIM-035 | O sistema não deve permitir que utilizadores Anónimos realizem operações de recorte. | F | Deve ter | NOVO | Pré-condições / RN2 | Dado um utilizador Anónimo, quando tenta iniciar um recorte, então o sistema recusa a operação. |

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisitos relacionados** |
| :-- | :-- | :-- | :-- |
| Perfis e permissões de utilização | Estender | Os perfis existentes passam a ter permissões e limites específicos para o recorte de vídeo. O perfil Anónimo não pode recortar vídeos. O perfil Registado mantém a quota diária de cinco operações, agora partilhada entre imagens e vídeos (A10), e o Premium mantém operações diárias ilimitadas. Passam a aplicar-se limites novos, específicos do vídeo, de duração, tamanho e pedidos simultâneos (mais restritivos para o Registado). Quando um vídeo excede os limites do perfil, a rejeição passa a sugerir o plano Premium ao utilizador Registado. | REQ-VID-TRIM-003, REQ-VID-TRIM-020 a REQ-VID-TRIM-026, REQ-VID-TRIM-035 |
| Quota diária de operações | Estender | O mecanismo de quota existente passa a contabilizar também os recortes de vídeo, partilhando o limite diário com as operações sobre imagens (A10). Cada recorte concluído consome uma operação; pedidos falhados ou cancelados não consomem quota. A quota passa a ser verificada ao abrir o ecrã de recorte e novamente ao confirmar o pedido. Se a operação deve ser reservada no momento da confirmação permanece em aberto (Q7). | REQ-VID-TRIM-011, REQ-VID-TRIM-019, REQ-VID-TRIM-020, REQ-VID-TRIM-028 |
| Gestão de ficheiros de vídeo e resultados | Estender | O sistema passa a ter uma biblioteca de vídeos do utilizador, nova e independente dos projetos de imagens (A9), onde os vídeos são listados com nome, duração e tamanho. O resultado do recorte é guardado como um novo vídeo nessa biblioteca, sem alterar o original, e a eliminação do original é impedida enquanto existir um pedido de recorte ativo associado. | REQ-VID-TRIM-001, REQ-VID-TRIM-002, REQ-VID-TRIM-016, REQ-VID-TRIM-017, REQ-VID-TRIM-033 |
| Processamento de operações e gestão de pedidos | Estender | O processamento passa a suportar pedidos de recorte de vídeo executados em segundo plano, com estados, acompanhamento do progresso, limites de simultaneidade, cancelamento e tratamento de falhas. | REQ-VID-TRIM-012 a REQ-VID-TRIM-015, REQ-VID-TRIM-025 a REQ-VID-TRIM-027, REQ-VID-TRIM-029, REQ-VID-TRIM-031, REQ-VID-TRIM-032 |
| Acompanhamento e notificações de operações | Estender | O mecanismo existente de acompanhamento do progresso passa a apresentar o estado e a percentagem de progresso dos recortes de vídeo e a notificar o utilizador quando um recorte termina com sucesso. | REQ-VID-TRIM-014, REQ-VID-TRIM-015, REQ-VID-TRIM-018 |
| Gestão de sessão | Estender | O comportamento associado ao fim da sessão passa a cancelar os pedidos de recorte que estejam em fila ou em processamento, interrompendo o processamento iniciado e eliminando os dados parciais. Se este cancelamento é o comportamento pretendido permanece em aberto (Q8). | REQ-VID-TRIM-030 |
| Exportação e formatos de saída | Estender | A geração de resultados passa a suportar ficheiros de vídeo MP4 e MOV, incluindo a conversão para o formato escolhido quando este é diferente do original. | REQ-VID-TRIM-010, REQ-VID-TRIM-016 |
| Armazenamento e controlo de acesso | Estender | Os vídeos originais e os resultantes passam a contar para o limite de espaço do utilizador (A6, A7). Se o espaço não chegar para guardar o resultado, o pedido falha e os dados parciais são eliminados. Apenas o proprietário acede aos vídeos e aos respetivos resultados. | REQ-VID-TRIM-016, REQ-VID-TRIM-031, REQ-VID-TRIM-034 |
| Interface da aplicação | Estender | A aplicação passa a ter uma biblioteca de vídeos, um ecrã de recorte (leitor, linha temporal, instantes e formato de saída) e uma lista dos pedidos de recorte. | REQ-VID-TRIM-001, REQ-VID-TRIM-004 a REQ-VID-TRIM-009, REQ-VID-TRIM-015 |
| Projetos, encadeamento de ferramentas e processamento em lote | Manter | Nesta versão, o recorte é tratado como uma operação isolada e os vídeos não são adicionados a projetos de imagens (A9). Não se introduzem alterações aos projetos, ao encadeamento de ferramentas nem ao processamento em lote; a eventual integração destas capacidades permanece em aberto. | Sem requisitos diretos nesta versão; relacionado com A9, Q2, Q3 e Q9 do caso de uso. |

### 4.3 Matriz de Rastreabilidade

| **Elemento do Caso de Uso** | **Descrição abreviada** | **Requisito(s) de Sistema** |
| :-- | :-- | :-- |
| Pré-condições | Sessão iniciada (Registado ou Premium); vídeo já carregado | REQ-VID-TRIM-002, REQ-VID-TRIM-035 |
| Passo 1 | Apresenta a lista de vídeos | REQ-VID-TRIM-001 |
| Passo 2 | Seleciona o vídeo e Recortar; sistema verifica duração, tamanho e quota | REQ-VID-TRIM-002, REQ-VID-TRIM-003, REQ-VID-TRIM-028 |
| Passo 3 | Apresenta o ecrã de recorte | REQ-VID-TRIM-004, REQ-VID-TRIM-005 |
| Passo 4 | Define os instantes; validação em tempo real | REQ-VID-TRIM-006, REQ-VID-TRIM-007, REQ-VID-TRIM-008 |
| Passo 5 | Escolhe o formato de saída | REQ-VID-TRIM-010 |
| Passo 6 | Confirma; revalidação; cria o pedido Em fila | REQ-VID-TRIM-011, REQ-VID-TRIM-012 |
| Passo 7 | Inicia o processamento; estado A processar e progresso | REQ-VID-TRIM-013, REQ-VID-TRIM-014 |
| Passo 8 | Acompanha o progresso; processamento em segundo plano | REQ-VID-TRIM-013, REQ-VID-TRIM-014, REQ-VID-TRIM-015 |
| Passo 9 | Grava o novo vídeo; estado Concluído | REQ-VID-TRIM-016 |
| Passo 10 | Contabiliza a operação; notifica a conclusão | REQ-VID-TRIM-018, REQ-VID-TRIM-019 |
| Passo 11 | Abre o resultado; original inalterado | REQ-VID-TRIM-016, REQ-VID-TRIM-017 |
| FA1 – Cancelar o processamento | Cancelamento em fila ou a processar | REQ-VID-TRIM-017, REQ-VID-TRIM-019, REQ-VID-TRIM-029 |
| FA2 – Utilizador abandona o ecrã | Processamento continua; estado visível ao regressar | REQ-VID-TRIM-013, REQ-VID-TRIM-015 |
| FA3 – Intervalo igual à duração total | Impede o recorte e explica o motivo | REQ-VID-TRIM-009 |
| FA4 – Formato de saída diferente | Conversão para o formato escolhido | REQ-VID-TRIM-010 |
| FA5 – Limite de recortes em simultâneo | Rejeita o novo pedido | REQ-VID-TRIM-011, REQ-VID-TRIM-025, REQ-VID-TRIM-026, REQ-VID-TRIM-027 |
| FA6 – Utilizador termina a sessão | Cancela os pedidos ativos | REQ-VID-TRIM-017, REQ-VID-TRIM-019, REQ-VID-TRIM-030 |
| Exceção 1 | Duração ou tamanho acima do limite do perfil | REQ-VID-TRIM-003 |
| Exceção 2 | Quota diária esgotada | REQ-VID-TRIM-011, REQ-VID-TRIM-028 |
| Exceção 3 | Intervalo inválido | REQ-VID-TRIM-007 |
| Exceção 4 | Processamento falha a meio | REQ-VID-TRIM-031 |
| Exceção 5 | Serviço indisponível ou fila cheia | REQ-VID-TRIM-032 |
| Exceção 6 | Armazenamento insuficiente | REQ-VID-TRIM-031 |
| Pós-condição de sucesso | Novo vídeo; original inalterado; pedido Concluído; 1 operação contabilizada | REQ-VID-TRIM-015, REQ-VID-TRIM-016, REQ-VID-TRIM-017, REQ-VID-TRIM-019 |
| Pós-condição mínima | Original inalterado; sem vídeo parcial; Falhou ou Cancelado; quota não consumida; mensagem com a causa | REQ-VID-TRIM-017, REQ-VID-TRIM-019, REQ-VID-TRIM-029, REQ-VID-TRIM-030, REQ-VID-TRIM-031, REQ-VID-TRIM-032 |
| RN1 | Formatos de saída MP4 e MOV | REQ-VID-TRIM-010 |
| RN2 | Limites por perfil; Anónimo sem acesso a vídeo | REQ-VID-TRIM-003, REQ-VID-TRIM-011, REQ-VID-TRIM-021, REQ-VID-TRIM-022, REQ-VID-TRIM-023, REQ-VID-TRIM-024, REQ-VID-TRIM-035 |
| RN3 | Instantes de 1 s; intervalo válido; sem intervalo total | REQ-VID-TRIM-007, REQ-VID-TRIM-008, REQ-VID-TRIM-009 |
| RN4 | Quota diária partilhada: 1 operação, só à conclusão, dupla verificação | REQ-VID-TRIM-011, REQ-VID-TRIM-019, REQ-VID-TRIM-020, REQ-VID-TRIM-028 |
| RN5 | Original nunca alterado; não eliminável com recorte ativo | REQ-VID-TRIM-016, REQ-VID-TRIM-017, REQ-VID-TRIM-033 |
| RN6 | Estados do pedido; só Em fila e A processar admitem cancelamento | REQ-VID-TRIM-012, REQ-VID-TRIM-015, REQ-VID-TRIM-027, REQ-VID-TRIM-029 |
| RN7 | Recortes em simultâneo por perfil | REQ-VID-TRIM-011, REQ-VID-TRIM-025, REQ-VID-TRIM-026, REQ-VID-TRIM-027 |
| RN8 | Processamento assíncrono; estado e progresso | REQ-VID-TRIM-013, REQ-VID-TRIM-014 |
| RN9 | Vídeo em carregamento não pode ser recortado | REQ-VID-TRIM-002 |
| RN10 | Acesso só do proprietário (RGPD) | REQ-VID-TRIM-034 |

