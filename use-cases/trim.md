# Exercícios 1 e 2 — Entrega
### Casos de Uso e Especificação de Requisitos · Fase 1: Suporte a Vídeo no PictuRAS

---

## 0. Identificação

| **Campo** | **Valor** |
| :-- | :-- |
| **Grupo / Equipa** | Grupo 5 PL1 |
| **Autores** | Eduarda Ferreira PG65368; Luana Vilaverde PG65367; Daniel Rodrigues PG63934; Lucas Pinto PG63997 |
| **Data** | 2026-10-20 |
| **Versão do documento** | v3.1 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
| :-- | :-- |
| **Funcionalidade** | Recorte temporal de vídeo (*trim*), como ferramenta de um projeto de vídeo |
| **Perfil(s) de utilizador abrangido(s)** | O perfil Anónimo fica de fora: não cria projetos de vídeo (UC-VID-004). O perfil Registado pode recortar vídeos dentro da sua quota de 5 operações por dia, partilhada com as imagens (cada recorte conta como 1 operação), o que chega para validar a funcionalidade, embora a limite. O perfil Premium, com uso ilimitado, é o mais adequado para esta funcionalidade, por não ter limite de operações. |

**Justificação no contexto do MVP**

O recorte temporal permite ao utilizador reduzir um vídeo longo ao excerto que lhe interessa, obtendo um ficheiro mais curto e fácil de partilhar. É uma das ferramentas do editor de projetos de vídeo, a par de Filtros e Legendas, e assenta no caso de uso de carregamento de vídeos (UC-VID-004): o utilizador escolhe um vídeo do projeto e o resultado volta a esse projeto. É fácil de verificar: o novo vídeo tem uma duração dentro da tolerância definida para o intervalo escolhido e o original fica inalterado. Obriga o sistema a processar o vídeo durante algum tempo, com estados e progresso, a reservar espaço para o resultado e a tratar falhas e cancelamentos sem deixar resultados a meio. Sem ela, ficaria por validar o processamento demorado de vídeo no PictuRAS.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
| :-- | :-- |
| **ID do Caso de Uso** | UC-VID-001 |
| **Nome** | Recortar um intervalo temporal de um vídeo de um projeto |
| **Versão** | v2.1 |
| **Autor** | Eduarda Ferreira; Luana Vilaverde; Daniel Rodrigues; Lucas Pinto |
| **Data** | 2026-10-20 |
| **Objetivo** | Permitir ao utilizador obter um novo vídeo, no mesmo projeto, contendo apenas o intervalo temporal que escolheu de um vídeo do projeto, acompanhando o processamento até à conclusão. |
| **Âmbito** | Ferramenta Recorte do editor de projetos de vídeo: escolha do intervalo e do formato de saída, processamento em segundo plano (para o utilizador não ficar à espera e poder acompanhar o estado do pedido), reserva de espaço, guarda do resultado no projeto e contagem de operações de cada perfil. Não inclui o carregamento, a listagem nem a visualização dos vídeos (UC-VID-004), nem as ferramentas Filtros e Legendas. |
| **Ator Principal** | Utilizador Registado (gratuito). O Utilizador Premium usa o mesmo fluxo, com limites diferentes. |
| **Stakeholders e Interesses** | **Utilizador:** quer ficar só com a parte do vídeo que interessa, saber em que ponto está o recorte e não perder o vídeo original<br>**Dono do sistema:** quer que o vídeo dê motivo para subscrever o Premium, sem gastar demasiados recursos<br>**Equipa de desenvolvimento:** quer testar que o sistema consegue processar um vídeo durante algum tempo, sem bloquear o resto da aplicação |
| **Pré-condições** | O utilizador tem sessão iniciada numa conta Registada ou Premium<br>Existe um projeto de vídeo com o vídeo selecionado já disponível para edição, ou seja, carregado, validado, guardado com miniatura e associado ao projeto (UC-VID-004, RN9) |
| **Trigger** | O utilizador seleciona, num projeto de vídeo, um vídeo pela sua miniatura e escolhe a ferramenta **Recorte** |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
| :-- | :-- | :-- |
| 1 | O utilizador seleciona um vídeo do projeto pela miniatura e escolhe a ferramenta **Recorte** | Verifica a quota diária de operações restante |
| 2 | — | Apresenta o ecrã de recorte: leitor do vídeo com a linha temporal, a duração total, os campos de instante inicial e instante final e a escolha do formato de saída (por falta de escolha, igual ao original) |
| 3 | O utilizador define o instante inicial e o instante final do intervalo | Valida em tempo real que o intervalo é válido e mostra a duração do resultado |
| 4 | O utilizador escolhe o formato de saída ou mantém o formato por omissão | — |
| 5 | O utilizador confirma a operação através de **Iniciar recorte** | Verifica novamente a quota diária disponível, o espaço de armazenamento e o número de pedidos de processamento de vídeo em simultâneo. Se todas as validações forem satisfeitas, reserva 1 operação na quota diária quando aplicável, reserva o espaço estimado do resultado (A7) e cria o pedido no estado **A aguardar** |
| 6 | — | Inicia o processamento, altera o estado do pedido para **A processar** e apresenta o progresso em percentagem |
| 7 | O utilizador acompanha o progresso (pode continuar a usar o PictuRAS noutros ecrãs) | Atualiza o progresso periodicamente e indica que o recorte continua em segundo plano se o utilizador sair do ecrã |
| 8 | — | Conclui o processamento, gera a miniatura do resultado, grava o novo vídeo no projeto, converte a reserva em espaço ocupado e passa o estado para **Concluído** |
| 9 | — | Mantém contabilizada a operação reservada no passo 5 e notifica o utilizador da conclusão |
| 10 | O utilizador seleciona o vídeo resultante pela sua miniatura | Apresenta o vídeo recortado, com duração dentro de uma tolerância de ±1 segundo relativamente ao intervalo escolhido; o vídeo original mantém-se inalterado |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
| :-- | :-- |
| FA1 – Cancelar o processamento | O utilizador seleciona **Cancelar** enquanto o pedido está **A aguardar** ou **A processar** → O sistema altera o estado do pedido para **Cancelado**. Se o processamento já tiver começado, interrompe-o e elimina qualquer resultado parcial. Liberta a reserva de espaço e devolve a operação reservada à quota. O vídeo original mantém-se inalterado |
| FA2 – Utilizador abandona o ecrã | O utilizador sai do ecrã de recorte, muda de projeto ou fecha o separador depois de iniciado o pedido → O processamento continua em segundo plano. Quando o utilizador voltar à aplicação, o estado do pedido está visível |
| FA3 – Intervalo igual à duração total | O utilizador escolhe um intervalo que corresponde à duração total do vídeo (passo 3) → O sistema informa que o resultado seria igual ao vídeo original e impede o início do recorte até ser selecionado um intervalo diferente |
| FA4 – Formato de saída diferente do original | O utilizador escolhe um formato de saída diferente do original (passo 4) → O sistema converte o resultado para o formato escolhido durante o processamento; o fluxo prossegue normalmente no passo 5 |
| FA5 – Limite de pedidos em simultâneo | O utilizador já atingiu o número máximo de pedidos de processamento de vídeo em simultâneo permitido pelo seu perfil, em qualquer ferramenta de vídeo, quando confirma (passo 5) → O sistema não cria o pedido, informa que o limite de pedidos em simultâneo foi atingido e oferece a navegação para a lista de pedidos, onde o utilizador pode acompanhar ou cancelar os pedidos em curso |
| FA6 – Utilizador termina a sessão | O utilizador termina a sessão enquanto existe um recorte **A aguardar** ou **A processar** → O sistema cancela o pedido e altera o seu estado para **Cancelado**. Se o processamento já tiver começado, interrompe-o e elimina qualquer resultado parcial. Liberta a reserva de espaço e devolve a operação reservada à quota. O vídeo original permanece inalterado. A tentativa de cancelamento nunca impede o fim da sessão: se não obtiver resposta em 5 segundos, a sessão termina na mesma |

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
| :-- | :-- |
| E1 – A quota diária de operações do perfil está esgotada (passos 1 e 5) | Apresenta *"Atingiu o limite diário de operações"* e indica quando a quota é reposta. Se a situação for detetada no passo 1, não abre o ecrã de recorte; se for detetada no passo 5, não cria o pedido |
| E2 – O intervalo é inválido: início ≥ fim, instantes fora da duração do vídeo ou intervalo inferior ao mínimo (passo 3) | Assinala o campo em erro, mantém o botão **Iniciar recorte** desativado e não cria pedido |
| E3 – O espaço livre no projeto ou na conta é inferior ao espaço estimado para o resultado (A7) (passo 5) | Não reserva espaço nem cria o pedido, apresenta *"Espaço de armazenamento insuficiente"* com o limite atingido (projeto ou conta) e não contabiliza a operação |
| E4 – O processamento falha a meio (passos 6 a 8) | Passa o estado para **Falhou**, descarta o resultado parcial, liberta a reserva de espaço, apresenta *"Não foi possível recortar o vídeo. Tente novamente."* com a opção de repetir o pedido com os mesmos parâmetros, devolve a operação reservada à quota e mantém o original inalterado |
| E5 – O serviço de processamento está indisponível ou a fila está cheia (passo 5) | Apresenta *"O serviço está temporariamente indisponível. Tente mais tarde."*, não cria o pedido, não reserva espaço e não contabiliza a operação |
| E6 – O resultado ocupa mais do que o espaço reservado e o espaço livre não chega para a diferença (passo 8) | Passa o estado para **Falhou** com a mensagem *"Espaço de armazenamento insuficiente"*, descarta o resultado, liberta a reserva de espaço e devolve a operação reservada à quota |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
| :-- | :-- |
| Garantia de Sucesso | Existe no projeto um novo vídeo, com miniatura, cuja duração difere, no máximo, 1 segundo do intervalo escolhido, no formato escolhido; o vídeo original mantém-se inalterado; o pedido está no estado **Concluído**; a reserva de espaço foi convertida em espaço ocupado; foi contabilizada 1 operação na quota diária, quando aplicável |
| Garantia Mínima | O vídeo original mantém-se inalterado; não existe vídeo parcial no projeto; o pedido fica no estado **Falhou** ou **Cancelado** (ou não chega a existir); a reserva de espaço é libertada e a operação reservada é devolvida, pelo que a quota diária não é consumida; o utilizador vê uma mensagem com a causa |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
| :-- | :-- |
| RN1 | Os formatos de vídeo suportados são MP4 e MOV, tanto de entrada (UC-VID-004, RN3) como de saída. O formato de saída por omissão é o do vídeo original |
| RN2 | Só os perfis Registado e Premium têm acesso a projetos de vídeo e, por isso, à ferramenta Recorte (UC-VID-004, RN2). Os limites de duração e de tamanho dos vídeos são os do UC-VID-004 (RN4), verificados no carregamento; o recorte não os repete |
| RN3 | O utilizador escolhe o início e o fim do recorte, com precisão de 1 segundo. O início tem de ser anterior ao fim, ambos têm de estar dentro da duração do vídeo e o recorte tem de ter pelo menos 1 segundo. Não é permitido selecionar um intervalo correspondente à duração total do vídeo |
| RN4 | Um recorte conta como 1 operação na quota diária (5/dia no perfil Registado; ilimitada no Premium), partilhada com as operações sobre imagens (A10). A operação é reservada quando o pedido é criado (passo 5) e devolvida se o pedido terminar em **Falhou** ou **Cancelado**; só os pedidos **Concluído** consomem quota. A reserva impede ultrapassar o limite diário com pedidos em curso (Q7). A disponibilidade da quota é verificada ao selecionar o vídeo para recortar e novamente no momento da confirmação do pedido. O carregamento e a visualização de vídeos não consomem operações (UC-VID-004, RN12) |
| RN5 | O recorte nunca altera o vídeo original: o resultado é sempre um novo vídeo no mesmo projeto, com o nome `<nome original>_recorte` (se esse nome já existir, acrescenta-se um sufixo numérico, por exemplo `<nome original>_recorte_2`). O resultado é tratado como qualquer vídeo do projeto: tem miniatura (UC-VID-004, RN8), só fica disponível para edição depois de guardado e associado ao projeto (UC-VID-004, RN9) e conta para o espaço do projeto e da conta (UC-VID-004, RN7). Enquanto existir um recorte **A aguardar** ou **A processar**, o vídeo original, ou o projeto que o contém, não pode ser eliminado; para o eliminar, o utilizador deve primeiro cancelar o recorte em curso |
| RN6 | O pedido percorre os estados **A aguardar**, **A processar**, **Concluído**, **Falhou** e **Cancelado**, sempre visíveis ao utilizador; só **A aguardar** e **A processar** admitem cancelamento |
| RN7 | O perfil Registado pode ter no máximo 1 pedido de processamento de vídeo a aguardar ou a processar; o Premium, no máximo 3. O limite é global à conta, partilhado pelas ferramentas Recorte, Filtros e Legendas (A13), e independente dos carregamentos simultâneos (UC-VID-004, RN10) |
| RN8 | O processamento do recorte é realizado de forma assíncrona enquanto a sessão do utilizador se mantém ativa. O sistema apresenta o estado e o progresso do pedido durante o processamento |
| RN9 | A ferramenta Recorte só é oferecida para vídeos disponíveis para edição, ou seja, recebidos, validados, guardados com miniatura e associados ao projeto (UC-VID-004, RN9). Um vídeo ainda em carregamento não pode ser recortado |
| RN10 | Os pedidos de recorte e os respetivos resultados só são acessíveis ao utilizador proprietário do vídeo. O acesso aos vídeos, miniaturas e projetos é regulado pelo UC-VID-004 (RN2) e fica sujeito às regras de privacidade (RGPD) e de armazenamento do PictuRAS |

