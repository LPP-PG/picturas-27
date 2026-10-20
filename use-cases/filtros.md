# Exercícios 1 e 2 — Aplicação de filtros a vídeo
### Casos de Uso e Especificação de Requisitos · Fase 1: Suporte a Vídeo no PictuRAS

## 0. Identificação

| **Campo** | **Valor** |
| :-- | :-- |
| **Grupo / Equipa** | Grupo 5 PL1 |
| **Autores** | Eduarda Ferreira PG65368; Luana Vilaverde PG65367; Daniel Rodrigues PG63934; Lucas Pinto PG63997 |
| **Data** | 2026-10-20 |
| **Versão do documento** | v2.2 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
| :-- | :-- |
| **Funcionalidade** | Aplicação de filtros visuais a um vídeo selecionado num projeto de vídeo |
| **Perfil(s) de utilizador abrangido(s)** | Registado e Premium. O Registado está sujeito à quota partilhada de cinco operações por dia; o Premium não tem esse limite diário. O Anónimo não cria projetos de vídeo, de acordo com UC-VID-004 (RN2). |

**Justificação no contexto do MVP**

A aplicação de filtros permite transformar o aspeto de um vídeo diretamente no editor do projeto. Reutiliza a criação, o carregamento, a seleção e a visualização do UC-VID-004; valida o processamento dos fotogramas, o acompanhamento de tarefas demoradas e a criação de um novo resultado no mesmo projeto sem modificar o original. Para além dos três filtros iniciais, prevê-se um pequeno catálogo adicional de efeitos simples, com prioridade inferior no MVP.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
| :-- | :-- |
| **ID do Caso de Uso** | UC-VID-002 |
| **Nome** | Aplicar um filtro a um vídeo de um projeto |
| **Versão** | v2.1 |
| **Autor** | Eduarda Ferreira; Luana Vilaverde; Daniel Rodrigues; Lucas Pinto |
| **Data** | 2026-10-20 |
| **Objetivo** | Obter, no mesmo projeto, um novo vídeo com um filtro visual aplicado a todos os fotogramas, sem modificar o original. |
| **Âmbito** | Ferramenta Filtros do editor de projetos de vídeo: seleção do efeito, pré-visualização, confirmação, processamento em segundo plano, reserva de armazenamento, criação do resultado e quota de operações. O carregamento, a listagem e o leitor dos vídeos são responsabilidade do UC-VID-004. |
| **Ator Principal** | Utilizador Registado. O Premium segue o mesmo fluxo com os limites do seu perfil. |
| **Stakeholders e Interesses** | **Utilizador:** quer ver o efeito antes de confirmar, acompanhar o pedido e conservar o original.<br>**Dono do sistema:** quer controlar quota e recursos de processamento/armazenamento.<br>**Equipa de desenvolvimento:** quer integrar uma ferramenta de vídeo no editor sem interromper as outras funcionalidades. |
| **Pré-condições** | Existe sessão iniciada de uma conta Registada ou Premium. Existe um projeto de vídeo do utilizador e um vídeo selecionado que já foi recebido, validado, guardado com miniatura e associado ao projeto (UC-VID-004, RN9). |
| **Trigger** | O utilizador seleciona um vídeo do projeto pela miniatura e escolhe **Filtros** na área **Video tools**. |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
| :-- | :-- | :-- |
| 1 | No projeto de vídeo, seleciona uma miniatura e escolhe **Filtros**. | Verifica a disponibilidade da operação e a quota de edição; utiliza o vídeo já selecionado no projeto (UC-VID-004, RN14). |
| 2 | — | Apresenta os filtros essenciais **Preto e branco**, **Sépia** e **Vintage** e uma área de pré-visualização. Os efeitos adicionais **Inversão de cores**, **Contraste elevado** e **Desfoque suave** são disponibilizados quando suportados na implementação (RN11). |
| 3 | Seleciona um filtro. | Mostra num fotograma de amostra do vídeo o efeito selecionado, sem alterar o ficheiro nem criar um pedido de processamento; informa que se trata de uma pré-visualização (RN15). |
| 4 | Confirma em **Aplicar filtro**. | Revalida quota, propriedade do vídeo, disponibilidade do serviço, limite global de pedidos de processamento e espaço disponível no projeto e na conta; reserva espaço estimado para o resultado. |
| 5 | — | Cria o pedido no estado **A aguardar**. |
| 6 | — | Inicia o processamento, altera o estado para **A processar** e mostra progresso em percentagem. |
| 7 | Acompanha o pedido e pode utilizar outras páginas ou projetos. | Mantém o processamento em segundo plano e atualiza o progresso e o estado. |
| 8 | — | Aplica o filtro a todos os fotogramas; preserva e mantém sincronizada a faixa de áudio principal, **quando existe**. Em vídeos sem áudio, gera normalmente um resultado sem áudio. Gera a miniatura, copia as legendas do original quando existem (RN17), guarda o novo vídeo no **mesmo projeto** e converte a reserva em espaço ocupado. |
| 9 | — | Altera o pedido para **Concluído**, contabiliza uma operação na quota diária quando aplicável e notifica o utilizador na aplicação. |
| 10 | Seleciona a miniatura do resultado. | Apresenta o vídeo filtrado no leitor do projeto; o original permanece inalterado. |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
| :-- | :-- |
| FA1 – Alterar o filtro | Antes de confirmar (passo 3), o utilizador escolhe outro filtro; a pré-visualização é atualizada e nenhum pedido é criado até à confirmação. |
| FA2 – Cancelar o processamento | Com o pedido **A aguardar** ou **A processar**, o utilizador seleciona **Cancelar**. O sistema interrompe o trabalho, quando iniciado, passa para **Cancelado**, elimina resultados parciais, liberta a reserva e não cobra a operação. |
| FA3 – Abandonar o ecrã | Após criar o pedido, o utilizador muda de página/projeto ou fecha o separador. O processamento continua; ao regressar, o utilizador consulta o estado. Este comportamento é diferente do upload, que pode ser interrompido ao abandonar o ecrã (UC-VID-004, FA4). |
| FA4 – Limite global de processamento | Na confirmação (passo 4), já está atingido o limite de pedidos de processamento de vídeo da conta, contando Recorte, Filtros e Legendas. O pedido não é criado; o sistema informa o utilizador e permite consultar os pedidos em curso. |
| FA5 – Terminar sessão | Se o utilizador fizer logout explícito com pedidos ativos, o sistema cancela-os, elimina os dados parciais, liberta reservas e não contabiliza operações. |
| FA6 – Sair antes de confirmar | Antes do passo 4, o utilizador fecha o painel de filtros; não é criado pedido nem reservada quota ou armazenamento. |
| FA7 – Vídeo sem faixa de áudio | No passo 8, o vídeo selecionado não tem faixa de áudio; o sistema aplica o filtro visual normalmente e grava o resultado também sem áudio, sem considerar esta condição uma falha. |

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
| :-- | :-- |
| E1 – Quota diária esgotada (passos 1 ou 4) | Apresenta «Atingiu o limite diário de operações», indica a reposição e não cria pedido. |
| E2 – Pré-visualização indisponível (passo 3) | Apresenta «Não foi possível pré-visualizar o filtro» e permite repetir ou escolher outro filtro. Não cria um pedido nem consome quota só por falhar a pré-visualização; o processamento continua dependente de confirmação explícita. |
| E3 – Espaço insuficiente no projeto ou na conta (passo 4) | Apresenta «Espaço de armazenamento insuficiente» e indica qual o limite atingido; não reserva espaço nem cria pedido. |
| E4 – Erro a meio do processamento (passos 6–8) | Passa a **Falhou**, descarta resultados parciais, liberta a reserva, informa a falha, não contabiliza a operação e mantém o original intacto. |
| E5 – Serviço indisponível ou fila cheia (passo 4) | Informa que o serviço está temporariamente indisponível; não cria pedido nem reserva espaço. |
| E6 – O resultado excede a reserva e não cabe no espaço livre (passo 8) | Passa a **Falhou**, elimina o resultado incompleto, liberta a reserva, informa o limite atingido e não contabiliza a operação. |
| E7 – Vídeo indisponível, projeto inexistente ou acesso não autorizado | Não permite aplicar filtros a ficheiros ainda em carregamento nem a vídeos/projetos de outro utilizador; informa a indisponibilidade ou recusa o acesso. O carregamento e respetivos limites continuam sujeitos ao UC-VID-004. |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
| :-- | :-- |
| Garantia de Sucesso | O mesmo projeto contém um **novo vídeo** com o filtro escolhido aplicado e miniatura gerada; o áudio principal é preservado e sincronizado **se existir**, e as legendas do original são copiadas quando existem e cabem no espaço livre (RN17). O original está intacto; o pedido está **Concluído**, o espaço efetivo é contabilizado no projeto/conta e é cobrada uma operação quando aplicável. |
| Garantia Mínima | O original e os vídeos anteriormente concluídos permanecem inalterados; não há resultado parcial acessível no projeto. Se o pedido falhou ou foi cancelado, reservas são libertadas e a quota não é consumida; é apresentada a causa quando aplicável. |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
| :-- | :-- |
| RN1 | Os vídeos de entrada pertencem a projetos de vídeo e cumprem os formatos MP4/MOV e limites de duração/tamanho verificados no upload (UC-VID-004, RN3 e RN4). Filtros não constitui um novo carregamento. |
| RN2 | Só os perfis Registado e Premium podem usar a ferramenta, em projetos próprios (UC-VID-004, RN2). |
| RN3 | Aplicar um filtro consome **1 operação** na quota diária partilhada com imagens, apenas se o pedido chegar a **Concluído**. Registado: 5/dia; Premium: sem limite diário. Para Registado, a disponibilidade dessa operação é reservada ao aceitar o pedido (sem consumo definitivo), libertada na falha/cancelamento e convertida em consumo na conclusão, para impedir ultrapassar o limite com pedidos concorrentes. A validação da quota nas operações de imagem e vídeo considera operações concluídas e reservas ativas da conta. Criar/carregar/visualizar vídeos e pré-visualizar filtros não consome operações (UC-VID-004, RN12). |
| RN4 | O filtro não altera o original. O resultado é um **novo vídeo no mesmo projeto**, com nome derivado de `<nome original>_<nome do filtro>` e sufixo numérico se necessário. O resultado só fica disponível para edição após estar integralmente guardado, com miniatura e associado ao projeto (UC-VID-004, RN8–RN9). Um vídeo resultante pode ser selecionado para receber outro filtro num novo pedido independente, preservando as versões anteriores. Cada pedido está sujeito às respetivas quotas e limites de armazenamento.|
| RN5 | Em cada pedido é aplicado **um único filtro a todos os fotogramas**. Apenas a componente visual é transformada. Se existir faixa de áudio principal, o conteúdo sonoro e a sincronização são mantidos; se não existir, o resultado mantém-se sem áudio e a operação é válida. |
| RN6 | Estados dos pedidos: **A aguardar**, **A processar**, **Concluído**, **Falhou** e **Cancelado**. Só os dois primeiros estados admitem cancelamento. |
| RN7 | O limite de processamentos ativos é global à conta e partilhado entre Recorte, Filtros e Legendas: Registado, **1**; Premium, **3**. É independente dos carregamentos simultâneos definidos em UC-VID-004, RN10. |
| RN8 | A aplicação do filtro é assíncrona; apresenta estado e progresso e pode continuar enquanto o utilizador navega noutras páginas. O logout explícito cancela pedidos ativos (FA5). |
| RN9 | Apenas vídeos já recebidos, validados, guardados com miniatura e associados ao projeto podem ser editados (UC-VID-004, RN9). |
| RN10 | Apenas o proprietário pode consultar/cancelar pedidos e aceder aos originais/resultados. O projeto de vídeo, as miniaturas e os vídeos seguem as regras de acesso do UC-VID-004, RN2. |
| RN11 | O catálogo contém três filtros **essenciais** («Deve ter»): **Preto e branco**, **Sépia** e **Vintage**, e três filtros **adicionais** («Deveria ter»): **Inversão de cores**, **Contraste elevado** e **Desfoque suave**. Cada filtro utiliza os parâmetros fixos de RN14, sem controlo de intensidade; a interface apresenta apenas os efeitos disponibilizados nesta versão da aplicação. Um pedido aplica um único filtro (RN5). |
| RN12 | Originais e resultados contam para os limites de armazenamento do projeto e da conta do UC-VID-004 (RN5–RN7): Registado, 500 MB/projeto e 2 GB/conta; Premium, 10 GB/projeto e 50 GB/conta. Antes de aceitar o pedido reserva-se uma **estimativa** de espaço (A11); na conclusão, a reserva converte-se na ocupação real, e na falha ou cancelamento é libertada. Se o ficheiro ultrapassar a reserva, verifica-se novamente o espaço livre antes de concluir (E6). O tratamento do espaço das miniaturas segue UC-VID-004, Q1. |
| RN13 | Enquanto houver um pedido de filtros **A aguardar** ou **A processar**, a eliminação do vídeo original ou do projeto que o contém é impedida, para evitar quebrar o processamento. |
| RN14 | **Especificação dos presets:** operações sobre valores RGB normalizados no intervalo [0, 1], com corte final a esse intervalo quando necessário, conforme a tabela seguinte. A implementação pode usar diferentes ferramentas de processamento desde que reproduza um efeito visual equivalente. |
| RN15 | A pré-visualização representa o filtro escolhido num **fotograma de amostra** do vídeo do projeto, sem criar um novo vídeo nem consumir uma operação da quota. Pode ter resolução reduzida; o resultado final usa o vídeo completo. Deve ser visualmente coerente com o efeito aplicado (A4), embora diferenças de compressão sejam admissíveis. |
| RN16 | O resultado é disponibilizado em **MP4**, com vídeo **H.264** e, quando existe faixa de áudio principal, áudio **AAC**. Mantém a duração, a resolução e a taxa de fotogramas da entrada sempre que forem compatíveis com a codificação de saída; o vídeo resultante deve reproduzir-se nos navegadores de referência do projeto. |
| RN17 | Quando o vídeo original tem legendas (UC-VID-003), o resultado do filtro recebe uma cópia dessas legendas, no mesmo idioma e com os mesmos instantes, porque o filtro não altera a duração do vídeo. A cópia é independente das legendas do original e conta para o espaço do projeto e da conta. Se a cópia falhar ou não houver espaço livre suficiente, o resultado é guardado sem legendas e o pedido de filtro não falha por isso (UC-VID-003, RN16). |

