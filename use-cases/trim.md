#  Exercício 1 - Entrega
### Casos de Uso · Fase 1: Suporte a Vídeo no PictuRAS


## 0. Identificação

| **Campo**               | **Valor**                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **Grupo / Equipa**      | (preencher)                                                                                      |
| **Autores**             | Eduarda Ferreira PG65368; Luana Vilaverde PG65367; Daniel Rodrigues PG63934; Lucas Pinto PG63997 |
| **Data**                | 2026-10-05                                                                                       |
| **Versão do documento** | v1.0                                                                                             |
| **Unidade Curricular**  | Requisitos e Arquiteturas de Software, MEI, Universidade do Minho                               |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
|-----------|-----------|
| **Funcionalidade** | Recorte temporal de vídeo (*trim*) |
| **Perfil(s) de utilizador abrangido(s)** | O perfil Anónimo fica de fora: o PictuRAS só lhe permite operações básicas sobre imagens pequenas, e o vídeo, por serem ficheiros grandes de processamento demorado, exige uma conta com limites controlados. O perfil Registado pode recortar vídeos dentro da sua quota de 5 operações por dia (cada recorte conta como 1 operação), o que chega para validar a funcionalidade, embora a limite. O perfil Premium, com uso ilimitado, é o mais adequado para esta funcionalidade, por não ter limite de operações.|