### 2.7 Assunções

| **ID** | **Assunção** |
| :-- | :-- |
| A1 | O vídeo está integralmente armazenado e acessível ao serviço de processamento no momento do pedido |
| A2 | Os valores de RN3 (precisão de 1 s) e de RN7 (limite de pedidos de processamento em simultâneo) e a tolerância de ±1 s na duração do resultado são razoáveis para um MVP |
| A3 | A conversão de formato (FA4) é feita no mesmo pedido, sem custar uma operação adicional na quota |
| A4 | O recorte mantém a resolução, a taxa de fotogramas e o áudio do vídeo original, alterando apenas o intervalo temporal e, se escolhido, o formato do ficheiro |
| A5 | A notificação de conclusão é apenas dentro da aplicação |
| A6 | O armazenamento do projeto e da conta e a sua contabilização seguem o UC-VID-004 (RN5 a RN7). O resultado do recorte conta para ambos |
| A7 | O espaço a reservar para o resultado é estimado pelo tamanho do vídeo original multiplicado pela fração da duração que o intervalo representa e por uma margem de 1,5, nunca superior ao tamanho do original. A margem cobre as diferenças de tamanho que a conversão de formato (MP4 e MOV) possa causar. Ao concluir, a reserva converte-se no tamanho real do resultado e o excedente é libertado. Se o resultado exceder a reserva e o espaço livre não chegar para a diferença, o pedido falha por falta de espaço (E6) |
| A8 | Assume-se que, durante a utilização deste caso de uso, a sessão permanece ativa e não é considerada a expiração automática por timeout. A sessão pode terminar por ação explícita do utilizador, através do logout, situação tratada no FA6 |
| A9 | Os vídeos estão organizados em projetos de vídeo (UC-VID-004, A6). O vídeo recortado é guardado no mesmo projeto do vídeo original |
| A10 | A quota diária de 5 operações do perfil Registado é partilhada entre as operações sobre imagens e as operações sobre vídeos |
| A11 | Todos os vídeos de um projeto de vídeo estão em MP4 ou MOV e dentro dos limites do perfil, verificados no carregamento (UC-VID-004, RN3 e RN4). O recorte não repete estas verificações |
| A12 | A reprodução depende dos codecs suportados pelo navegador (UC-VID-004, A7). Assume-se que o resultado do recorte mantém os codecs do original, pelo que é reproduzível nos mesmos navegadores |
| A13 | O limite de pedidos de processamento de vídeo em simultâneo é global à conta e partilhado pelas ferramentas Recorte, Filtros e Legendas, e independente dos carregamentos (UC-VID-004, RN10 e Q7). Confirmado nos casos de uso das outras ferramentas (UC-VID-002, RN7; UC-VID-003, RN11) |
| A14 | A interface é apresentada em inglês; as mensagens e os nomes de botões, ferramentas, filtros e estados indicados neste documento são o seu equivalente em português. |

### 2.8 Questões em Aberto