**Catálogo de filtros e presets (RN11 e RN14)**

Para definir os efeitos sem depender já de um programa específico, considere os componentes de cor R, G e B no intervalo [0, 1], a luminância aproximada `Y = 0,2126 R + 0,7152 G + 0,0722 B` e a função `corte(x) = min(1, max(0, x))`. Nas operações numéricas os canais são tratados de forma independente, exceto quando é usada Y.

| **Filtro** | **Transformação definida** | **Prioridade** |
| :-- | :-- | :-- |
| **Preto e branco** | Para cada fotograma: `R' = G' = B' = Y` (saturação nula). | Deve ter |
| **Sépia** | Transformação cromática fixa: `R' = corte(0,393R + 0,769G + 0,189B)`; `G' = corte(0,349R + 0,686G + 0,168B)`; `B' = corte(0,272R + 0,534G + 0,131B)`. | Deve ter |
| **Vintage** | *Preset* fixo: (1) reduzir saturação a **70%**, com `C1 = Y + 0,70(C − Y)`; (2) aplicar contraste **0,90** em torno de 0,5, com `C2 = 0,5 + 0,90(C1 − 0,5)`; (3) aquecer as cores com ganhos `R × 1,05`, `G × 1,00`, `B × 0,92`; (4) aplicar `corte` a cada canal. | Deve ter |
| **Inversão de cores** | Para cada canal de cada fotograma: `C' = 1 − C`. | Deveria ter |
| **Contraste elevado** | Para cada canal: `C' = corte(0,5 + 1,30(C − 0,5))` (contraste fixo de **1,30**). | Deveria ter |
| **Desfoque suave** | Aplicar desfoque gaussiano com `σ = 1,5 píxeis` aos fotogramas na resolução de saída; não afeta o áudio. | Deveria ter |