**Justificação no contexto do MVP**
O recorte temporal permite ao utilizador reduzir um vídeo longo ao excerto que lhe interessa, obtendo um ficheiro mais curto e fácil de partilhar. É uma das operações mais básicas sobre vídeo e é fácil de verificar: o novo vídeo dura exatamente o intervalo escolhido e o original fica inalterado. Obriga o sistema a processar o vídeo durante algum tempo, com estados e progresso e a tratar falhas e cancelamentos sem deixar resultados a meio. Sem ela, ficaria por validar o processamento demorado de vídeo no PictuRAS.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-001 |
| **Nome** | Recortar um intervalo temporal de um vídeo |
| **Versão** | v1.0 |
| **Autor** | Eduarda Ferreira; Luana Vilaverde; Daniel Rodrigues; Lucas Pinto |
| **Data** | 2026-10-05 |
| **Objetivo** | Permitir ao utilizador obter um novo vídeo contendo apenas o intervalo temporal que escolheu de um vídeo já existente na sua biblioteca, acompanhando o processamento até à conclusão. |
| **Âmbito** | Módulo de vídeo do PictuRAS: a biblioteca de vídeos, o recorte em si (que corre em segundo plano, para o utilizador não ficar à espera e poder acompanhar o estado do pedido) e a contagem de operações de cada perfil.|
| **Ator Principal** | Utilizador Registado (gratuito). O Utilizador Premium usa o mesmo fluxo, com limites diferentes. |
| **Stakeholders e Interesses** | **Utilizador:** quer ficar só com a parte do vídeo que interessa, saber em que ponto está o recorte e não perder o vídeo original <br>**Dono do sistema:** quer que o vídeo dê motivo para subscrever o Premium, sem gastar demasiados recursos <br>**Equipa de desenvolvimento:** quer testar que o sistema consegue processar um vídeo durante algum tempo, sem bloquear o resto da aplicação |
| **Pré-condições** | O utilizador tem sessão iniciada (Registado ou Premium)<br>O vídeo já está na biblioteca e o carregamento terminou |
| **Trigger** | O utilizador seleciona um vídeo da biblioteca e escolhe a opção **Recortar** |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | O utilizador abre a biblioteca de vídeos | Apresenta a lista de vídeos do utilizador, com nome, duração e tamanho |
| 2 | O utilizador seleciona um vídeo e escolhe **Recortar** | Verifica o formato, a duração e o tamanho do vídeo face aos limites do perfil e a quota diária restante |
| 3 |  | Apresenta o ecrã de recorte: leitor do vídeo com a linha temporal, a duração total, os campos de instante inicial e instante final e a escolha do formato de saída (por falta de escolha, igual ao original) |
| 4 | O utilizador define o instante inicial e o instante final do intervalo | Valida em tempo real que o intervalo é válido e mostra a duração do resultado |
| 5 | O utilizador escolhe o formato de saída ou mantém o formato por omissão | |
| 6 | O utilizador confirma com Iniciar recorte | Verifica novamente os limites, a quota e o número máximo de recortes em simultâneo. Se estiver tudo válido, cria o pedido de processamento e apresenta o estado Em fila |
| 7 |  | Inicia o processamento e passa o estado para **A processar**, com indicação de progresso em percentagem |
| 8 | O utilizador acompanha o progresso (pode continuar a usar o PictuRAS noutros ecrãs) | Atualiza o progresso periodicamente |
| 9 |  | Conclui o processamento, grava o novo vídeo na biblioteca e passa o estado para **Concluído** |
| 10 |  | Contabiliza 1 operação na quota diária do perfil e notifica o utilizador da conclusão |
| 11 | O utilizador abre o vídeo resultante na biblioteca | Apresenta o vídeo recortado, com duração igual ao intervalo escolhido; o vídeo original mantém-se inalterado |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| FA1 – Cancelar o processamento | O utilizador seleciona **Cancelar** enquanto o pedido está **Em fila** ou **A processar** → O sistema interrompe o processamento, descarta qualquer resultado parcial, passa o estado para **Cancelado**, não contabiliza a operação na quota e mantém o vídeo original inalterado |
| FA2 – Utilizador abandona o ecrã | O utilizador sai do ecrã de recorte, fecha o separador depois de iniciado o pedido → O processamento continua em segundo plano. Quando o utilizador voltar à aplicação, o estado do pedido está visível |
| FA3 – Intervalo igual à duração total | O utilizador escolhe um intervalo que corresponde à duração total do vídeo (passo 4) → O sistema informa que o resultado seria igual ao vídeo original e impede o início do recorte até ser selecionado um intervalo diferente |
| FA4 – Formato de saída diferente do original | O utilizador escolhe um formato de saída diferente do original (passo 5) → O sistema converte o resultado para o formato escolhido durante o processamento; o fluxo prossegue normalmente no passo 6 |
| FA5 – Limite de recortes em simultâneo | O utilizador já atingiu o número máximo de recortes em simultâneo permitido pelo seu perfil quando confirma (passo 6) → O sistema não cria o pedido, informa que o limite de recortes em simultâneo foi atingido e oferece a navegação para a lista de pedidos, onde o utilizador pode acompanhar ou cancelar os recortes em curso |
| FA6 – Utilizador termina a sessão | O utilizador termina a sessão enquanto existe um recorte Em fila ou A processar → O sistema cancela o pedido de recorte, interrompe o processamento caso este já tenha iniciado, elimina qualquer resultado parcial e marca o pedido como Cancelado. O vídeo original permanece inalterado e a operação não é contabilizada na quota |

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| O formato do vídeo não é suportado para recorte (passo 2) | Apresenta *"Este formato de vídeo não é suportado para recorte"*, indica os formatos aceites e não abre o ecrã de recorte |
| A duração ou o tamanho do vídeo excedem o limite do perfil (passo 2) | Apresenta uma mensagem com o limite do perfil atual e sugere o plano Premium se o utilizador for Registado; não abre o ecrã de recorte |
| A quota diária de operações do perfil está esgotada (passos 2 e 6) | Apresenta *"Atingiu o limite diário de operações"*, indica quando a quota é reposta e não cria o pedido |
| O intervalo é inválido: início ≥ fim, instantes fora da duração do vídeo ou intervalo inferior ao mínimo (passo 4) | Assinala o campo em erro, mantém o botão **Iniciar recorte** desativado e não cria pedido |
| O processamento falha a meio (passos 7 a 8) | Passa o estado para **Falhou**, descarta o resultado parcial, apresenta *"Não foi possível recortar o vídeo. Tente novamente."* com a opção de repetir o pedido com os mesmos parâmetros, não contabiliza a operação na quota e mantém o original inalterado |
| O serviço de processamento está indisponível ou a fila está cheia (passo 6) | Apresenta *"O serviço está temporariamente indisponível. Tente mais tarde."*, não cria o pedido e não contabiliza a operação |
| O espaço de armazenamento do utilizador não chega para guardar o resultado (passo 9) | Passa o estado para **Falhou** com a mensagem *"Espaço de armazenamento insuficiente"*, descarta o resultado e não contabiliza a operação |


### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| Garantia de Sucesso | Existe na biblioteca um novo vídeo cuja duração corresponde ao intervalo escolhido, no formato escolhido; o vídeo original mantém-se inalterado; o pedido está no estado **Concluído**; foi contabilizada 1 operação na quota diária, quando aplicável |
| Garantia Mínima | O vídeo original mantém-se inalterado; não existe vídeo parcial na biblioteca; o pedido fica no estado **Falhou** ou **Cancelado** (ou não chega a existir); a quota diária não é consumida; o utilizador vê uma mensagem com a causa |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| RN1 | Os formatos de vídeo aceites para recorte são MP4 e MOV. Os formatos de saída possíveis são os mesmos |
| RN2 | Limites por perfil: o Registado só pode recortar vídeos com duração ≤ 60 s e tamanho ≤ 100 MB; o Premium, duração ≤ 10 min e tamanho ≤ 1 GB. O perfil Anónimo não tem acesso a funcionalidades de vídeo |
| RN3 | O utilizador escolhe o início e o fim do recorte, com precisão de 1 segundo. O início tem de ser anterior ao fim, ambos têm de estar dentro da duração do vídeo e o recorte tem de ter pelo menos 1 segundo. |
| RN4 | Um recorte conta como 1 operação na quota diária (5/dia no perfil Registado; ilimitada no Premium). A operação só é contabilizada quando o pedido termina em **Concluído**; falhas e cancelamentos não consomem quota. A quota é verificada ao abrir o ecrã de recorte e ao confirmar |
| RN5 | O recorte nunca altera o vídeo original: o resultado é sempre um novo vídeo na biblioteca, com o nome `<nome original>_recorte` (se esse nome já existir, acrescenta-se um sufixo numérico, por exemplo `<nome original>_recorte_2`). Enquanto existir um recorte em fila ou a processar, o vídeo original não pode ser eliminado. Para o eliminar, o utilizador deve primeiro cancelar o recorte em curso. |
| RN6 | O pedido percorre os estados **Em fila**, **A processar**, **Concluído**, **Falhou** e **Cancelado**, sempre visíveis ao utilizador; só **Em fila** e **A processar** admitem cancelamento |
| RN7 | O perfil Registado pode ter no máximo 1 recorte em fila ou a processar; o Premium, no máximo 3 |
| RN8 | O processamento do recorte é realizado de forma assíncrona enquanto a sessão do utilizador se mantém ativa. O sistema apresenta o estado e o progresso do pedido durante o processamento |
| RN9 | Um vídeo ainda em carregamento não pode ser recortado: a opção **Recortar** fica indisponível até o carregamento terminar |
| RN10 | Os vídeos e os resultados só são acessíveis ao utilizador proprietário e ficam sujeitos às regras de privacidade (RGPD) e de armazenamento do PictuRAS |

### 2.7 Assunções