| **ID** | **Questão** |
| :-- | :-- |
| Q2 | O recorte deve conseguir ser encadeado com outras ferramentas de vídeo (por exemplo, recortar e depois aplicar um filtro) num único pedido, ou só é possível usá-lo isoladamente no MVP? |
| Q3 | O recorte deve estar disponível no processamento em lote (vários vídeos do mesmo projeto, mesmo intervalo)? Se sim, conta como 1 operação ou como N? |
| Q4 | Faz falta pré-visualizar o resultado antes de iniciar o processamento? |
| Q5 | Um recorte que demora muito deve ser cancelado automaticamente ao fim de um tempo máximo? |
| Q6 | Devem ser preservadas legendas e faixas de áudio adicionais no resultado? |
| Q7 | Deve a operação ser reservada na quota no momento da confirmação? Com a regra anterior, a operação só é contabilizada no fim: um utilizador Registado pode iniciar o pedido com 4 operações gastas, fazer uma operação sobre uma imagem enquanto o vídeo é processado e terminar o dia com 6 operações. **Decidida:** a operação é reservada ao criar o pedido e devolvida em Falhou ou Cancelado (RN4), como nos Filtros e nas Legendas |
| Q8 | Terminar a sessão deve mesmo cancelar o recorte em curso (FA6), ou o processamento deve continuar e o resultado ficar disponível no próximo início de sessão, tal como acontece ao fechar o separador (FA2)? **Decidida:** terminar a sessão cancela os pedidos ativos (FA6), como nos Filtros (UC-VID-002, FA5) e nas Legendas (UC-VID-003, FA6). |
| Q11 | A estimativa da reserva de espaço (A7: proporcional ao intervalo, com margem de 1,5) é adequada, sobretudo quando há conversão de formato? Como contabilizar o espaço da miniatura do resultado (UC-VID-004, Q1 e Q7)? |
| Q12 | Como se elimina, move ou renomeia um vídeo ou um projeto de vídeo, e como isso interage com um recorte em curso (UC-VID-004, Q6)? |
| Q13 | Que codecs de reprodução são garantidos no MVP e deve existir uma cópia de reprodução compatível (UC-VID-004, Q5)? Condiciona o critério do REQ-VID-TRIM-042 |

---

## 3. Utilização de agentes de IA

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
| :-- | :-- | :-- |
| Claude (claude.ai) | Discussão e exploração das minúcias e possibilidades associadas à funcionalidade de recorte de vídeo, nomeadamente comportamentos, limitações e situações excecionais | A IA foi utilizada apenas como apoio à discussão das funcionalidades. Todas as decisões sobre o caso de uso, regras, fluxos e comportamentos foram tomadas pela equipa, que também foi responsável pela redação do documento |
| Claude (claude.ai) | Revisão do caso de uso face ao template v2, aos exemplos de referência e ao documento de requisitos 2025/26: deteção de inconsistências entre fluxos, exceções e pré-condições e de lacunas de alinhamento com o sistema existente | Cada sugestão foi analisada pela equipa antes de ser incorporada. Foram acrescentadas as assunções A9 e A10 e as questões Q7 a Q9, corrigida a regra RN5 (colisão de nomes) e indicados os passos em todas as exceções |
| Claude (claude.ai) | Análise dos requisitos de sistema propostos pela equipa na secção 4 (4.1 e 4.2), com sugestões de correção e melhoria e discussão das decisões a tomar; apoio na elaboração da matriz de rastreabilidade (4.3); revisão final de todo o documento, incluindo a integração das duas versões, e deteção de inconsistências entre a secção 4 e o caso de uso | Os requisitos e o impacto no sistema existente foram redigidos pela equipa, e cada sugestão foi analisada e aceite, alterada ou rejeitada por esta. A matriz de rastreabilidade e o documento final foram revistos pela equipa. Entre as decisões tomadas: remoção da exceção de formato não suportado (o carregamento só aceita MP4 e MOV, A11), tolerância de ±1 segundo na duração do resultado e preservação da resolução, da taxa de fotogramas e do áudio (A4) |
| Claude (claude.ai) | **Exercício 2 (ERS):**<br>1. Análise e discussão dos requisitos a manter, remover ou corrigir (atomicidade, verificabilidade e vocabulário)<br>2. Verificação da conformidade com a ISO/IEC 25010 e identificação dos requisitos não funcionais em falta, a partir do ficheiro de instruções do Exercício 2 e da nova estrutura (alvos MVP e produção, completude e decisões de qualidade)<br>3. Apoio na reestruturação do documento para a nova estrutura<br>4. Análise do caso de uso de upload (UC-VID-004) e apoio na integração, que levou a retirar e alterar requisitos, regras, assunções e questões | **Cada etapa foi validada pela equipa, em detalhe e de forma crítica:**<br>1. As propostas sobre cada requisito foram analisadas uma a uma e aceites, alteradas ou rejeitadas<br>2. As classificações ISO/IEC 25010, os alvos MVP e produção e as decisões de qualidade foram discutidos; os valores numéricos são pontos de partida a calibrar e a DQ-003 ficou provisória<br>3. A reestruturação foi verificada com a matriz de rastreabilidade, sem requisitos órfãos nem elementos do caso de uso por cobrir<br>4. A integração com o UC-VID-004 foi revista pela equipa e os pontos por alinhar com os colegas ficaram identificados |

---

## 4. Especificação de Requisitos do Sistema (ERS)



**Caso de Uso:** UC-VID-001 — Recortar um intervalo temporal de um vídeo de um projeto  
**Versão do dossiê:** v3.1  
**Baseline do Exercício 1:** dossiê v2.4 (UC-VID-001 v1.4); requisitos derivados REQ-VID-TRIM-001 a REQ-VID-TRIM-035

### 4.1 Requisitos da ERS

#### 4.1.1 Requisitos Funcionais