**Critério para testes dos efeitos:** devem ser usados vídeos com cores e contornos conhecidos, observando-se a transformação nos fotogramas do resultado. A codificação de vídeo pode introduzir diferenças de compressão; não se exige igualdade exata de cada píxel. Os filtros são transformações clássicas de imagem/vídeo e não exigem modelos de IA.

**Pré-visualização (RN15):** o utilizador observa um fotograma de amostra com o efeito selecionado. Pode trocar de filtro e atualizar a amostra sem iniciar o pedido; a aplicação efetiva abrange todos os fotogramas. A pré-visualização não consome quota, não reserva espaço e não altera o vídeo original.

**Reserva de espaço (RN12, A11):** antes de iniciar a operação, a reserva é calculada como `ceil(1,5 × tamanho do vídeo de entrada em bytes)` e descontada do espaço disponível no projeto e na conta. Na conclusão é substituída pelo tamanho real; se o resultado exceder a reserva, a diferença tem de caber no espaço disponível. Em caso contrário aplica-se E6. Na falha ou no cancelamento, a reserva é libertada.

### 2.7 Assunções

| **ID** | **Assunção** |
| :-- | :-- |
| A1 | O vídeo está acessível ao processamento e já terminou o carregamento, conforme UC-VID-004, RN9. |
| A2 | Cada pedido aplica um único filtro ao vídeo completo. É possível aplicar posteriormente outro filtro ao vídeo resultante, através de um novo pedido independente. Não existe combinação automática de efeitos num único pedido nem seleção de intervalo temporal nesta versão. |
| A3 | Se o vídeo tiver faixa de áudio principal, esta mantém o conteúdo e a sincronização. Na ausência de áudio, o processamento de filtros prossegue normalmente sem gerar uma faixa sonora artificial (FA7). |
| A4 | A pré-visualização usa um fotograma de amostra do vídeo selecionado, potencialmente com resolução reduzida. O efeito deve corresponder visualmente ao preset do resultado, tolerando diferenças de compressão; não garante igualdade de píxel a píxel. |
| A5 | O resultado utiliza MP4/H.264 e AAC quando existir áudio, conforme RN16. Mantém-se a duração e, quando tecnicamente compatível, a resolução e a taxa de fotogramas originais; o contentor MOV de entrada não precisa de ser conservado. |
| A6 | A notificação de conclusão é feita apenas na aplicação. |
| A7 | O resultado conta para o armazenamento do projeto e da conta, de acordo com UC-VID-004, RN7. |
| A8 | Pode usar-se uma ferramenta de processamento de vídeo existente, por exemplo FFmpeg, em vez de reutilizar diretamente ferramentas de imagem fotograma a fotograma; esta é uma **opção técnica**, não um requisito funcional. |
| A9 | Os vídeos pertencem a projetos de vídeo. **Não existe biblioteca independente**; o resultado dos Filtros regressa ao projeto de origem (UC-VID-004, A6). |
| A10 | A quota de cinco operações diárias do perfil Registado é partilhada entre operações de imagem e de vídeo. |
| A11 | Para o MVP, a estimativa de reserva do resultado é `ceil(1,5 × tamanho do vídeo de entrada em bytes)`. Não representa o tamanho final garantido; quando este ultrapassa a reserva, o sistema verifica o espaço livre remanescente e aplica E6 se for insuficiente. |
| A12 | O limite global de pedidos de processamento de vídeo é partilhado pelas ferramentas Recorte, Filtros e Legendas, independentemente dos carregamentos simultâneos. |
| A13 | Os vídeos filtrados permanecem no projeto até serem eliminados pelo utilizador, sem expiração automática no MVP. |
| A14 | Os efeitos Inversão de cores, Contraste elevado e Desfoque suave são funcionalidades adicionais («Deveria ter»), podendo ser desenvolvidas depois dos três efeitos essenciais; o editor só apresenta os filtros disponíveis. |
| A15 | Cada filtro corresponde ao *preset* fixo e reproduzível definido em RN14. A compressão com perdas pode criar pequenas diferenças entre os fotogramas produzidos e os fotogramas de referência, sem alterar a natureza do efeito. |
| A16 | A interface é apresentada em inglês; as mensagens e os nomes de botões, ferramentas, filtros e estados indicados neste documento são o seu equivalente em português. |