| **ID** | **Assunção** |
|--------|--------------|
| A1 | O vídeo está integralmente armazenado e acessível ao serviço de processamento no momento do pedido |
| A2 | Os valores de RN2 (60 s/100 MB e 10 min/1 GB), o limite de recortes em simultâneo (RN7) e a precisão de 1 s (RN3) são valores razoáveis para um MVP e podem ser ajustados |
| A3 | A conversão de formato (FA4) é feita no mesmo pedido, sem custar uma operação adicional na quota |
| A4 | O recorte mantém, sempre que possível, as características do vídeo original, como a resolução e a taxa de fotogramas, alterando apenas o intervalo temporal e, se escolhido, o formato do ficheiro |
| A5 | A notificação de conclusão é apenas dentro da aplicação |
| A6 | Existe um limite de armazenamento por utilizador, aplicável também aos vídeos e aos respetivos recortes |
| A7 | Os vídeos originais e os vídeos recortados são contabilizados no espaço de armazenamento do utilizador |
| A8 | Assume-se que, durante a utilização deste caso de uso, a sessão permanece ativa e não é considerada a expiração automática por timeout. A sessão pode terminar por ação explícita do utilizador, através do logout |
| A9 | Os vídeos ficam numa biblioteca de vídeos do utilizador, nova e independente dos projetos do PictuRAS; no MVP, os vídeos não são adicionados a projetos de imagens |
| A10 | A quota diária de 5 operações do perfil Registado é partilhada entre as operações sobre imagens e as operações sobre vídeos |

### 2.8 Questões em Aberto

| **ID** | **Questão** |
|--------|-------------|
| Q1 | O perfil Anónimo deve poder aceder a vídeo, com limites mais apertados? |
| Q2 | O recorte deve conseguir ser encadeado com outras ferramentas (por exemplo, recortar e depois aplicar uma ferramenta a todos os fotogramas) num único pedido, ou só é possível usá-lo isoladamente no MVP? |
| Q3 | O recorte deve estar disponível no processamento em lote (vários vídeos, mesmo intervalo)? Se sim, conta como 1 operação ou como N? |
| Q4 | Faz falta pré-visualizar o resultado antes de iniciar o processamento? |
| Q5 | Um recorte que demora muito deve ser cancelado automaticamente ao fim de um tempo máximo? |
| Q6 | Faz falta ter áudio, legendas ou várias faixas preservadas explicitamente no resultado? |
| Q7 | Deve a operação ser reservada na quota no momento da confirmação? Com a regra atual, a operação só é contabilizada no fim: um utilizador Registado pode iniciar o pedido com 4 operações gastas, fazer uma operação sobre uma imagem enquanto o vídeo é processado e terminar o dia com 6 operações |
| Q8 | Terminar a sessão deve mesmo cancelar o recorte em curso (FA6), ou o processamento deve continuar e o resultado ficar disponível no próximo início de sessão, tal como acontece ao fechar o separador (FA2)? |
| Q9 | Como se relacionam os vídeos com os projetos existentes do PictuRAS? Deve ser possível adicionar vídeos a um projeto, ao lado das imagens, e usá-los no encadeamento de ferramentas? |

---

## 3. Utilização de agentes de IA

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|--------------------|--------------------------------------|
| Claude (claude.ai) | Discussão e exploração das minúcias e possibilidades associadas à funcionalidade de recorte de vídeo, nomeadamente comportamentos, limitações e situações excecionais | A IA foi utilizada apenas como apoio à discussão das funcionalidades. Todas as decisões sobre o caso de uso, regras, fluxos e comportamentos foram tomadas pela equipa, que também foi responsável pela redação do documento |
| Claude (claude.ai) | Revisão do caso de uso face ao template v2, aos exemplos de referência e ao documento de requisitos 2025/26: deteção de inconsistências entre fluxos, exceções e pré-condições e de lacunas de alinhamento com o sistema existente | Cada sugestão foi analisada pela equipa antes de ser incorporada. Foram acrescentadas as assunções A9 e A10 e as questões Q7 a Q9, corrigida a regra RN5 (colisão de nomes) e indicados os passos em todas as exceções |