| **ID** | **Requisito** | **Prioridade** | **Evolução** | **Novo/Alt** | **Origem (UC / RN / decisão)** | **Justificação** | **Critério de aceitação / verificação** |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| REQ-VID-TRIM-004 | O sistema deve apresentar uma interface de recorte com leitor de vídeo, linha temporal, duração total e campos para definir o início e o fim do intervalo. | Deve ter | Mantido | NOVO | UC-VID-001: Passo 2 | Dá ao utilizador os meios para escolher o excerto que quer manter. | Dado um vídeo elegível para recorte, quando o utilizador inicia a operação, então o sistema apresenta o leitor, a linha temporal, a duração total e os campos de início e fim. |
| REQ-VID-TRIM-005 | O sistema deve permitir ao utilizador escolher MP4 ou MOV como formato de saída, sendo o formato do vídeo original o predefinido. | Deve ter | Refinado | NOVO | UC-VID-001: Passos 2 e 4, RN1 | O formato do original é a escolha menos surpreendente; MP4 e MOV são os formatos suportados (RN1). | Dado um vídeo elegível, quando o sistema apresenta o ecrã de recorte, então o formato de saída selecionado por omissão é o do vídeo original e o utilizador pode escolher entre MP4 e MOV. |
| REQ-VID-TRIM-006 | O sistema deve apresentar a duração do intervalo selecionado sempre que o instante inicial ou final é alterado. | Deve ter | Refinado | NOVO | UC-VID-001: Passo 3 | O utilizador precisa de saber quanto durará o resultado antes de confirmar. | Dado que o ecrã de recorte está apresentado, quando o utilizador altera o instante inicial ou final, então a duração apresentada corresponde à diferença entre os dois instantes. |
| REQ-VID-TRIM-007 | O sistema deve rejeitar intervalos cujo início seja maior ou igual ao fim, que ultrapassem a duração do vídeo ou que tenham duração inferior a um segundo. | Deve ter | Mantido | NOVO | UC-VID-001: Passo 3, E2, RN3 | Evita pedidos que não produzem um resultado válido (RN3). | Dado um intervalo inválido, quando o utilizador altera os instantes inicial ou final, então o sistema assinala o campo inválido e mantém o botão Iniciar recorte desativado. |
| REQ-VID-TRIM-008 | O sistema deve aceitar instantes inicial e final apenas em múltiplos inteiros de 1 segundo, não aceitando frações de segundo. | Deve ter | Mantido | NOVO | UC-VID-001: Passo 3, RN3, A2 | Define a granularidade de escolha do intervalo e simplifica a validação (RN3). | Dado um vídeo elegível, quando o utilizador introduz os instantes inicial e final, então o sistema aceita valores em segundos inteiros e rejeita valores com frações de segundo. |
| REQ-VID-TRIM-009 | O sistema deve impedir o recorte quando o intervalo selecionado corresponde à duração total do vídeo e explicar o motivo. | Deveria ter | Mantido | NOVO | UC-VID-001: FA3, RN3 | Um recorte igual ao vídeo inteiro não produz um vídeo diferente e desperdiçaria processamento e quota. | Dado um intervalo igual à duração total do vídeo, quando o utilizador tenta iniciar o recorte, então o sistema impede a operação e informa que o resultado seria igual ao original. |
| REQ-VID-TRIM-010 | O sistema deve converter o resultado para o formato de saída escolhido quando este for diferente do formato do vídeo original. | Deve ter | Refinado | NOVO | UC-VID-001: Passo 4, FA4, RN1, A3 | Permite obter o resultado no formato pretendido sem custar uma operação adicional (A3). | Dado um vídeo num dos formatos suportados e o outro formato escolhido como saída, quando o recorte termina, então o resultado é guardado no formato escolhido. |
| REQ-VID-TRIM-011 | O sistema deve voltar a validar a quota diária, o espaço de armazenamento disponível e o número máximo de pedidos de processamento de vídeo em simultâneo no momento da confirmação. | Deve ter | Refinado | NOVO | UC-VID-001: Passo 5, FA5, E1, E3, RN4, RN7, A13 | Garante que contam a quota, o espaço e a simultaneidade do momento da confirmação, e não os de quando o ecrã foi aberto. | Dado que, entre a abertura do ecrã de recorte e a confirmação, a quota se esgotou, o espaço disponível deixou de chegar ou o utilizador atingiu o limite de pedidos de processamento em simultâneo, quando o utilizador confirma, então o pedido não é criado. |
| REQ-VID-TRIM-012 | O sistema deve criar o pedido no estado A aguardar quando todas as validações forem satisfeitas e permitir acompanhar os seus estados. | Deve ter | Refinado | NOVO | UC-VID-001: Passo 5, RN6 | O pedido entra num estado inicial conhecido, a partir do qual o seu ciclo de vida é acompanhado. | Dado um pedido que cumpre todas as validações, quando o utilizador confirma o recorte, então o sistema cria o pedido no estado A aguardar e disponibiliza o seu estado. |
| REQ-VID-TRIM-015 | O sistema deve permitir ao utilizador consultar a lista dos seus pedidos de recorte e o estado atual de cada pedido. | Deve ter | Mantido | NOVO | UC-VID-001: Passo 7, FA2, Pós-condição de sucesso, RN6 | O processamento não é instantâneo; o utilizador precisa de poder acompanhar os seus pedidos. | Dado um utilizador com pedidos de recorte, quando consulta a lista de pedidos, então o sistema apresenta cada pedido e o respetivo estado atual. |
| REQ-VID-TRIM-016 | O sistema deve guardar o resultado do recorte como um novo vídeo no projeto do vídeo original, com duração que difira no máximo 1 segundo do intervalo selecionado e com o conteúdo do vídeo original correspondente a esse intervalo. | Deve ter | Refinado | NOVO | UC-VID-001: Passos 8 e 10, Pós-condição de sucesso, RN5, A2, A9; DQ-003 | É o resultado que o utilizador procura; guardá-lo no mesmo projeto mantém o trabalho junto. | Dado um recorte concluído, quando o utilizador abre o projeto do vídeo original, então existe nesse projeto um novo vídeo, com duração dentro da tolerância de ±1 segundo e cujo conteúdo corresponde ao intervalo recortado. |
| REQ-VID-TRIM-018 | O sistema deve notificar o utilizador na aplicação quando o recorte terminar com sucesso. | Deveria ter | Mantido | NOVO | UC-VID-001: Passo 9, A5 | Evita que o utilizador tenha de verificar manualmente se o recorte terminou (A5). | Dado um recorte concluído, quando o processamento termina, então o sistema apresenta uma notificação de conclusão na aplicação. |
| REQ-VID-TRIM-019 | O sistema deve reservar 1 operação na quota diária ao criar o pedido de recorte e devolvê-la quando o pedido terminar em Falhou ou Cancelado. | Deve ter | Refinado | ALT | UC-VID-001: Passos 5 e 9, FA1, FA6, E4, E6, Pós-condições de sucesso e mínima, RN4, A3, Q7 | Só um recorte bem-sucedido deve custar uma operação ao utilizador, e a reserva impede ultrapassar o limite diário com pedidos em curso (RN4). | Dado um Registado com 4 operações gastas, quando confirma um recorte, então a quota passa a 5 e uma nova operação sobre imagem é recusada; se o pedido terminar em Concluído, a quota mantém-se em 5; se falhar ou for cancelado, volta a 4. |
| REQ-VID-TRIM-020 | O sistema deve incluir os recortes de vídeo na quota diária de operações do utilizador, partilhada com as operações sobre imagens. | Deve ter | Refinado | ALT | UC-VID-001: RN4, A10 | O recorte passa a integrar o modelo de perfis e de quota existente (RN4, A10). | Dado um utilizador Registado com quatro operações concluídas no dia, quando um recorte termina no estado Concluído, então a quota fica esgotada (cinco operações) e o sistema recusa nova operação, de imagem ou de vídeo, nesse dia; um utilizador Premium não é bloqueado por este limite. |
| REQ-VID-TRIM-025 | O sistema deve rejeitar um novo pedido de recorte quando o utilizador Registado já tiver um pedido de processamento de vídeo A aguardar ou A processar. | Deve ter | Refinado | NOVO | UC-VID-001: FA5, RN7, A2, A13 | Evita que um perfil gratuito ocupe o processamento com vários pedidos (RN7). | Dado um utilizador Registado com um pedido de processamento de vídeo A aguardar ou A processar, quando tenta iniciar outro recorte, então o sistema rejeita o novo pedido. |
| REQ-VID-TRIM-026 | O sistema deve rejeitar um novo pedido de recorte quando o utilizador Premium já tiver três pedidos de processamento de vídeo A aguardar ou A processar. | Deveria ter | Refinado | NOVO | UC-VID-001: FA5, RN7, A2, A13 | Limita a carga de processamento por utilizador Premium (RN7). | Dado um utilizador Premium com três pedidos de processamento de vídeo A aguardar ou A processar, quando tenta iniciar outro recorte, então o sistema rejeita o novo pedido. |
| REQ-VID-TRIM-028 | O sistema deve impedir o recorte quando a quota diária estiver esgotada, apresentando a mensagem «Atingiu o limite diário de operações» e indicando quando a quota é reposta. | Deve ter | Refinado | ALT | UC-VID-001: Passo 1, E1, RN4 | Dá ao utilizador a causa do bloqueio e quando pode voltar a usar a funcionalidade (RN4). | Dado que a quota diária do utilizador está esgotada, quando este seleciona um vídeo para recortar ou tenta confirmar um recorte, então o sistema apresenta «Atingiu o limite diário de operações» e indica quando a quota é reposta, não abre o ecrã de recorte no primeiro caso e não cria o pedido no segundo. |
| REQ-VID-TRIM-029 | O sistema deve permitir ao utilizador cancelar um pedido nos estados A aguardar ou A processar, passando-o para o estado Cancelado e interrompendo o processamento, quando já iniciado. | Deve ter | Refinado | NOVO | UC-VID-001: FA1, Pós-condição mínima, RN6 | O utilizador deve poder desistir de um pedido que já não lhe interessa (FA1). | Dado um pedido A aguardar ou A processar, quando o utilizador o cancela, então o pedido passa a Cancelado e, se já estava em processamento, este é interrompido; um pedido Concluído, Falhou ou Cancelado não oferece a opção de cancelar. |
| REQ-VID-TRIM-030 | O sistema deve cancelar os pedidos do utilizador nos estados A aguardar ou A processar quando este termina a sessão, interrompendo o processamento iniciado. | Deve ter | Refinado | NOVO | UC-VID-001: FA6, Pós-condição mínima, A8 | Evita pedidos órfãos quando o utilizador termina a sessão (FA6). | Dado um utilizador com um pedido A aguardar ou A processar, quando termina a sessão, então o pedido passa a Cancelado e o processamento, se já iniciado, é interrompido. |
| REQ-VID-TRIM-031 | O sistema deve passar para Falhou o estado de um pedido cujo processamento não termine com sucesso e apresentar a mensagem «Não foi possível recortar o vídeo. Tente novamente.» ou, se a causa for falta de espaço de armazenamento, «Espaço de armazenamento insuficiente». | Deve ter | Refinado | NOVO | UC-VID-001: E4, E6, Pós-condição mínima; DQ-002 | O utilizador precisa de saber que o recorte falhou e porquê (E4 e E6). | Dado um pedido cujo processamento falha, quando o sistema deteta a falha, então o pedido passa a Falhou e é apresentada «Não foi possível recortar o vídeo. Tente novamente.»; se a falha for por falta de armazenamento, é apresentada «Espaço de armazenamento insuficiente». |
| REQ-VID-TRIM-032 | O sistema deve apresentar a mensagem «O serviço está temporariamente indisponível. Tente mais tarde.» e não criar o pedido quando o serviço de processamento estiver indisponível ou a fila estiver cheia. | Deve ter | Refinado | NOVO | UC-VID-001: E5, Pós-condição mínima | Evita criar pedidos que o sistema não consegue processar (E5). | Dado que o serviço está indisponível ou a fila está cheia, quando o utilizador tenta iniciar um recorte, então o sistema apresenta «O serviço está temporariamente indisponível. Tente mais tarde.» e não cria o pedido. |
| REQ-VID-TRIM-033 | O sistema deve impedir a eliminação do vídeo original, ou do projeto que o contém, enquanto existir um pedido de recorte associado nos estados A aguardar ou A processar. | Deve ter | Refinado | NOVO | UC-VID-001: RN5; DQ-003 | Impede perder o vídeo, ou o projeto, sobre o qual existe um recorte em curso (RN5). | Dado um vídeo com um pedido A aguardar ou A processar, quando o utilizador tenta eliminar o vídeo original ou o projeto que o contém, então o sistema impede a eliminação. |
| REQ-VID-TRIM-036 | O sistema deve gerar a miniatura do resultado do recorte e só o disponibilizar para edição depois de guardado, com miniatura, e associado ao projeto do vídeo original. | Deve ter | Novo | NOVO | UC-VID-001: Passo 8, Pós-condição de sucesso, RN5; UC-VID-004: RN8, RN9 | O resultado é tratado como qualquer vídeo do projeto: tem miniatura e só fica disponível depois de associado (UC-VID-004, RN8 e RN9). | Dado um recorte concluído, quando o utilizador abre o projeto, então o vídeo resultante aparece com miniatura e pode ser selecionado; enquanto o pedido não está Concluído, o resultado não está disponível para edição. |
| REQ-VID-TRIM-040 | O sistema deve reservar, ao criar o pedido de recorte, no projeto e na conta, o espaço estimado para o resultado, proporcional à duração do intervalo selecionado (A7), e, se o espaço livre não chegar, rejeitar o pedido com a mensagem «Espaço de armazenamento insuficiente», indicando o limite atingido. | Deve ter | Novo | NOVO | UC-VID-001: Passo 5, E3, A6, A7; UC-VID-004: RN7 | Evita aceitar um recorte cujo resultado não cabe no projeto ou na conta, em linha com a reserva de espaço do carregamento (UC-VID-004, RN7). A reserva proporcional ao intervalo evita bloquear espaço desnecessário. | Dado um vídeo de 60 s e 20 MB, um intervalo de 10 s e espaço livre suficiente, quando o utilizador confirma o recorte, então o espaço reservado do projeto e da conta aumenta 5 MB (20 MB × 10/60 × 1,5); dado espaço livre inferior a 5 MB, quando confirma, então o pedido não é criado e é apresentada «Espaço de armazenamento insuficiente», com o limite atingido (projeto ou conta). |
| REQ-VID-TRIM-041 | O sistema deve indicar ao utilizador, enquanto o pedido está A aguardar ou A processar, que o recorte continua em segundo plano se sair do ecrã. | Deveria ter | Novo | NOVO | UC-VID-001: Passo 7, FA2 | Torna explícita a diferença face ao carregamento, em que sair do ecrã pode cancelar o envio (UC-VID-004, FA4), para o utilizador não interromper o processo por receio. | Dado um pedido A aguardar ou A processar, quando o utilizador observa o ecrã de progresso, então é apresentada a indicação de que pode sair do ecrã sem interromper o recorte. |