### 2.8 Questões em Aberto

As questões seguintes dizem respeito a eventuais evoluções posteriores e não condicionam o âmbito definido para o MVP.

| **ID** | **Questão para evolução futura** |
| :-- | :-- |
| Q1 | Acrescentar outros efeitos para além dos seis filtros do catálogo? |
| Q2 | Permitir combinar vários filtros num único pedido? |
| Q3 | Disponibilizar ajuste de intensidade e parâmetros dos efeitos? |
| Q4 | Permitir aplicar filtros apenas a um intervalo temporal do vídeo? |
| Q5 | Suportar processamento em lote de vários vídeos? |
| Q6 | Substituir a pré-visualização por fotograma por uma amostra animada? |
| Q13 | Disponibilizar encadeamento automático de várias ferramentas de vídeo? |

---

## 3. Utilização de agentes de IA

| **Ferramenta / skill** | **Tarefa apoiada** | **Validação realizada pela equipa** |
| :-- | :-- | :-- |
| ChatGPT (OpenAI) | Discussão das funcionalidades e dos comportamentos de aplicação de filtros a vídeo, apoio à redação do caso de uso e da ERS, organização dos fluxos alternativos e exceções e especificação de filtros e critérios de aceitação. | Revisão documental da coerência entre fluxo, regras de negócio, requisitos e matriz de rastreabilidade, distinguindo funcionalidades essenciais das adicionais. |
| Claude (claude.ai) | Revisão da versão inicial do caso de uso e identificação de inconsistências em fluxos, exceções e pré-condições. | As sugestões aproveitadas na versão inicial foram registadas no histórico do documento. |

---

## 4. Especificação de Requisitos do Sistema (ERS)

**Caso de Uso:** UC-VID-002 — Aplicar um filtro a um vídeo de um projeto  
**Versão do dossiê:** v2.2  
**Baseline do Exercício 1:** `filtros.md` v1.0 (IDs `REQ-VID-FILT-001` a `REQ-VID-FILT-042`). São preservados os IDs cuja intenção não mudou; os retirados não são reutilizados. Novos IDs `043`–`053` documentam aspetos complementares. Os efeitos adicionais correspondem a `050`–`052`.

### 4.1 Requisitos da ERS

#### 4.1.1 Requisitos Funcionais