<!--
**IDs retirados face ao Exercício 1** (nunca serão reutilizados):
- REQ-VID-TRIM-001: listagem de vídeos na biblioteca, que deixa de existir; a listagem dos vídeos do projeto é do UC-VID-004.
- REQ-VID-TRIM-002: disponibilidade do vídeo para edição, coberta pelo UC-VID-004 (REQ-VID-UPLOAD-029).
- REQ-VID-TRIM-003 e REQ-VID-TRIM-021 a REQ-VID-TRIM-024: limites de duração e tamanho por perfil, definidos e verificados no carregamento (UC-VID-004, REQ-VID-UPLOAD-012 e REQ-VID-UPLOAD-013).
- REQ-VID-TRIM-027: redundante com REQ-VID-TRIM-025 e REQ-VID-TRIM-026, que já indicam os estados a aguardar e a processar.
- REQ-VID-TRIM-035: acesso reservado a Registado e Premium, coberto pelo UC-VID-004 (REQ-VID-UPLOAD-009).
-->

#### 4.1.2 Requisitos Não Funcionais e de Qualidade

| **ID** | **Requisito** | **Característica ISO/IEC 25010** | **Alvo MVP** | **Alvo produção** | **Evolução** | **Origem (UC / DQ)** | **Critério de aceitação / verificação** |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| REQ-VID-TRIM-013 | O sistema deve executar o processamento de forma assíncrona, mantendo-o ativo quando o utilizador sai do ecrã de recorte. | Eficiência de Desempenho / Usabilidade | Obrigatório | Obrigatório (igual: sem isto, o MVP bloquearia o utilizador durante o processamento) | Mantido | UC-VID-001: Passos 6 e 7, FA2, RN8, A8 | Dado um pedido a aguardar ou a processar, quando o utilizador sai do ecrã de recorte, então o processamento não é interrompido por esse motivo. |
| REQ-VID-TRIM-014 | O sistema deve apresentar a percentagem de progresso do pedido e atualizá-la pelo menos a cada 5 segundos enquanto este está a ser processado. | Usabilidade | ≤ 5 s entre atualizações | ≤ 2 s entre atualizações | Refinado | UC-VID-001: Passos 6 e 7, RN8; DQ-001 | Dado um pedido no estado A processar, quando decorrem 5 segundos de processamento, então o sistema atualiza a percentagem de progresso, desde que o pedido ainda não tenha terminado. |
| REQ-VID-TRIM-017 | O sistema deve manter o vídeo original inalterado durante e após o recorte. | Fiabilidade | Obrigatório: original inalterado após pedidos Concluídos, Falhados e Cancelados | Obrigatório (igual: a integridade do original não é negociável) | Mantido | UC-VID-001: Passo 10, FA1, FA6, Pós-condições de sucesso e mínima, RN5 | Dado um vídeo original e um recorte concluído, falhado ou cancelado, quando o utilizador consulta o original, então o seu conteúdo permanece igual ao anterior à operação. |
| REQ-VID-TRIM-034 | O sistema deve permitir o acesso aos pedidos de recorte e aos respetivos resultados apenas ao proprietário do vídeo. | Segurança | Obrigatório | Obrigatório (igual: o controlo de acesso não é negociável no MVP) | Refinado | UC-VID-001: RN10 | Dado um pedido de recorte de um utilizador, quando outro utilizador tenta consultá-lo, cancelá-lo ou aceder ao seu resultado, então o sistema recusa o acesso. |
| REQ-VID-TRIM-037 | O sistema deve eliminar os dados parciais e libertar a reserva de espaço de um pedido que termine nos estados Falhou ou Cancelado. | Fiabilidade | Obrigatório: sem retoma; o pedido passa a Falhou ou Cancelado, sem dados parciais e sem reserva de espaço | Obrigatório, com retoma automática de falhas transitórias antes de o pedido passar a Falhou | Novo | UC-VID-001: FA1, FA6, E4, E6, Pós-condição mínima; UC-VID-004: RN7; DQ-002 | Dado um pedido que termina em Falhou ou Cancelado, quando o utilizador consulta o projeto e o espaço ocupado, então não existe nenhum vídeo nem ficheiro parcial desse pedido e a reserva de espaço foi libertada. |
| REQ-VID-TRIM-038 | O sistema deve confirmar a criação do pedido de recorte, apresentando o estado A aguardar, em menos de 3 segundos após a confirmação do utilizador, independentemente da duração do vídeo. | Eficiência de Desempenho | < 3 s | < 1 s | Novo | UC-VID-001: Passo 5; DQ-004 | Dado um vídeo curto e um vídeo no limite de tamanho do perfil, quando o utilizador confirma o recorte, então o estado A aguardar é apresentado em menos de 3 s nos dois casos (10 medições por vídeo, todas abaixo do alvo). |
| REQ-VID-TRIM-039 | O sistema deve concluir o processamento de um recorte num tempo não superior à duração do intervalo selecionado. | Eficiência de Desempenho | ≤ 1 × a duração do intervalo (tempo real) | ≤ 0,2 × a duração do intervalo (5 × mais rápido que o tempo real) | Novo | UC-VID-001: Passos 6 e 8; DQ-004 | Dado um recorte de 30 s de um vídeo de 60 s e 100 MB (limites do perfil Registado), com e sem conversão de formato, quando o pedido passa a A processar, então atinge o estado Concluído em não mais de 30 s. |
| REQ-VID-TRIM-042 | O sistema deve produzir resultados de recorte reproduzíveis nos mesmos navegadores em que o vídeo original é reproduzível. | Compatibilidade | Verificado nos navegadores usados pela equipa nos testes (por exemplo, Chrome e Safari) | Todos os navegadores suportados pelo PictuRAS (qualitativo: a lista é definida na Fase 2) | Novo | UC-VID-001: Passo 10, RN1, A12; DQ-005 | Dado um vídeo original que reproduz num navegador de referência, quando o recorte termina, então o resultado também reproduz nesse navegador, com a imagem e o som do intervalo e sem erros. |
| REQ-VID-TRIM-043 | O sistema deve preservar, no resultado do recorte, a resolução, a taxa de fotogramas e o áudio do vídeo original. | Adequação Funcional | Obrigatório (áudio principal) | Obrigatório, incluindo faixas de áudio adicionais e legendas (Q6) | Novo | UC-VID-001: A4 | Dado um vídeo com uma resolução, uma taxa de fotogramas e áudio conhecidos, quando o recorte termina, então o resultado tem a mesma resolução e taxa de fotogramas e contém o áudio do intervalo. |
| REQ-VID-TRIM-044 | A adição de uma nova ferramenta de edição de vídeo, como legendas ou filtros, não deve exigir alterações ao código do recorte. | Manutenibilidade | Objetivo | Obrigatório | Novo | DQ-006 | Demonstração com uma segunda ferramenta de vídeo (legendas ou filtros) adicionada sem alterar o código do recorte. |
| REQ-VID-TRIM-045 | O serviço de recorte deve poder ser implantado sem instalação manual de software adicional no ambiente de destino. | Portabilidade | Obrigatório (implantação documentada e repetível) | Obrigatório, verificado em dois ambientes de execução distintos | Novo | DQ-006 | Dado um ambiente de execução limpo, quando o serviço é implantado seguindo o procedimento documentado, então o recorte funciona sem instalação manual de software adicional. |
| REQ-VID-TRIM-046 | O sistema deve terminar a sessão mesmo que o cancelamento dos pedidos ativos falhe ou não responda em 5 segundos. | Usabilidade | ≤ 5 s | ≤ 2 s | Novo | UC-VID-001: FA6 | Dado o serviço de vídeos sem resposta, quando o utilizador faz logout, então a sessão termina em no máximo 5 segundos. |

#### 4.1.3 Verificação da completude e dos limites do âmbito

| **Tópico a verificar** | **Aplicável?** | **Decisão / justificação** | **Requisito(s) relacionado(s)** |
| :-- | :-- | :-- | :-- |
| Formato, codec, duração e dimensão do vídeo | Sim (parcial) | O formato de entrada, os limites de duração e tamanho e a validação do conteúdo são do UC-VID-004 (RN3 e RN4; REQ-VID-UPLOAD-011 a REQ-VID-UPLOAD-013) e o recorte não os repete (A11). O recorte produz MP4 ou MOV (RN1), preserva a resolução, a taxa de fotogramas e o áudio (A4) e produz resultados reproduzíveis nos mesmos navegadores que o original (A12). Os codecs garantidos ficam por definir (Q13). | REQ-VID-TRIM-005, REQ-VID-TRIM-010, REQ-VID-TRIM-042, REQ-VID-TRIM-043 |
| Estado, progresso, cancelamento e resultado | Sim | Estados A aguardar, A processar, Concluído, Falhou e Cancelado sempre visíveis (RN6), progresso em percentagem, cancelamento manual e ao terminar a sessão, e resultado guardado como novo vídeo do projeto, com miniatura e com o original inalterado. A confirmação do pedido e o processamento têm alvos de tempo (DQ-004). | REQ-VID-TRIM-012 a REQ-VID-TRIM-020, REQ-VID-TRIM-029, REQ-VID-TRIM-030, REQ-VID-TRIM-036, REQ-VID-TRIM-038, REQ-VID-TRIM-039, REQ-VID-TRIM-041, REQ-VID-TRIM-046 |
| Falhas durante o processamento | Sim | Uma falha leva o pedido a Falhou, com mensagem da causa, sem dados parciais, sem reserva de espaço e sem consumir quota. No MVP não há retoma nem repetição automática (DQ-002). Se o serviço estiver indisponível ou a fila cheia, o pedido não é criado. | REQ-VID-TRIM-019, REQ-VID-TRIM-031, REQ-VID-TRIM-032, REQ-VID-TRIM-037 |
| Persistência e expiração dos ficheiros | Sim (persistência); Não (expiração) | O resultado fica guardado no projeto do vídeo original, com miniatura, e conta para o espaço do projeto e da conta (UC-VID-004, RN7 e RN8). O espaço do resultado é reservado ao criar o pedido (estimativa proporcional ao intervalo, A7) e libertado se falhar ou for cancelado. O original não pode ser eliminado com um recorte ativo. Não há expiração automática no MVP: os ficheiros permanecem até o utilizador os eliminar (DQ-003). O acesso aos pedidos e resultados é restrito ao proprietário. | REQ-VID-TRIM-016, REQ-VID-TRIM-033, REQ-VID-TRIM-034, REQ-VID-TRIM-036, REQ-VID-TRIM-037, REQ-VID-TRIM-040 |
| Perfis e contagem de operações | Sim | O acesso a vídeo para Registado e Premium e os limites de duração e tamanho são do UC-VID-004 (RN2 e RN4). O recorte consome uma operação da quota diária partilhada com as imagens, reservada ao criar o pedido e devolvida se falhar ou for cancelado, e tem um limite de pedidos de processamento de vídeo em simultâneo por perfil, global à conta e partilhado pelas ferramentas de vídeo (RN7 e A13). | REQ-VID-TRIM-011, REQ-VID-TRIM-019, REQ-VID-TRIM-020, REQ-VID-TRIM-025, REQ-VID-TRIM-026, REQ-VID-TRIM-028 |
| Encadeamento de ferramentas e processamento em lote | Não (exclusão explícita) | No MVP o recorte é uma operação isolada: não é encadeável com outras ferramentas nem aplicável em lote (Q2 e Q3; o UC-VID-004 também exclui o processamento em lote, RN14). Não há alterações a estes mecanismos existentes. | N/A |

### 4.2 Impacto no sistema existente

A coluna **Elemento da baseline** indica o elemento do documento de requisitos de base (doc-ext-requisitos.pdf, PictuRAS 2025/26) afetado; R*n* são as restrições do projeto desse documento (secção 4).