| **ID** | **Requisito** | **Prioridade** | **Evolução** | **Novo/Alt** | **Origem (UC / RN / decisão)** | **Justificação** | **Critério de aceitação / verificação** |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| REQ-VID-FILT-002 | O sistema deve permitir selecionar a ferramenta Filtros para o vídeo selecionado num projeto de vídeo. | Deve ter | Refinado | NOVO | Passo 1, Trigger; UC-VID-004 RN14 | Reutiliza a seleção existente. | Dado um projeto com vídeo selecionado, quando se escolhe Filtros, então o pedido refere-se a esse vídeo. |
| REQ-VID-FILT-003 | O sistema deve disponibilizar a ferramenta apenas a contas Registadas e Premium proprietárias do projeto. | Deve ter | Refinado | ALT | Pré-condições, RN2, RN10 | Aplicar as permissões de vídeo. | Dada uma conta anónima ou não proprietária, quando tenta aceder à ferramenta, então a operação é recusada. |
| REQ-VID-FILT-004 | O sistema deve impedir filtros em vídeos ainda não disponíveis para edição. | Deve ter | Refinado | NOVO | Pré-condições, RN9; UC-VID-004 RN9 | Evita processar ficheiros incompletos. | Dado um vídeo em carregamento, quando se tenta filtrar, então o pedido não é criado. |
| REQ-VID-FILT-011 | O sistema deve rejeitar pedidos quando a quota partilhada de edição estiver esgotada, indicando a reposição. | Deve ter | Refinado | ALT | Passos 1 e 4, E1, RN3 | Respeita a quota diária. | Dado Registado com cinco operações concluídas no dia, quando tenta filtrar, então recebe aviso e nenhum pedido é criado. |
| REQ-VID-FILT-012 | O sistema deve disponibilizar os filtros essenciais Preto e branco, Sépia e Vintage, sem parâmetros de intensidade, aplicando os *presets* fixos especificados em RN14. | Deve ter | Refinado | NOVO | Passo 2, RN11, RN14 | Define um catálogo mínimo e efeitos consistentes. | Num vídeo com cores de referência, o painel apresenta os três efeitos essenciais; cada um pode ser pré-visualizado e aplicado e os fotogramas produzidos correspondem aos presets definidos em RN14, tolerando diferenças normais de codificação. |
| REQ-VID-FILT-050 | O sistema deve permitir aplicar o filtro adicional **Inversão de cores**, invertendo os componentes RGB conforme RN14. | Deveria ter | Novo | NOVO | Passo 2, RN11, RN14, A14 | Efeito adicional simples e objetivamente verificável. | Dado um vídeo com barras de cor, quando se aplica Inversão de cores, então as cores passam a aproximar-se de `C′ = 1 − C`, dentro das tolerâncias de codificação, e o áudio mantém-se quando existe. |
| REQ-VID-FILT-051 | O sistema deve permitir aplicar o filtro adicional **Contraste elevado**, com a transformação fixa definida em RN14. | Deveria ter | Refinado | NOVO | Passo 2, RN11, RN14, A14, A15 | Efeito opcional com alteração de contraste verificável. | Dado um fotograma com tons em torno do cinzento médio, quando se aplica Contraste elevado, então a saída corresponde ao ganho 1,30 definido em RN14, admitindo diferenças normais de codificação. |
| REQ-VID-FILT-052 | O sistema deve permitir aplicar o filtro adicional **Desfoque suave**, com o desfoque gaussiano fixo definido em RN14. | Deveria ter | Refinado | NOVO | Passo 2, RN11, RN14, A14, A15 | Efeito espacial opcional verificável. | Dado um fotograma com contornos, quando se aplica Desfoque suave, então o resultado apresenta desfoque com σ = 1,5 píxeis em RN14, sem alterar a duração ou o áudio. |
| REQ-VID-FILT-013 | O sistema deve permitir selecionar um único filtro por pedido. | Deve ter | Mantido | NOVO | Passo 3, RN5 | Evita ambiguidade. | Ao escolher outro filtro antes da confirmação, só o último fica selecionado. |
| REQ-VID-FILT-014 | O sistema deve apresentar, num fotograma de amostra do vídeo selecionado, uma pré-visualização representativa do filtro atualmente escolhido, sem iniciar processamento definitivo nem consumir quota. | Deve ter | Refinado | NOVO | Passos 2–3, FA1, RN15, A4 | Permite escolher sem custo e sem criar ficheiros persistentes. | Dado um vídeo de teste, ao alternar entre Sépia e Preto e branco, a amostra mostra o efeito selecionado; não existe pedido, nova ocupação de armazenamento ou consumo de quota. |
| REQ-VID-FILT-015 | O sistema deve permitir tentar novamente a pré-visualização ou escolher outro filtro quando esta falhar. | Deveria ter | Refinado | NOVO | E2 | Recuperação sem criar pedido. | Dada falha de pré-visualização, aparece mensagem e opções de recuperar; não há processamento iniciado. |
| REQ-VID-FILT-016 | O sistema deve criar o pedido apenas após confirmação explícita. | Deve ter | Mantido | NOVO | Passo 4, FA1, FA6 | Previne operações indesejadas. | Abrir o painel e sair sem confirmar não cria pedido. |
| REQ-VID-FILT-017 | O sistema deve revalidar quota, limites de processamento global, acesso e disponibilidade de armazenamento ao confirmar. | Deve ter | Refinado | ALT | Passo 4, E1, E3, E7, RN7, RN12 | As condições podem mudar durante a seleção. | Dado um limite atingido entre abrir e confirmar, nenhum pedido é criado. |
| REQ-VID-FILT-018 | O sistema deve impedir outro processamento de vídeo quando um Registado já tiver um pedido **A aguardar** ou **A processar**, independentemente da ferramenta. | Deve ter | Refinado | NOVO | FA4, RN7 | Protege a capacidade por conta. | Com um pedido ativo de Recorte, não aceita simultaneamente um de Filtros na mesma conta Registada. |
| REQ-VID-FILT-019 | O sistema deve impedir um novo processamento quando um Premium já tiver três pedidos de vídeo ativos, independentemente da ferramenta. | Deveria ter | Refinado | NOVO | FA4, RN7 | Limite diferenciado por perfil. | Com três pedidos ativos, a confirmação de Filtros é rejeitada. |
| REQ-VID-FILT-020 | O sistema deve informar quando o limite de simultaneidade impede um pedido. | Deve ter | Mantido | NOVO | FA4 | Explica a rejeição. | Ao ultrapassar o limite, mostra a causa e permite consultar pedidos em curso. |
| REQ-VID-FILT-021 | O sistema deve permitir consultar o estado dos pedidos de filtros, incluindo após abandonar o ecrã. | Deve ter | Refinado | NOVO | Passo 7, FA3, RN6 | Permite acompanhar processamento demorado. | Ao regressar ao projeto, o utilizador vê o estado do pedido. |
| REQ-VID-FILT-022 | O sistema deve criar um pedido aceite no estado **A aguardar**. | Deve ter | Refinado | NOVO | Passo 5, RN6 | Consistência entre ferramentas. | Após confirmar com sucesso, o estado inicial é A aguardar. |
| REQ-VID-FILT-023 | O sistema deve recusar a criação de pedidos com o serviço indisponível ou a fila cheia. | Deve ter | Mantido | NOVO | E5 | Não cria trabalhos inexequíveis. | Ao simular indisponibilidade, apresenta erro e não cria pedido. |
| REQ-VID-FILT-024 | O sistema deve passar o pedido para **A processar** quando iniciar o processamento. | Deve ter | Mantido | NOVO | Passo 6, RN6 | Estado verificável. | Quando o processamento começa, o pedido muda de A aguardar para A processar. |
| REQ-VID-FILT-027 | O sistema deve aplicar o filtro escolhido a todos os fotogramas do vídeo. | Deve ter | Mantido | NOVO | Passo 8, RN5 | Função central da ferramenta. | Num vídeo de amostra com mudanças visuais, todos os segmentos do resultado mostram o efeito. |
| REQ-VID-FILT-028 | O sistema deve preservar o conteúdo e a sincronização da faixa de áudio principal **quando exista**, produzindo um vídeo sem áudio quando a entrada não contiver essa faixa. | Deve ter | Refinado | NOVO | Passo 8, FA7, RN5, A3 | O efeito visual não deve exigir som nem alterá-lo. | Dado um vídeo com fala e outro sem áudio, quando o filtro conclui, então o primeiro mantém o som sincronizado e o segundo gera resultado reproduzível sem áudio. |
| REQ-VID-FILT-029 | O sistema deve guardar o resultado como **novo vídeo no mesmo projeto** do original. | Deve ter | Refinado | NOVO | Passo 8, RN4, A9 | Evita biblioteca separada. | Após Concluído, o resultado aparece no projeto original e o vídeo fonte continua disponível. |
| REQ-VID-FILT-030 | O sistema deve atribuir ao resultado um nome derivado do original e do filtro, com sufixo em caso de colisão. | Deve ter | Refinado | NOVO | RN4 | Distingue resultados. | Duas aplicações do mesmo filtro geram nomes diferentes. |
| REQ-VID-FILT-031 | O sistema deve incluir o tamanho real do resultado na ocupação do projeto **e da conta**. | Deve ter | Refinado | ALT | Passo 8, RN12; UC-VID-004 RN7 | Respeita o armazenamento partilhado. | O espaço livre do projeto e da conta diminui pelo tamanho do resultado concluído. |
| REQ-VID-FILT-032 | O sistema deve passar para **Concluído** só depois de guardar o resultado e a miniatura no projeto. | Deve ter | Refinado | NOVO | Passos 8–9, RN4, RN6 | Evita anunciar resultados incompletos. | Não se observa Concluído antes de o resultado poder ser aberto. |
| REQ-VID-FILT-033 | O sistema deve reservar a disponibilidade de uma operação diária ao aceitar o pedido de um Registado, considerando as operações concluídas e as reservas ativas da conta, contabilizando-a definitivamente apenas quando o processamento conclui com sucesso e libertando a reserva se falhar ou for cancelado. | Deve ter | Refinado | ALT | Passos 4 e 9, RN3, E1, pós-condições | Impede ultrapassar a quota diária por pedidos de vídeo concorrentes. | Com quatro operações consumidas, aceitar um filtro reserva a quinta vaga; um segundo pedido não é aceite enquanto a vaga estiver ocupada. Se o primeiro falhar, a vaga fica novamente disponível; se concluir, o total passa a cinco. |
| REQ-VID-FILT-034 | O sistema deve notificar a conclusão na aplicação. | Deveria ter | Mantido | NOVO | Passo 9, A6 | Comunica resultado. | A conclusão é comunicada no projeto ou lista de pedidos. |
| REQ-VID-FILT-035 | O sistema deve permitir selecionar o resultado pela miniatura e reproduzi-lo no leitor do projeto. | Deve ter | Refinado | NOVO | Passo 10, RN4 | Reutiliza o editor existente. | Ao clicar na miniatura do resultado, o leitor apresenta o vídeo filtrado. |
| REQ-VID-FILT-036 | O sistema deve aceitar cancelamento apenas em **A aguardar** e **A processar**, passando para **Cancelado**. | Deve ter | Refinado | NOVO | FA2, RN6 | Protege estados finais. | Só pedidos nesses estados têm cancelamento disponível. |
| REQ-VID-FILT-037 | O sistema deve interromper o trabalho de processamento quando o utilizador cancela um pedido ativo. | Deve ter | Mantido | NOVO | FA2 | Evita consumo desnecessário de recursos. | Cancelar um pedido A processar interrompe a execução do efeito. |
| REQ-VID-FILT-038 | O sistema deve cancelar pedidos ativos quando ocorre logout explícito do proprietário. | Deveria ter | Refinado | ALT | FA5 | Coerência com o comportamento de cancelamento definido para tarefas de vídeo. | Após logout, os pedidos ativos ficam Cancelados. |
| REQ-VID-FILT-039 | O sistema deve passar um pedido para **Falhou** e informar o utilizador se o processamento falhar ou faltar espaço para guardar o resultado. | Deve ter | Mantido | NOVO | E4, E6 | Comunica falha. | Forçando erro ou falta de espaço, o pedido passa a Falhou e mostra a causa. |
| REQ-VID-FILT-043 | O sistema deve reservar, no projeto e na conta, espaço estimado para o resultado antes de aceitar um pedido e recusá-lo quando o espaço disponível for inferior à estimativa, libertando a reserva em caso de falha ou cancelamento. | Deve ter | Refinado | NOVO | Passo 4, E3, E6, RN12, A11; UC-VID-004 RN7 | Evita pedidos sem espaço, reutilizando a gestão do projeto. | Com vídeo de 10 MB e reserva de 15 MB definida em A11, se o espaço disponível for 14 MB o pedido é recusado; se for 15 MB, cria uma reserva de 15 MB. Ao cancelar a reserva é libertada; após conclusão é substituída pela ocupação real. |
| REQ-VID-FILT-044 | O sistema deve impedir eliminar o vídeo original ou o projeto enquanto houver um pedido de filtros ativo associado. | Deve ter | Novo | NOVO | RN13 | Evita apagar a entrada do processamento. | Com um pedido A aguardar, Delete video é recusado até ao cancelamento/conclusão. |
| REQ-VID-FILT-045 | O sistema deve gerar uma miniatura do resultado e disponibilizá-lo apenas após estar inteiramente guardado e associado ao projeto. | Deve ter | Novo | NOVO | Passo 8, RN4; UC-VID-004 RN8–RN9 | Coerência com o upload. | Depois de concluído aparece uma nova miniatura, que permite selecionar e reproduzir o resultado. |
| REQ-VID-FILT-053 | O sistema deve guardar o vídeo resultante em MP4 com vídeo H.264 e, quando existe áudio na entrada, áudio AAC, mantendo a duração e, quando compatível, a resolução e a taxa de fotogramas. | Deve ter | Novo | NOVO | Passos 8 e 10, RN16, A5 | Define uma saída reproduzível e independente do contentor de entrada. | Dado um MP4 e um MOV com áudio, cada resultado tem contentor MP4, vídeo H.264 e áudio AAC; um vídeo sem áudio origina MP4 sem áudio. A duração mantém-se, admitindo diferença inferior à duração de um fotograma. |