| **Elemento existente afetado** | **Elemento da baseline** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisito(s) relacionado(s)** |
| :-- | :-- | :-- | :-- | :-- |
| Perfis e permissões de utilização | Perfis de utilização (secção 3.1) | Estender | O acesso a vídeo e os limites de duração e tamanho por perfil são definidos no UC-VID-004. O perfil Registado mantém a quota diária de cinco operações, agora partilhada entre imagens e vídeos (A10), e o Premium mantém operações diárias ilimitadas. Passa a haver um limite de pedidos de processamento de vídeo em simultâneo por perfil, global à conta e partilhado pelas ferramentas de vídeo, mais restritivo para o Registado (A13). | REQ-VID-TRIM-020, REQ-VID-TRIM-025, REQ-VID-TRIM-026 |
| Quota diária de operações | Perfil Registado com operações diárias limitadas (secção 3.1); RNF48 (exibir limite diário de operações) | Estender | O mecanismo de quota existente passa a contabilizar também os recortes de vídeo, partilhando o limite diário com as operações sobre imagens (A10). A operação é reservada ao criar o pedido e devolvida se este falhar ou for cancelado, pelo que só os recortes concluídos consomem quota. A quota passa a ser verificada ao selecionar o vídeo para recortar e novamente ao confirmar o pedido. | REQ-VID-TRIM-011, REQ-VID-TRIM-019, REQ-VID-TRIM-020, REQ-VID-TRIM-028 |
| Editor do projeto de vídeo | Nenhum: o editor de vídeo é novo (UC-VID-004); o equivalente para imagens é o UC04 | Estender | A ferramenta Recorte passa a fazer parte do catálogo de ferramentas do editor de projetos de vídeo (UC-VID-004, REQ-VID-UPLOAD-033), com um ecrã próprio (leitor, linha temporal, instantes e formato de saída) e uma lista dos pedidos de recorte. | REQ-VID-TRIM-004 a REQ-VID-TRIM-009, REQ-VID-TRIM-015 |
| Projetos de vídeo e gestão de vídeos | Entidade Projeto do modelo de domínio (Figura 1) | Estender | O resultado do recorte é guardado como um novo vídeo no mesmo projeto de vídeo do original (A9), com miniatura e associado ao projeto antes de ficar disponível para edição. O original não é alterado e nem ele nem o projeto podem ser eliminados enquanto existir um pedido de recorte ativo. Não há expiração automática dos ficheiros no MVP (DQ-003). | REQ-VID-TRIM-016, REQ-VID-TRIM-033, REQ-VID-TRIM-036 |
| Armazenamento e controlo de acesso | R2 (limite de armazenamento por utilizador); RNF45; RNF44 (segurança e privacidade dos dados) | Estender | Os resultados passam a contar para o espaço do projeto e da conta (UC-VID-004, RN5 a RN7). O espaço estimado do resultado (proporcional ao intervalo, A7) é reservado ao criar o pedido, rejeitando-o se não chegar, e libertado se o pedido falhar ou for cancelado; os dados parciais são eliminados. Apenas o proprietário acede aos pedidos e aos resultados. | REQ-VID-TRIM-016, REQ-VID-TRIM-031, REQ-VID-TRIM-034, REQ-VID-TRIM-037, REQ-VID-TRIM-040 |
| Processamento de operações e gestão de pedidos | R5 (controlo de tarefas em fila) | Estender | O processamento passa a suportar pedidos de recorte de vídeo executados em segundo plano, com estados, acompanhamento do progresso, limites de simultaneidade, cancelamento, tratamento de falhas e eliminação dos dados parciais. No MVP não há retoma automática (DQ-002) e aplicam-se alvos de tempo de resposta e de processamento (DQ-004). | REQ-VID-TRIM-012 a REQ-VID-TRIM-015, REQ-VID-TRIM-025, REQ-VID-TRIM-026, REQ-VID-TRIM-029, REQ-VID-TRIM-031, REQ-VID-TRIM-032, REQ-VID-TRIM-037 a REQ-VID-TRIM-039 |
| Acompanhamento e notificações de operações | Nenhum elemento identificado no documento de base | Estender | O mecanismo existente de acompanhamento do progresso passa a apresentar o estado e a percentagem de progresso dos recortes de vídeo, com atualização frequente (DQ-001), a indicar que o recorte continua em segundo plano se o utilizador sair do ecrã, e a notificar o utilizador quando um recorte termina com sucesso. | REQ-VID-TRIM-014, REQ-VID-TRIM-015, REQ-VID-TRIM-018, REQ-VID-TRIM-041 |
| Gestão de sessão | Caso de uso Login (Figura 2; sem ID no documento de base) | Estender | O comportamento associado ao fim da sessão passa a cancelar os pedidos de recorte que estejam a aguardar ou a processar, interrompendo o processamento iniciado e libertando a reserva de espaço. O cancelamento nunca impede o fim da sessão por mais de 5 segundos. É o mesmo comportamento dos Filtros e das Legendas (Q8). | REQ-VID-TRIM-030, REQ-VID-TRIM-046 |
| Exportação e formatos de saída | R4 (compatibilidade com navegadores modernos) | Estender | A geração de resultados passa a suportar ficheiros de vídeo MP4 e MOV, incluindo a conversão para o formato escolhido quando este é diferente do original. Os resultados preservam a resolução, a taxa de fotogramas e o áudio do original e são reproduzíveis nos mesmos navegadores. | REQ-VID-TRIM-005, REQ-VID-TRIM-010, REQ-VID-TRIM-042, REQ-VID-TRIM-043 |
| Modelo de ferramentas de processamento | Entidade Ferramenta, Básica e Avançada, do modelo de domínio (Figura 1) | Estender | O mecanismo de ferramentas existente passa a acolher o recorte como ferramenta de vídeo. A adição de novas ferramentas de vídeo, como legendas ou filtros, não deve exigir alterações ao recorte. | REQ-VID-TRIM-044 |
| Implantação e execução dos serviços | R7 (compatibilidade com a arquitetura base) | Estender | O serviço de recorte passa a fazer parte do que é implantado e executado, incluindo as dependências externas de processamento de vídeo, sem instalação manual de software adicional. | REQ-VID-TRIM-045 |
| Encadeamento de ferramentas e processamento em lote | Caso de uso Aplicar encadeamento de ferramentas a conjunto de imagens (Figura 2; sem ID no documento de base) | Manter | Nesta versão, o recorte é tratado como uma operação isolada. Não se introduzem alterações ao encadeamento de ferramentas nem ao processamento em lote; a eventual integração destas capacidades permanece em aberto (Q2 e Q3). | Sem requisitos diretos nesta versão; relacionado com Q2 e Q3 do caso de uso. |

### 4.3 Matriz de Rastreabilidade Atualizada