#### 4.1.2 Requisitos Não Funcionais e de Qualidade

| **ID** | **Requisito** | **Característica ISO/IEC 25010** | **Alvo MVP** | **Alvo produção** | **Evolução** | **Origem (UC / DQ)** | **Critério de aceitação / verificação** |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| REQ-VID-FILT-025 | O sistema deve atualizar a percentagem de progresso do processamento em intervalos máximos definidos. | Usabilidade | ≤ 5 s entre atualizações | ≤ 2 s | Refinado | Passos 6–7, RN8; DQ-001 | Durante um pedido em processamento, verificar se a percentagem é atualizada dentro do intervalo definido. |
| REQ-VID-FILT-026 | O processamento deve ser assíncrono e continuar quando o utilizador sai do ecrã sem terminar sessão. | Eficiência de Desempenho / Usabilidade | Obrigatório | Obrigatório | Refinado | Passos 6–7, FA3, RN8 | Iniciar pedido, navegar para outra página e regressar; pedido continua. |
| REQ-VID-FILT-040 | Um pedido Falhou ou Cancelado não deve deixar resultados parciais acessíveis nem reservas pendentes. | Fiabilidade | Obrigatório, sem retoma automática | Obrigatório, com recuperação de falhas transitórias | Refinado | FA2, FA5, E4, E6, RN12; DQ-002 | Cancelar/falhar durante a aplicação; verificar limpeza e recuperação de espaço. |
| REQ-VID-FILT-041 | O ficheiro de vídeo original deve manter-se inalterado após uma operação Concluída, Falhada ou Cancelada. | Fiabilidade | Obrigatório | Obrigatório | Mantido | Passo 10, RN4, pós-condições | Comparar hashes SHA-256 do original antes e depois de cada cenário. |
| REQ-VID-FILT-042 | Apenas o proprietário pode consultar ou cancelar pedidos de filtros e obter resultados. | Segurança | Obrigatório | Obrigatório | Refinado | RN10 | Tentar aceder/cancelar pedido de outro utilizador por API: acesso recusado. |
| REQ-VID-FILT-046 | O pedido aceite deve apresentar o estado A aguardar em menos de 3 segundos após confirmação. | Eficiência de Desempenho | < 3 s | < 1 s | Novo | Passo 5; DQ-004 | Medir 10 confirmações para vídeos curtos e no limite do perfil. |
| REQ-VID-FILT-047 | A aplicação de filtros deve produzir um resultado reproduzível no mesmo navegador em que se reproduz o original. | Compatibilidade | Navegadores utilizados nos testes do grupo | Conjunto de navegadores oficialmente suportados | Novo | Passo 10, A5; DQ-005 | Aplicar um filtro a originais MP4 e MOV reproduzíveis e abrir os resultados MP4/H.264 no mesmo navegador. |
| REQ-VID-FILT-048 | Adicionar outra ferramenta de vídeo não deve exigir alterações ao código específico da transformação dos filtros. | Manutenibilidade | Objetivo de arquitetura | Obrigatório | Novo | DQ-006 | Adicionar um ponto de integração de teste sem editar a transformação dos filtros. |
| REQ-VID-FILT-049 | O processamento de filtros deve poder ser executado com o ambiente do projeto, sem instalação manual de software externo no computador do utilizador. | Portabilidade | Serviço empacotado e arranque documentado | Verificado em dois ambientes distintos | Novo | DQ-006 | Reconstruir o ambiente e processar vídeo sem instalar FFmpeg manualmente no Windows. |