| **Elemento de origem** | **Descrição abreviada** | **Requisito(s) relacionado(s)** |
| :-- | :-- | :-- |
| Pré-condições | Sessão de Registado ou Premium; vídeo disponível para edição. Sem requisito neste caso de uso: coberto por UC-VID-004 (REQ-VID-UPLOAD-009 e REQ-VID-UPLOAD-029) | — |
| Trigger | Seleciona um vídeo pela miniatura e a ferramenta Recorte. Sem requisito neste caso de uso: coberto por UC-VID-004 (REQ-VID-UPLOAD-030 e REQ-VID-UPLOAD-033) | — |
| Passo 1 | Seleciona o vídeo e Recorte; sistema verifica a quota | REQ-VID-TRIM-028 |
| Passo 2 | Apresenta o ecrã de recorte | REQ-VID-TRIM-004, REQ-VID-TRIM-005 |
| Passo 3 | Define os instantes; validação em tempo real | REQ-VID-TRIM-006, REQ-VID-TRIM-007, REQ-VID-TRIM-008 |
| Passo 4 | Escolhe o formato de saída | REQ-VID-TRIM-005, REQ-VID-TRIM-010 |
| Passo 5 | Confirma; revalidação; reserva da operação e do espaço; cria o pedido A aguardar | REQ-VID-TRIM-011, REQ-VID-TRIM-012, REQ-VID-TRIM-019, REQ-VID-TRIM-038, REQ-VID-TRIM-040 |
| Passo 6 | Inicia o processamento; estado A processar e progresso | REQ-VID-TRIM-013, REQ-VID-TRIM-014, REQ-VID-TRIM-039 |
| Passo 7 | Acompanha o progresso; processamento em segundo plano | REQ-VID-TRIM-013, REQ-VID-TRIM-014, REQ-VID-TRIM-015, REQ-VID-TRIM-041 |
| Passo 8 | Conclui; miniatura; grava no projeto; estado Concluído | REQ-VID-TRIM-016, REQ-VID-TRIM-036, REQ-VID-TRIM-039 |
| Passo 9 | Contabiliza a operação; notifica a conclusão | REQ-VID-TRIM-018, REQ-VID-TRIM-019 |
| Passo 10 | Seleciona o resultado; original inalterado | REQ-VID-TRIM-016, REQ-VID-TRIM-017, REQ-VID-TRIM-042 |
| FA1 – Cancelar o processamento | Cancelamento A aguardar ou A processar; reserva libertada | REQ-VID-TRIM-017, REQ-VID-TRIM-019, REQ-VID-TRIM-029, REQ-VID-TRIM-037 |
| FA2 – Utilizador abandona o ecrã | Processamento continua; estado visível ao regressar | REQ-VID-TRIM-013, REQ-VID-TRIM-015, REQ-VID-TRIM-041 |
| FA3 – Intervalo igual à duração total | Impede o recorte e explica o motivo | REQ-VID-TRIM-009 |
| FA4 – Formato de saída diferente | Conversão para o formato escolhido | REQ-VID-TRIM-010 |
| FA5 – Limite de pedidos em simultâneo | Rejeita o novo pedido | REQ-VID-TRIM-011, REQ-VID-TRIM-025, REQ-VID-TRIM-026 |
| FA6 – Utilizador termina a sessão | Cancela os pedidos ativos; reserva libertada | REQ-VID-TRIM-017, REQ-VID-TRIM-019, REQ-VID-TRIM-030, REQ-VID-TRIM-037, REQ-VID-TRIM-046 |
| E1 – Quota diária esgotada | Mensagem e reposição; não abre o ecrã ou não cria o pedido | REQ-VID-TRIM-011, REQ-VID-TRIM-028 |
| E2 – Intervalo inválido | Assinala o campo; botão desativado | REQ-VID-TRIM-007 |
| E3 – Espaço insuficiente na confirmação | Não cria o pedido; indica o limite atingido | REQ-VID-TRIM-011, REQ-VID-TRIM-040 |
| E4 – Processamento falha a meio | Falhou; mensagem; dados parciais e reserva libertados | REQ-VID-TRIM-031, REQ-VID-TRIM-037 |
| E5 – Serviço indisponível ou fila cheia | Mensagem; não cria o pedido | REQ-VID-TRIM-032 |
| E6 – Falha de armazenamento ao gravar | Falhou; mensagem de espaço insuficiente | REQ-VID-TRIM-031, REQ-VID-TRIM-037 |
| Pós-condição de sucesso | Novo vídeo com miniatura no projeto; original inalterado; Concluído; 1 operação contabilizada | REQ-VID-TRIM-015, REQ-VID-TRIM-016, REQ-VID-TRIM-017, REQ-VID-TRIM-019, REQ-VID-TRIM-036 |
| Pós-condição mínima | Original inalterado; sem dados parciais; Falhou ou Cancelado; sem reserva nem quota consumidas; mensagem com a causa | REQ-VID-TRIM-017, REQ-VID-TRIM-019, REQ-VID-TRIM-029, REQ-VID-TRIM-030, REQ-VID-TRIM-031, REQ-VID-TRIM-032, REQ-VID-TRIM-037 |
| RN1 | Formatos MP4 e MOV de entrada e de saída | REQ-VID-TRIM-005, REQ-VID-TRIM-010, REQ-VID-TRIM-042 |
| RN2 | Acesso e limites por perfil. Sem requisito neste caso de uso: coberto por UC-VID-004 (REQ-VID-UPLOAD-009, 012 e 013) | — |
| RN3 | Instantes de 1 s; intervalo válido; sem intervalo total | REQ-VID-TRIM-007, REQ-VID-TRIM-008, REQ-VID-TRIM-009 |
| RN4 | Quota diária partilhada: 1 operação reservada ao criar o pedido e devolvida em falha ou cancelamento, dupla verificação | REQ-VID-TRIM-011, REQ-VID-TRIM-019, REQ-VID-TRIM-020, REQ-VID-TRIM-028 |
| RN5 | Resultado como novo vídeo do projeto, com miniatura; original intacto e não eliminável com recorte ativo | REQ-VID-TRIM-016, REQ-VID-TRIM-017, REQ-VID-TRIM-033, REQ-VID-TRIM-036 |
| RN6 | Estados do pedido; só A aguardar e A processar admitem cancelamento | REQ-VID-TRIM-012, REQ-VID-TRIM-015, REQ-VID-TRIM-029 |
| RN7 | Pedidos de processamento de vídeo em simultâneo por perfil, globais à conta | REQ-VID-TRIM-011, REQ-VID-TRIM-025, REQ-VID-TRIM-026 |
| RN8 | Processamento assíncrono; estado e progresso | REQ-VID-TRIM-013, REQ-VID-TRIM-014 |
| RN9 | Vídeo só recortável depois de disponível para edição. Sem requisito neste caso de uso: coberto por UC-VID-004 (REQ-VID-UPLOAD-029) | — |
| RN10 | Pedidos e resultados só do proprietário (RGPD) | REQ-VID-TRIM-034 |
| A1 | Assunção: vídeo integralmente armazenado e acessível ao serviço. Sem requisito: condição assumida do ambiente | — |
| A2 | Assunção: valores de RN3, RN7 e tolerância de ±1 s razoáveis para um MVP | REQ-VID-TRIM-008, REQ-VID-TRIM-016, REQ-VID-TRIM-025, REQ-VID-TRIM-026 |
| A3 | Assunção: a conversão de formato não custa operação adicional | REQ-VID-TRIM-010, REQ-VID-TRIM-019 |
| A4 | Assunção: o recorte mantém resolução, taxa de fotogramas e áudio do original | REQ-VID-TRIM-043 |
| A5 | Assunção: notificação de conclusão apenas dentro da aplicação | REQ-VID-TRIM-018 |
| A6 | Assunção: armazenamento do projeto e da conta segundo UC-VID-004 (RN5 a RN7) | REQ-VID-TRIM-040 |
| A7 | Assunção: reserva proporcional ao intervalo, com margem, limitada ao tamanho do original | REQ-VID-TRIM-040 |
| A8 | Assunção: sessão ativa sem expiração por timeout; fim de sessão só por logout | REQ-VID-TRIM-013, REQ-VID-TRIM-030 |
| A9 | Assunção: resultado no mesmo projeto de vídeo do original | REQ-VID-TRIM-016 |
| A10 | Assunção: quota diária partilhada entre imagens e vídeos | REQ-VID-TRIM-020 |
| A11 | Assunção: vídeos já validados no carregamento. Sem requisito neste caso de uso: coberto por UC-VID-004 (REQ-VID-UPLOAD-011 a 013) | — |
| A12 | Assunção: o resultado mantém os codecs do original | REQ-VID-TRIM-042 |
| A13 | Assunção: limite de pedidos de processamento de vídeo em simultâneo global à conta | REQ-VID-TRIM-011, REQ-VID-TRIM-025, REQ-VID-TRIM-026 |
| A14 | Interface em inglês. Delimitação da apresentação; não origina um requisito autónomo | — |
| UC-VID-004 – RN7 | Reserva e ocupação de espaço, incluindo resultados editados | REQ-VID-TRIM-037, REQ-VID-TRIM-040 |
| UC-VID-004 – RN8 | Miniatura automática de cada vídeo | REQ-VID-TRIM-036 |
| UC-VID-004 – RN9 | Vídeo só disponível depois de guardado, com miniatura, e associado ao projeto | REQ-VID-TRIM-036 |
| DQ-001 | Intervalo máximo de atualização do progresso | REQ-VID-TRIM-014 |
| DQ-002 | Sem retoma automática no MVP; falha leva a Falhou | REQ-VID-TRIM-031, REQ-VID-TRIM-037 |
| DQ-003 | Sem expiração automática de vídeos e resultados no MVP | REQ-VID-TRIM-016, REQ-VID-TRIM-033 |
| DQ-004 | Alvos de desempenho: confirmação do pedido e tempo de processamento | REQ-VID-TRIM-038, REQ-VID-TRIM-039 |
| DQ-005 | Compatibilidade de reprodução dos resultados | REQ-VID-TRIM-042 |
| DQ-006 | Ferramentas de vídeo independentes e implantação sem passos manuais | REQ-VID-TRIM-044, REQ-VID-TRIM-045 |

**Decisões de qualidade**

| **ID** | **Decisão de qualidade** | **Justificação** | **Requisito(s) relacionado(s)** |
| :-- | :-- | :-- | :-- |
| DQ-001 | O progresso do pedido é atualizado com um intervalo máximo de 5 s no MVP e de 2 s em produção. | O caso de uso só diz que o progresso é atualizado periodicamente. Um recorte pode demorar segundos ou minutos, e 5 s é exequível na Fase 1. | REQ-VID-TRIM-014 |
| DQ-002 | No MVP não há retoma nem repetição automática: uma falha leva o pedido a Falhou. Em produção, as falhas transitórias seriam retomadas automaticamente antes de o pedido passar a Falhou. | A Fase 1 valida o fluxo funcional; a retoma automática é uma melhoria natural para a Fase 2. | REQ-VID-TRIM-031, REQ-VID-TRIM-037 |
| DQ-003 | No MVP não há expiração automática de vídeos e resultados: ficam no projeto até o utilizador os eliminar. | Os casos de uso não definem prazos de retenção (o UC-VID-004 também não); manter os ficheiros evita perder trabalho e simplifica o MVP. Os limites de espaço seguem o UC-VID-004 (RN5 a RN7). Decisão provisória. | REQ-VID-TRIM-016, REQ-VID-TRIM-033 |
| DQ-004 | Alvos de desempenho: confirmação do pedido em menos de 3 s no MVP e de 1 s em produção; processamento em não mais do que a duração do intervalo no MVP e em 20 % dessa duração em produção. A capacidade global de pedidos em simultâneo fica fora do MVP. | O MVP valida a funcionalidade, por isso os alvos são moderados; os de produção servem de referência para a Fase 2. A confirmação não depende da duração do vídeo porque o processamento é assíncrono (REQ-VID-TRIM-013). A capacidade global não é verificável numa só máquina e o limite de pedidos em simultâneo por conta (RN7) já a limita. | REQ-VID-TRIM-038, REQ-VID-TRIM-039 |
| DQ-005 | Os resultados reproduzem nos mesmos navegadores que o original: no MVP, verificado nos navegadores usados pela equipa (por exemplo, Chrome e Safari); em produção, em todos os navegadores suportados. | A reprodução depende dos codecs suportados pelo navegador (UC-VID-004, A7); a paridade com o original é um critério objetivo e independente do navegador escolhido. | REQ-VID-TRIM-042 |
| DQ-006 | As ferramentas de vídeo são independentes entre si (objetivo no MVP, obrigatório em produção) e o serviço de recorte é implantado sem instalação manual de dependências (obrigatório no MVP). | O projeto prevê várias ferramentas de vídeo (recorte, legendas e filtros), e o processamento depende de software externo que tem de ser isolado e instalável de forma repetível. | REQ-VID-TRIM-044, REQ-VID-TRIM-045 |