#### 4.1.3 Verificação da completude e dos limites do âmbito

| **Tópico a verificar** | **Aplicável?** | **Decisão / justificação** | **Requisito(s) relacionado(s)** |
| :-- | :-- | :-- | :-- |
| Formato, codec, duração e dimensão | Sim (partilhado) | MP4/MOV e limites são verificados por UC-VID-004, RN3–RN4; Filtros exige resultado reproduzível, sem impor novo upload. O resultado é MP4/H.264 (áudio AAC quando existe), segundo RN16. | REQ-VID-FILT-004, REQ-VID-FILT-047, REQ-VID-FILT-053; UC-VID-004 |
| Estado, progresso, cancelamento e resultado | Sim | Pedidos A aguardar/A processar/Concluído/Falhou/Cancelado, progresso, cancelamento e resultado no mesmo projeto. Pré-visualização não inicia pedido nem consome quota. | REQ-VID-FILT-021, REQ-VID-FILT-022, REQ-VID-FILT-023, REQ-VID-FILT-024, REQ-VID-FILT-025, REQ-VID-FILT-026, REQ-VID-FILT-029, REQ-VID-FILT-032, REQ-VID-FILT-035, REQ-VID-FILT-036, REQ-VID-FILT-037, REQ-VID-FILT-038, REQ-VID-FILT-045, REQ-VID-FILT-046 |
| Falhas durante o processamento | Sim | Falhou, notificação, limpeza de resultados parciais e libertação de reserva, sem retoma automática no MVP. | REQ-VID-FILT-023, REQ-VID-FILT-039, REQ-VID-FILT-040 |
| Persistência e expiração | Sim (persistência); não (expiração automática) | Resultados ficam no projeto até o proprietário os eliminar. Espaço do projeto/conta é reservado e contabilizado. | REQ-VID-FILT-029, REQ-VID-FILT-031, REQ-VID-FILT-040, REQ-VID-FILT-043, REQ-VID-FILT-044, REQ-VID-FILT-045; A13 |
| Perfis e quota de operações | Sim | Registado/Premium, 5 operações partilhadas por dia no Registado, 1 operação apenas após Concluído, limites globais de processamento definidos em RN7. | REQ-VID-FILT-003, REQ-VID-FILT-011, REQ-VID-FILT-017, REQ-VID-FILT-018, REQ-VID-FILT-019, REQ-VID-FILT-020, REQ-VID-FILT-033 |
| Encadeamento e processamento em lote | Não, no MVP | Um filtro por pedido individual, sobre um vídeo selecionado; sem processamento em lote nem encadeamento automático, mesmo quando são disponibilizados filtros adicionais. Aplicar outro filtro depois do primeiro é um **novo pedido**, sujeito novamente às regras de quota e armazenamento. | RN5, A2, Q5, Q13 |

### 4.2 Impacto no sistema existente

A coluna **Elemento da baseline** indica o elemento do documento de requisitos de base (doc-ext-requisitos.pdf, PictuRAS 2025/26) afetado; R*n* são as restrições do projeto desse documento (secção 4).

| **Elemento existente afetado** | **Elemento da baseline** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisito(s) relacionado(s)** |
| :-- | :-- | :-- | :-- | :-- |
| Projetos de vídeo e editor | Entidade Projeto do modelo de domínio (Figura 1); o editor de vídeo é novo (UC-VID-004) | Estender | Ativar **Filtros** no editor, aplicar o efeito ao vídeo selecionado e pré-visualizar um fotograma, sem criar biblioteca paralela; resultado e miniatura no mesmo projeto. | REQ-VID-FILT-002, REQ-VID-FILT-014, REQ-VID-FILT-029, REQ-VID-FILT-035, REQ-VID-FILT-045 |
| Perfis e permissões | Perfis de utilização (secção 3.1); RNF44 (segurança e privacidade dos dados) | Estender | Só Registado e Premium têm ferramenta Filtros e acedem aos próprios pedidos/resultados; video-base já controlado por UC-VID-004. | REQ-VID-FILT-003, REQ-VID-FILT-042 |
| Quota diária de operações | Perfil Registado com operações diárias limitadas (secção 3.1); RNF48 (exibir limite diário de operações) | Estender | Filtros conta uma operação apenas no sucesso, partilhada com imagens; carregamento não consome quota. | REQ-VID-FILT-011, REQ-VID-FILT-033 |
| Gestão de pedidos de processamento | R5 (controlo de tarefas em fila) | Estender | Novo tipo de pedido assíncrono; estados, progresso, simultaneidade global com Recorte e Legendas, cancelamento. | REQ-VID-FILT-017, REQ-VID-FILT-018, REQ-VID-FILT-019, REQ-VID-FILT-020, REQ-VID-FILT-021, REQ-VID-FILT-022, REQ-VID-FILT-023, REQ-VID-FILT-024, REQ-VID-FILT-025, REQ-VID-FILT-026, REQ-VID-FILT-036, REQ-VID-FILT-037, REQ-VID-FILT-038, REQ-VID-FILT-039, REQ-VID-FILT-040 |
| Armazenamento e miniaturas | R2 (limite de armazenamento por utilizador); RNF45 | Estender | Reserva espaço no projeto e conta; resultado conta para limites definidos em UC-VID-004 e gera miniatura. | REQ-VID-FILT-031, REQ-VID-FILT-040, REQ-VID-FILT-043, REQ-VID-FILT-045 |
| Ferramentas de imagem / serviços existentes | Entidade Ferramenta, Básica e Avançada, do modelo de domínio (Figura 1); R7 (compatibilidade com a arquitetura base) | Estender | A nova ferramenta de vídeo poderá reutilizar tecnologia existente, sem obrigar a modificar as ferramentas de imagem. Os três efeitos essenciais e os três adicionais partilham um mecanismo de transformação baseado nos presets RN14. | REQ-VID-FILT-012, REQ-VID-FILT-027, REQ-VID-FILT-048, REQ-VID-FILT-049, REQ-VID-FILT-050 a REQ-VID-FILT-052 |
| Legendas dos vídeos (UC-VID-003) | Nenhum: as legendas são novas (UC-VID-003) | Estender | O resultado de um filtro recebe uma cópia das legendas do original, quando existem e há espaço livre; sem legendas, ou se a cópia falhar, o resultado é guardado sem elas (RN17). | REQ-VID-LEG-044 (UC-VID-003) |
| Projetos de imagens, lote e encadeamento | Caso de uso Aplicar encadeamento de ferramentas a conjunto de imagens (Figura 2; sem ID no documento de base) | Manter | Projetos de imagens continuam isolados; sem lote nem encadeamento automático de filtros neste âmbito. | RN1, RN5; UC-VID-004 RN1, RN14 |

### 4.3 Matriz de Rastreabilidade Atualizada

| **Elemento de origem** | **Descrição abreviada** | **Requisito(s) relacionado(s)** |
| :-- | :-- | :-- |
| Pré-condições / RN2 / RN9 / RN10 | Acesso e vídeo pronto | REQ-VID-FILT-003, REQ-VID-FILT-004, REQ-VID-FILT-042 |
| Trigger / Passo 1 | Seleção de vídeo do projeto e botão Filtros | REQ-VID-FILT-002, REQ-VID-FILT-011 |
| Passos 2–3 / FA1 / RN11 / RN14 / RN15 / A14–A15 | Catálogo e parâmetros de presets; seleção e pré-visualização sem quota | REQ-VID-FILT-012, REQ-VID-FILT-013, REQ-VID-FILT-014, REQ-VID-FILT-050, REQ-VID-FILT-051, REQ-VID-FILT-052 |
| E2 | Pré-visualização falhada | REQ-VID-FILT-015 |
| Passo 4 / FA6 | Confirmação e revalidação | REQ-VID-FILT-016, REQ-VID-FILT-017, REQ-VID-FILT-043 |
| Passos 5–7 / FA3 | Pedido, estado, processamento e progresso | REQ-VID-FILT-021, REQ-VID-FILT-022, REQ-VID-FILT-024, REQ-VID-FILT-025, REQ-VID-FILT-026, REQ-VID-FILT-046 |
| FA4 / RN7 | Simultaneidade entre ferramentas | REQ-VID-FILT-018, REQ-VID-FILT-019, REQ-VID-FILT-020 |
| E5 | Serviço indisponível | REQ-VID-FILT-023 |
| Passo 8 / FA7 / RN4 / RN5 | Aplicar filtro, com ou sem áudio; guardar resultado e miniatura no projeto | REQ-VID-FILT-027, REQ-VID-FILT-028, REQ-VID-FILT-029, REQ-VID-FILT-030, REQ-VID-FILT-031, REQ-VID-FILT-045, REQ-VID-FILT-047, REQ-VID-FILT-053 |
| Passo 9 / RN3 | Conclusão, notificação, quota | REQ-VID-FILT-032, REQ-VID-FILT-033, REQ-VID-FILT-034 |
| Passo 10 / Pós-condições | Reprodução, original intacto | REQ-VID-FILT-035, REQ-VID-FILT-041 |
| FA2 / RN6 | Cancelamento manual | REQ-VID-FILT-036, REQ-VID-FILT-037, REQ-VID-FILT-040 |
| FA5 | Cancelamento no logout | REQ-VID-FILT-038, REQ-VID-FILT-040 |
| E1 | Quota esgotada | REQ-VID-FILT-011, REQ-VID-FILT-017 |
| E3 / E6 / RN12 | Espaço insuficiente e limpeza | REQ-VID-FILT-039, REQ-VID-FILT-040, REQ-VID-FILT-043 |
| E4 | Falha durante processamento | REQ-VID-FILT-039, REQ-VID-FILT-040, REQ-VID-FILT-041 |
| E7 | Vídeo indisponível ou acesso indevido | REQ-VID-FILT-003, REQ-VID-FILT-004, REQ-VID-FILT-042 |
| RN13 | Bloqueio de eliminação durante pedido ativo | REQ-VID-FILT-044 |
| DQ-001 | Frequência de atualização do progresso | REQ-VID-FILT-025 |
| DQ-002 | Sem retoma automática; limpeza segura | REQ-VID-FILT-040 |
| DQ-003 | Persistência do resultado até eliminação | REQ-VID-FILT-029, REQ-VID-FILT-035 |
| DQ-004 | Tempo de confirmação do pedido | REQ-VID-FILT-046 |
| DQ-005 | Áudio e compatibilidade do resultado | REQ-VID-FILT-028, REQ-VID-FILT-047 |
| DQ-006 | Isolamento da ferramenta e implantação | REQ-VID-FILT-048, REQ-VID-FILT-049 |
| RN17 | Cópia das legendas do original para o resultado | REQ-VID-LEG-044 (UC-VID-003) |
| RN11 / RN14 | Catálogo de efeitos e parâmetros fixos | REQ-VID-FILT-012, REQ-VID-FILT-050, REQ-VID-FILT-051, REQ-VID-FILT-052 |

**Decisões de qualidade**

| **ID** | **Decisão de qualidade** | **Justificação** | **Requisito(s) relacionado(s)** |
| :-- | :-- | :-- | :-- |
| DQ-001 | Atualização do progresso a cada ≤ 5 s no MVP e ≤ 2 s em produção. | Tornar verificável a atualização do estado e do progresso sem exigir atualização contínua. | REQ-VID-FILT-025 |
| DQ-002 | MVP sem retoma automática após erro, mas com estado Falhou e sem dados parciais; produção com recuperação transitória. | Escopo realista para a Fase 1. | REQ-VID-FILT-040 |
| DQ-003 | Resultados persistem até eliminação pelo utilizador, sem expiração automática no MVP. | Reutilizar a gestão de projetos e permitir edição posterior. | REQ-VID-FILT-029, REQ-VID-FILT-035 |
| DQ-004 | Confirmar pedido em menos de 3 s no MVP e menos de 1 s em produção. | Separar aceitação de pedido do processamento demorado. | REQ-VID-FILT-046 |
| DQ-005 | Preservar áudio e reproduzir o resultado nos navegadores de referência. | Evitar resultados visualmente corretos mas inutilizáveis. | REQ-VID-FILT-028, REQ-VID-FILT-047 |
| DQ-006 | Isolar a transformação de filtros da infraestrutura e empacotar dependências. | Adicionar ferramentas sem reescrever filtros; repetibilidade de implantação. | REQ-VID-FILT-048, REQ-VID-FILT-049 |


