# Exercícios 1 e 2 — Entrega

### Casos de Uso e Especificação de Requisitos · Fase 1: Suporte a Vídeo no PictuRAS

## 0. Identificação

| **Campo** | **Valor** |
| :-- | :-- |
| **Grupo / Equipa** | Grupo 5 PL1 |
| **Autores** | Eduarda Ferreira PG65368; Luana Vilaverde PG65367; Daniel Rodrigues PG63934; Lucas Pinto PG63997 |
| **Data** | 2026-10-20 |
| **Versão do documento** | v2.0 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software, MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
| :-- | :-- |
| **Funcionalidade** | Criação de projetos de vídeo através de New Project, com carregamento, miniaturas e visualização no editor |
| **Perfil(s) de utilizador abrangido(s)** | Registado e Premium, com limites de duração, tamanho, armazenamento e carregamentos simultâneos. O perfil Anónimo mantém as funcionalidades de imagem existentes, mas não cria projetos de vídeo. |

**Justificação no contexto do MVP**

A funcionalidade integra os vídeos no percurso que o utilizador já conhece: escolher New Project, dar um nome ao projeto e selecionar os ficheiros. Antes de enviar, pode pré-visualizar os vídeos e perceber quais são aceites. Depois, encontra o projeto em Your projects, escolhe um vídeo pelas miniaturas e vê-o num leitor com as ferramentas correspondentes ao conteúdo.

Esta base é necessária para Recorte, Filtros e Legendas. O carregamento não consome operações diárias, mas tem de respeitar o espaço disponível, lidar com vários ficheiros e limpar dados incompletos em caso de falha ou cancelamento. A execução das três ferramentas pertence aos casos UC-VID-001, UC-VID-002 e UC-VID-003.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
| :-- | :-- |
| **ID do Caso de Uso** | UC-VID-004 |
| **Nome** | Criar um projeto de vídeo |
| **Versão** | v1.1 |
| **Autor** | Eduarda Ferreira; Luana Vilaverde; Daniel Rodrigues; Lucas Pinto |
| **Data** | 2026-10-15 |
| **Objetivo** | Criar um projeto com um ou vários vídeos, acompanhar o carregamento e abrir o projeto para visualizar um vídeo selecionado e aceder às ferramentas de vídeo. |
| **Âmbito** | New Project, validação e carregamento de vídeos, armazenamento, miniaturas, lista Your projects e visualização no editor. Não inclui executar recortes, filtros ou geração de legendas. |
| **Ator Principal** | Utilizador Registado. O Utilizador Premium segue o mesmo fluxo com limites diferentes. |
| **Stakeholders e Interesses** | **Utilizador:** quer carregar vários vídeos no mesmo projeto, conhecer os limites antes de enviar, ver o progresso e abrir os vídeos sem perder os ficheiros já guardados.<br>**Dono do sistema:** quer controlar o armazenamento e os carregamentos simultâneos por perfil.<br>**Equipa de desenvolvimento:** quer integrar vídeo na criação e abertura de projetos e disponibilizar uma base comum às três ferramentas. |
| **Pré-condições** | Sessão iniciada numa conta Registada ou Premium; o utilizador tem pelo menos um ficheiro de vídeo disponível no seu dispositivo. Não é necessário ter operações diárias restantes. |
| **Trigger** | O utilizador seleciona New Project para criar um projeto de vídeo. |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
| :-- | :-- | :-- |
| 1 | Seleciona New Project. | Apresenta o formulário com nome do projeto e seleção de conteúdo de imagens ou vídeos; indica os limites de vídeo e o espaço disponível no projeto e na conta. |
| 2 | Introduz o nome e seleciona vídeos através do seletor de ficheiros ou arrastando-os para a área de carregamento. | Apresenta os ficheiros selecionados, com nome e tamanho, e permite remover ficheiros da seleção antes da confirmação. |
| 3 | Seleciona um ficheiro para o pré-visualizar. | Apresenta a pré-visualização local no leitor e a duração identificada. Verifica os formatos, os limites por ficheiro e o espaço necessário para a seleção; identifica ficheiros rejeitados. |
| 4 | Confirma a criação com os vídeos elegíveis. | Valida novamente o perfil, os limites e o espaço disponível; reserva o espaço dos ficheiros aceites e admite transferências até ao limite de simultaneidade da conta. |
| 5 | Acompanha o carregamento. | Apresenta, por ficheiro, o estado e a percentagem de bytes enviados. Os ficheiros selecionados que aguardam uma transferência ficam identificados como A aguardar. |
| 6 | — | Após receber cada ficheiro, verifica no servidor o conteúdo, a duração e o tamanho reais; rejeita ficheiros inválidos mesmo que tenham passado a verificação local. |
| 7 | — | Extrai uma miniatura automaticamente segundo RN8 e guarda o vídeo original sem alterar o seu conteúdo. |
| 8 | — | Associa cada vídeo concluído ao projeto. O projeto passa a aparecer em Your projects após o primeiro vídeo guardado com sucesso; atualiza o espaço ocupado e liberta a respetiva reserva. |
| 9 | Aguarda o fim dos carregamentos. | Apresenta o resultado por ficheiro e disponibiliza Abrir projeto quando existe pelo menos um vídeo concluído. Os carregamentos não alteram a quota de operações. |
| 10 | Abre o projeto e seleciona um vídeo pela sua miniatura. | Apresenta o nome, a duração e o tamanho do vídeo selecionado, o leitor com a miniatura antes da reprodução e os controlos de play, pausa, avanço, som e ecrã inteiro. |
| 11 | Consulta as ferramentas do vídeo selecionado. | Apresenta Recorte, Filtros e Legendas, associadas ao vídeo selecionado. A sua utilização segue os respetivos casos de uso; não apresenta as ferramentas de imagem neste projeto. |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
| :-- | :-- |
| FA1 – Escolher imagens | No passo 1, o utilizador escolhe imagens → O sistema segue o fluxo existente de criação de projetos de imagens, com as ferramentas de imagem já definidas. Não mistura imagens e vídeos no mesmo projeto. |
| FA2 – Seleção parcialmente inválida | Nos passos 3 ou 6, alguns vídeos são rejeitados → O sistema identifica os ficheiros e os motivos. Antes do envio, pede confirmação para carregar apenas os elegíveis. Uma rejeição detetada no servidor não remove os vídeos já concluídos; os restantes podem continuar. |
| FA3 – Cancelar carregamentos | Nos passos 4 a 7, o utilizador cancela um ficheiro ou os carregamentos pendentes da seleção → O sistema cancela os ficheiros abrangidos que ainda não foram concluídos, interrompe as transferências e elimina os dados incompletos, libertando reservas e vagas. Mantém os vídeos já concluídos. Se nenhum vídeo tiver sido concluído, não deixa um projeto vazio em Your projects. |
| FA4 – Sair durante o carregamento | O utilizador tenta sair do ecrã com carregamentos pendentes → O sistema avisa que sair pode interromper o envio e apresenta Ficar ou Sair e cancelar. Ficar mantém o envio; Sair e cancelar aplica FA3 aos carregamentos pendentes. Ao fechar o separador, usa o aviso permitido pelo navegador (A4). |
| FA5 – Miniatura inicial preta | No passo 7, o fotograma inicial está quase todo preto → O sistema tenta os instantes posteriores definidos em RN8. Se todos os fotogramas extraídos forem pretos, usa o primeiro fotograma extraído com sucesso. |
| FA6 – Mais ficheiros do que vagas disponíveis | No passo 4, a seleção contém mais ficheiros do que o limite de transferências simultâneas → Os restantes aguardam no navegador. Se outras transferências da conta ocuparem todas as vagas, o sistema informa o utilizador e permite aguardar ou cancelar os ficheiros pendentes. Não inicia transferências acima do limite. |
| FA7 – Repetir após uma falha | Um ficheiro termina em Falhou → O utilizador seleciona Tentar novamente; o sistema volta a validar e reservar espaço antes de repetir apenas esse ficheiro. Se necessário, solicita nova seleção do ficheiro local. |

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
| :-- | :-- |
| E1 – Nome vazio ou nenhum vídeo elegível | Desativa Criar projeto e identifica o campo ou seleção a corrigir. |
| E2 – Ficheiro com formato não aceite, conteúdo ilegível ou limites excedidos | Rejeita o ficheiro, indica a causa e o limite relevante. Se houver outros ficheiros elegíveis, aplica FA2. |
| E3 – Espaço insuficiente no projeto ou na conta | Não aceita a seleção que excede o espaço disponível; indica o limite atingido e permite remover ficheiros da seleção antes de confirmar novamente. |
| E4 – Falha de rede, armazenamento ou extração da miniatura | Marca o ficheiro como Falhou, informa a causa e disponibiliza nova tentativa. Elimina os dados incompletos, liberta a reserva e a vaga; mantém os vídeos já concluídos. Um vídeo totalmente preto não é uma falha de extração: aplica FA5. |
| E5 – Acesso por Anónimo, por outro utilizador ou sem sessão válida | Recusa a criação de projetos de vídeo ou o acesso a conteúdo de que o utilizador não é proprietário. Mantém o acesso às funcionalidades de imagem permitido pelo perfil. |
| E6 – Pré-visualização não suportada pelo navegador | Informa que a pré-visualização não está disponível. A falha local não rejeita por si só o ficheiro; a aceitação depende da validação no servidor. Se a reprodução do vídeo guardado também falhar, mantém o projeto e apresenta a causa possível. |
| E7 – Encerramento abrupto ou interrupção sem cancelamento confirmado | Não disponibiliza ficheiros incompletos para edição. Recupera reservas e vagas abandonadas segundo A5, sem remover vídeos já concluídos. |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
| :-- | :-- |
| Garantia de Sucesso | Existe um projeto de vídeo em Your projects com pelo menos um vídeo integralmente guardado e associado, com miniatura automática e conteúdo original inalterado. O utilizador consegue selecionar vídeos e aceder ao leitor e às ferramentas de vídeo. O espaço ocupado respeita os limites; não é consumida qualquer operação diária. |
| Garantia Mínima | Não é apresentado um projeto vazio resultante de um carregamento sem sucesso; nenhum ficheiro incompleto fica disponível para edição. Os vídeos anteriormente concluídos permanecem guardados. Os ficheiros pendentes falhados ou cancelados não mantêm reservas de espaço nem vagas de carregamento; a quota de operações permanece inalterada. |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
| :-- | :-- |
| RN1 | New Project cria projetos de imagens ou de vídeos. Não é permitido misturar os dois tipos de conteúdo no mesmo projeto. Projetos de imagens usam as ferramentas existentes; projetos de vídeo apresentam Recorte, Filtros e Legendas. |
| RN2 | Só Registado e Premium têm acesso a projetos de vídeo. Apenas o proprietário pode aceder aos vídeos, às miniaturas e ao projeto de vídeo. Partilha de vídeo não faz parte deste MVP. |
| RN3 | São aceites MP4 e MOV. O servidor verifica o conteúdo real do ficheiro; a extensão não é suficiente para o aceitar. |
| RN4 | Por vídeo: Registado, duração positiva ≤ 60 s e tamanho positivo ≤ 100 MB; Premium, duração positiva ≤ 600 s e tamanho positivo ≤ 1 GB. MB e GB são decimais: 1 MB = 1 000 000 bytes e 1 GB = 1 000 000 000 bytes. |
| RN5 | Não existe limite fixo de quantidade de vídeos por projeto. O espaço ocupado no projeto não pode exceder 500 MB para Registado ou 10 GB para Premium. |
| RN6 | O armazenamento total da conta não pode exceder 2 GB para Registado ou 50 GB para Premium. O cálculo é global, incluindo conteúdos já guardados noutros projetos. |
| RN7 | Vídeos originais e resultados editados contam para o armazenamento do projeto e da conta. A aceitação de novos ficheiros considera o espaço ocupado e reservado. A reserva dos ficheiros aceites é feita antes do envio, convertida em ocupação após conclusão e libertada em caso de falha ou cancelamento. Miniaturas e legendas também ocupam armazenamento; a forma exata de contabilização desses derivados fica em Q1. |
| RN8 | Para vídeos com duração superior a 0,1 s, tenta-se extrair uma miniatura aos 0,1 s. Se estiver quase toda preta, tentam-se 1 s, 2 s, …, 10 s, apenas quando o instante é inferior à duração. Para vídeos com duração ≤ 0,1 s, usa-se o primeiro fotograma disponível. Se todos os candidatos extraídos forem pretos, usa-se o primeiro extraído com sucesso. Não existe escolha manual de capa neste caso de uso. O critério de classificação de preto fica em Q2. |
| RN9 | O original não é alterado pelo carregamento nem pela geração da miniatura. Um vídeo só fica disponível para edição depois de ter sido recebido, validado e guardado com a miniatura e associado ao projeto. |
| RN10 | Os carregamentos simultâneos são contados por conta, mesmo em projetos ou separadores diferentes: Registado, no máximo 1; Premium, no máximo 3. Este limite é independente dos limites de processamento das ferramentas. |
| RN11 | Os estados apresentados por ficheiro são A aguardar, A carregar, A validar, A preparar miniatura, Concluído, Falhou e Cancelado. Os quatro primeiros admitem cancelamento. A percentagem representa bytes enviados; atingir 100% não significa que a validação e gravação tenham terminado. |
| RN12 | Carregar, pré-visualizar, visualizar ou cancelar o carregamento de vídeos não consome operações diárias, mesmo que a quota de edição esteja esgotada. |
| RN13 | O nome do projeto tem de conter pelo menos um caráter que não seja espaço. O projeto aparece na lista depois de pelo menos um vídeo atingir Concluído. Falhas e cancelamentos posteriores não apagam vídeos já concluídos. |
| RN14 | A seleção de um vídeo dentro do projeto determina o vídeo apresentado no leitor e o alvo das ferramentas. A disponibilidade de cada operação depende das regras do respetivo caso de uso. Não existe processamento em lote neste caso. |

### 2.7 Assunções

| **ID** | **Assunção** |
| :-- | :-- |
| A1 | Os valores propostos e aceites para o MVP são os de RN4 a RN6 e RN10; devem ser alinhados com a configuração dos planos do sistema. |
| A2 | Os limites de quantidade de projetos já existentes no PictuRAS continuam aplicáveis. Este caso não define quantos projetos uma conta pode criar nem quantos pode processar ao mesmo tempo. |
| A3 | A pré-visualização antes do envio usa o ficheiro local. A validação local ajuda o utilizador, mas não substitui a validação de conteúdo e limites no servidor. |
| A4 | O navegador pode apresentar apenas um aviso genérico ao fechar ou atualizar o separador, ou não permitir aviso em certas situações. O comportamento de cancelamento explícito é garantido na navegação controlada pela aplicação; o encerramento abrupto é tratado em E7. |
| A5 | É necessário um mecanismo de recuperação de reservas e vagas abandonadas. O prazo e a deteção de inatividade ficam em Q3; não se assume continuação do envio após encerramento do navegador. |
| A6 | O editor distingue projetos pelo tipo de conteúdo. A biblioteca de vídeos corresponde aos vídeos dos projetos do proprietário, sem uma aba separada de upload. Os resultados das ferramentas ficam associados ao projeto de origem. |
| A7 | A reprodução depende dos codecs suportados pelo navegador. Aceitar um contentor MP4 ou MOV não garante que todos os seus codecs sejam reproduzíveis; este caso não impõe conversão automática do original. |
| A8 | No MVP não se impõem limites de resolução nem de taxa de fotogramas aos vídeos carregados, para além dos limites de duração e tamanho de RN4. Os codecs só condicionam a reprodução (A7). |
| A9 | A classificação dos requisitos como NOVO ou ALT (4.1) e do impacto como Manter, Estender ou Alterar (4.2) parte da documentação existente do PictuRAS (projetos, New Project, armazenamento e perfis) e deve ser confirmada no código antes da implementação. ALT indica que o requisito modifica um comportamento ou uma regra que já existe. |

### 2.8 Questões em Aberto

| **ID** | **Questão** |
| :-- | :-- |
| Q1 | Como contabilizar e reservar o espaço de miniaturas e legendas, incluindo o espaço adicional necessário para preparar derivados, mantendo os limites de RN5 e RN6? |
| Q2 | Que percentagem de píxeis escuros e que limiar de luminosidade definem um fotograma quase todo preto? |
| Q3 | Qual é o prazo de inatividade para recuperar carregamentos abandonados e libertar reservas e vagas, e qual o tempo máximo de validação/preparação de cada vídeo? |
| Q4 | Devem existir retoma de uploads após falhas e deteção de ficheiros duplicados? Como tratar nomes de vídeos repetidos? |
| Q5 | Quais os codecs de reprodução garantidos no MVP? Deve existir uma cópia de reprodução compatível quando o original não é suportado pelo navegador? |
| Q6 | Adicionar vídeos a um projeto existente terá um caso de uso separado ou uma extensão deste? Renomear, eliminar, mover e partilhar projetos de vídeo também requerem definição própria. |
| Q7 | Os limites de processamento dos casos de Recorte, Filtros e Legendas são globais por conta ou independentes por ferramenta? Como reservar espaço para os respetivos resultados? **Decidida:** o limite é global à conta e partilhado pelas três ferramentas: 1 pedido para Registado e 3 para Premium (UC-VID-001, RN7; UC-VID-002, RN7; UC-VID-003, RN11). O espaço dos resultados é tratado em cada caso de uso: o Recorte e os Filtros reservam uma estimativa (UC-VID-001, A7; UC-VID-002, A11) e as Legendas verificam o espaço na confirmação e ao guardar (UC-VID-003, A12). |
| Q8 | Confirmar os limites existentes de quantidade de projetos por perfil e a mensagem a apresentar quando forem atingidos. |
| Q9 | Devem existir limites de resolução e de taxa de fotogramas, ou uma lista de codecs aceites no carregamento, além do formato, da duração e do tamanho? |

---

## 3. Utilização de agentes de IA

| **Ferramenta / skill** | **Tarefa apoiada** | **Validação realizada pela equipa** |
| :-- | :-- | :-- |
| ChatGPT (OpenAI) | Discussão dos comportamentos, exploração de alternativas, elaboração da primeira proposta deste caso de uso e derivação das tabelas de requisitos, impacto e rastreabilidade. | As decisões de experiência e limites foram discutidas e confirmadas por um elemento da equipa na conversa. A redação e as tabelas foram geradas com apoio de IA e estão sujeitas à revisão da equipa. |
| Claude (claude.ai) | Revisão deste caso de uso e da secção 4, e reescrita da versão v1.1: divisão de requisitos compostos, ajuste de prioridades, alinhamento entre a classificação NOVO/ALT e o impacto no sistema existente, acréscimo das assunções A8 e A9 e da questão Q9, e refação da matriz de rastreabilidade. | (a equipa descreve aqui o que reviu, aceitou, alterou ou rejeitou) |
| Claude (Claude Code) | Conversão da secção 4 para o formato da ERS do Exercício 2 na v2.0: separação em requisitos funcionais e não funcionais, classificação ISO/IEC 25010, alvos MVP e produção, justificação de cada requisito e verificação da completude e dos limites do âmbito. O caso de uso, os IDs e o texto dos requisitos não foram alterados. | (a equipa descreve aqui o que reviu, aceitou, alterou ou rejeitou) |

## 4. Especificação de Requisitos do Sistema (ERS)

**Caso de Uso:** UC-VID-004 — Criar um projeto de vídeo
**Versão do dossiê:** v2.0
**Baseline do Exercício 1:** dossiê v1.1 (UC-VID-004 v1.1); requisitos derivados REQ-VID-UPLOAD-001 a REQ-VID-UPLOAD-041

### 4.1 Requisitos da ERS

#### 4.1.1 Requisitos Funcionais

| **ID** | **Requisito** | **Prioridade** | **Evolução** | **Novo/Alt** | **Origem (UC / RN / decisão)** | **Justificação** | **Critério de aceitação / verificação** |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| REQ-VID-UPLOAD-001 | O sistema deve permitir criar projetos de vídeo através de New Project. | Deve ter | Mantido | ALT | UC-VID-004: Passo 1, Trigger, A6 | Integra o vídeo no percurso de criação de projetos que o utilizador já conhece. | Dada uma conta elegível, quando abre New Project, então pode escolher conteúdo de vídeo. |
| REQ-VID-UPLOAD-002 | O sistema deve impedir a mistura de imagens e vídeos no mesmo projeto. | Deve ter | Mantido | ALT | UC-VID-004: Passo 1, FA1, RN1 | Cada tipo de projeto tem ferramentas próprias; misturar conteúdos tornaria o catálogo ambíguo (RN1). | Dada uma seleção com imagens e vídeos, quando se confirma a criação, então o sistema exige um único tipo de conteúdo. |
| REQ-VID-UPLOAD-003 | O sistema deve validar que o nome do projeto contém pelo menos um caráter que não seja espaço. | Deve ter | Mantido | ALT | UC-VID-004: Passo 2, E1, RN13 | Um projeto sem nome não pode ser identificado em Your projects (RN13). | Dado um nome vazio ou só com espaços, quando se tenta criar o projeto, então a criação é impedida. |
| REQ-VID-UPLOAD-004 | O sistema deve permitir selecionar vários vídeos através do seletor ou por arrastamento. | Deve ter | Mantido | ALT | UC-VID-004: Passo 2, RN5 | Permite reunir vários vídeos no mesmo projeto, sem limite fixo de quantidade (RN5). | Dada uma conta elegível, quando seleciona dois vídeos pelo seletor ou por arrastamento, então ambos aparecem na seleção. |
| REQ-VID-UPLOAD-005 | O sistema deve permitir remover ficheiros da seleção antes de confirmar o carregamento. | Deveria ter | Mantido | ALT | UC-VID-004: Passo 2, E3 | Permite corrigir a seleção antes de gastar espaço e transferência (E3). | Dada uma seleção, quando remove um ficheiro, então esse ficheiro não é enviado na confirmação. |
| REQ-VID-UPLOAD-006 | O sistema deve apresentar uma pré-visualização local do vídeo selecionado antes do envio. | Deveria ter | Mantido | NOVO | UC-VID-004: Passo 3, A3 | Permite confirmar o conteúdo antes de o enviar (A3). | Dado um vídeo reproduzível no navegador, quando o seleciona para pré-visualizar, então pode vê-lo antes de o enviar. |
| REQ-VID-UPLOAD-007 | O sistema deve apresentar nome, tamanho e duração identificada dos vídeos selecionados. | Deve ter | Mantido | NOVO | UC-VID-004: Passo 2, Passo 3 | O utilizador precisa destes dados para perceber se o ficheiro cumpre os limites. | Dado um vídeo local legível, quando o seleciona, então os três valores são apresentados. |
| REQ-VID-UPLOAD-008 | O sistema deve apresentar os limites aplicáveis e o espaço disponível no projeto e na conta antes da confirmação. | Deve ter | Mantido | ALT | UC-VID-004: Passo 1, Passo 3, E3 | Conhecer os limites antes de enviar evita rejeições depois da transferência. | Dada uma conta com ocupação conhecida, quando abre o formulário, então vê os limites e o espaço restante considerando as reservas. |
| REQ-VID-UPLOAD-014 | O sistema deve identificar cada ficheiro rejeitado com o respetivo motivo. | Deve ter | Mantido | NOVO | UC-VID-004: FA2, E1, E2 | O utilizador tem de saber que ficheiro foi rejeitado e porquê para o poder corrigir. | Dada uma seleção com um ficheiro rejeitado, quando termina a validação, então é identificado o ficheiro e a causa. |
| REQ-VID-UPLOAD-015 | O sistema deve pedir confirmação para enviar apenas os ficheiros elegíveis de uma seleção parcialmente rejeitada. | Deve ter | Mantido | NOVO | UC-VID-004: Passo 4, FA2 | Evita enviar uma seleção diferente da que o utilizador pretendia (FA2). | Dada uma seleção mista de válidos e inválidos, quando os inválidos são detetados antes do envio, então os restantes só são enviados após confirmação. |
| REQ-VID-UPLOAD-018 | O sistema deve contabilizar os vídeos originais e os resultados editados no espaço do projeto e da conta. | Deve ter | Mantido | ALT | UC-VID-004: Passo 8, RN7 | Os resultados das ferramentas também ocupam armazenamento e contam para os limites (RN7). | Dado um original de 20 MB e um resultado de 10 MB, quando calcula a ocupação dos vídeos, então contabiliza 30 MB em ambos os níveis. |
| REQ-VID-UPLOAD-019 | O sistema deve reservar o espaço dos ficheiros aceites antes de iniciar o envio, sem permitir reservas concorrentes que excedam os limites. | Deveria ter | Mantido | ALT | UC-VID-004: Passo 4, RN7 | Impede que pedidos concorrentes ultrapassem os limites de espaço (RN7). | Dados dois pedidos concorrentes cuja soma ultrapassa o espaço livre, quando são admitidos, então não são ambos aceites integralmente. |
| REQ-VID-UPLOAD-020 | O sistema deve converter a reserva de um ficheiro concluído em espaço ocupado. | Deveria ter | Mantido | ALT | UC-VID-004: Passo 8, RN7 | Evita contar o mesmo ficheiro duas vezes, como reserva e como ocupação (RN7). | Dado um ficheiro concluído, quando atualiza o armazenamento, então os seus bytes contam uma única vez como ocupação. |
| REQ-VID-UPLOAD-022 | O sistema deve manter A aguardar os ficheiros pendentes sem vaga de carregamento. | Deve ter | Mantido | NOVO | UC-VID-004: Passo 5, FA6, RN11 | Os ficheiros sem vaga não podem ser perdidos nem ultrapassar o limite de carregamentos (RN10). | Dada uma seleção com mais ficheiros que vagas, quando inicia o envio, então os restantes aguardam e só avançam com uma vaga disponível. |
| REQ-VID-UPLOAD-023 | O sistema deve apresentar o estado atual de cada ficheiro segundo RN11. | Deve ter | Mantido | NOVO | UC-VID-004: Passo 5, Passo 6, Passo 7, Passo 9, E4, RN11 | O carregamento tem várias fases e o utilizador precisa de saber em qual está cada ficheiro. | Dado um carregamento, quando transita entre envio, validação, miniatura e término, então o estado apresentado corresponde à fase atual. |
| REQ-VID-UPLOAD-024 | O sistema deve apresentar por ficheiro a percentagem de bytes enviados, mantendo a indicação das fases posteriores quando o envio atinge 100%. | Deve ter | Mantido | NOVO | UC-VID-004: Passo 5, RN11 | Ter 100% dos bytes enviados não significa que o vídeo esteja pronto (RN11). | Dado um ficheiro totalmente enviado mas ainda em validação, quando o envio chega a 100%, então não é apresentado como Concluído. |
| REQ-VID-UPLOAD-025 | O sistema deve gerar automaticamente a miniatura de cada vídeo aos 0,1 s, ou a partir do primeiro fotograma disponível quando a duração for ≤ 0,1 s. | Deve ter | Mantido | NOVO | UC-VID-004: Passo 7, RN8 | Cada vídeo precisa de uma miniatura para ser reconhecido e selecionado no projeto (RN8). | Dados um vídeo normal e um de duração ≤ 0,1 s, quando é gerada a miniatura, então usa o fotograma de 0,1 s no primeiro e o primeiro fotograma no segundo. |
| REQ-VID-UPLOAD-026 | O sistema deve tentar os instantes de 1 s a 10 s, apenas inferiores à duração, quando a miniatura aos 0,1 s estiver quase toda preta, e usar o primeiro fotograma extraído com sucesso se todos os candidatos forem pretos. | Deveria ter | Mantido | NOVO | UC-VID-004: Passo 7, FA5, RN8, Q2 | Uma miniatura preta não ajuda a reconhecer o vídeo (FA5). | Dados um vídeo com início preto e um totalmente preto, quando gera a miniatura, então segue os candidatos e o fallback definidos em RN8. |
| REQ-VID-UPLOAD-028 | O sistema deve disponibilizar em Your projects o projeto após o primeiro vídeo integralmente guardado e associado. | Deve ter | Mantido | ALT | UC-VID-004: Passo 8, Passo 9, RN13, Pós-condição de sucesso | Um projeto só é útil depois de ter pelo menos um vídeo utilizável (RN13). | Dado um projeto novo, quando conclui o primeiro vídeo, então aparece na lista e pode ser aberto. |
| REQ-VID-UPLOAD-029 | O sistema deve impedir o acesso às ferramentas de edição de um vídeo cujo carregamento ainda não terminou. | Deve ter | Mantido | NOVO | UC-VID-004: Passo 8, RN9, E7, Garantia mínima | Evita aplicar ferramentas a ficheiros incompletos ou ainda por validar (RN9). | Dado um vídeo em validação, quando se tenta usá-lo numa ferramenta, então o pedido é recusado. |
| REQ-VID-UPLOAD-030 | O sistema deve permitir selecionar o vídeo ativo através das miniaturas do projeto. | Deve ter | Mantido | ALT | UC-VID-004: Passo 10, RN14, A6 | A seleção define o vídeo apresentado e o alvo das ferramentas (RN14). | Dado um projeto com dois vídeos, quando escolhe a segunda miniatura, então o segundo vídeo passa a ser o selecionado. |
| REQ-VID-UPLOAD-031 | O sistema deve apresentar, para o vídeo selecionado, o nome, a duração, o tamanho e o leitor com a miniatura antes da reprodução. | Deve ter | Mantido | ALT | UC-VID-004: Passo 10, Pós-condição de sucesso, A7 | Dá ao utilizador a informação básica do vídeo antes de o reproduzir. | Dado um vídeo com codec suportado, quando o abre, então vê os três dados e a miniatura antes do play. |
| REQ-VID-UPLOAD-032 | O sistema deve disponibilizar no leitor os controlos de play, pausa, avanço, som e ecrã inteiro. | Deve ter | Mantido | ALT | UC-VID-004: Passo 10, A7 | São os controlos mínimos para ver o vídeo no editor. | Dado um vídeo reproduzível, quando o utilizador usa cada um dos cinco controlos, então cada um funciona. |
| REQ-VID-UPLOAD-033 | O sistema deve apresentar as ferramentas correspondentes ao tipo de projeto, associando as de vídeo ao vídeo selecionado. | Deve ter | Mantido | ALT | UC-VID-004: Passo 11, FA1, RN1, RN14, A6 | Cada tipo de projeto apresenta só as ferramentas que lhe servem (RN1). | Dado um projeto de vídeo, quando seleciona um vídeo, então vê Recorte, Filtros e Legendas para esse alvo; um projeto de imagens apresenta as ferramentas existentes. |
| REQ-VID-UPLOAD-034 | O sistema deve permitir cancelar ficheiros pendentes nos quatro estados canceláveis de RN11. | Deve ter | Mantido | NOVO | UC-VID-004: FA3, RN11 | O utilizador deve poder desistir de um envio em curso (FA3). | Dado cada estado cancelável, quando cancela um ficheiro ou os pendentes da seleção, então os abrangidos passam a Cancelado. |
| REQ-VID-UPLOAD-035 | O sistema deve eliminar os dados incompletos e libertar as reservas e as vagas de carregamento de ficheiros falhados ou cancelados. | Deve ter | Mantido | ALT | UC-VID-004: FA3, FA4, E4, RN7, Garantia mínima | Envios falhados ou cancelados não podem continuar a ocupar espaço nem vagas (RN7). | Dado um envio falhado ou cancelado, quando o processo termina, então não restam ficheiros parciais nem reservas ou vagas atribuídas ao envio. |
| REQ-VID-UPLOAD-036 | O sistema deve recuperar as reservas, as vagas e os dados incompletos de envios abandonados por encerramento abrupto, ao fim do prazo de inatividade definido. | Deveria ter | Mantido | ALT | UC-VID-004: E7, A5, Q3 | Envios abandonados sem cancelamento também têm de libertar os recursos (A5). | Dado um envio interrompido sem cancelamento, quando passa o prazo de inatividade, então as reservas, as vagas e os dados incompletos são libertados. |
| REQ-VID-UPLOAD-037 | O sistema deve avisar antes de sair pela navegação da aplicação com carregamentos pendentes, oferecendo Ficar ou Sair e cancelar. | Deve ter | Mantido | ALT | UC-VID-004: FA4, A4 | Sair do ecrã pode interromper o envio, por isso a decisão tem de ser do utilizador (FA4). | Dado um envio pendente, quando tenta navegar para outro ecrã, então Ficar mantém o envio e Sair e cancelar cancela os pendentes. |
| REQ-VID-UPLOAD-039 | O sistema deve permitir repetir o carregamento de um ficheiro falhado após nova validação dos limites e reserva de espaço. | Deveria ter | Mantido | NOVO | UC-VID-004: FA7, E4 | Permite recuperar de falhas sem repetir toda a seleção (FA7). | Dado um ficheiro falhado, quando escolhe Tentar novamente, então o sistema revalida e só repete esse ficheiro se tiver espaço e elegibilidade. |
| REQ-VID-UPLOAD-040 | O sistema deve manter inalterada a quota de operações durante carregamento, pré-visualização, visualização e cancelamento de vídeos. | Deve ter | Mantido | NOVO | UC-VID-004: Pré-condições, Passo 9, RN12, Pós-condição de sucesso, Garantia mínima | Carregar e ver vídeos não são operações de edição (RN12). | Dada uma conta com quota esgotada, quando carrega e visualiza um vídeo elegível, então consegue concluir e a quota permanece igual. |
| REQ-VID-UPLOAD-041 | O sistema deve informar a indisponibilidade da pré-visualização ou reprodução sem rejeitar um vídeo válido apenas por incompatibilidade do navegador. | Deveria ter | Mantido | NOVO | UC-VID-004: E6, A7 | Um vídeo válido não deve ser rejeitado por uma limitação do navegador (A7). | Dado um vídeo válido cujo codec não é suportado no navegador, quando tenta pré-visualizar ou reproduzir, então é informado e o projeto válido não é eliminado. |

#### 4.1.2 Requisitos Não Funcionais e de Qualidade

| **ID** | **Requisito** | **Característica ISO/IEC 25010** | **Alvo MVP** | **Alvo produção** | **Evolução** | **Origem (UC / DQ)** | **Critério de aceitação / verificação** |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| REQ-VID-UPLOAD-009 | O sistema deve recusar projetos de vídeo a utilizadores Anónimos ou sem sessão válida. | Segurança | Obrigatório | Obrigatório (igual: o controlo de acesso não é negociável no MVP) | Mantido | UC-VID-004: Pré-condições, E5, RN2 | Dada uma chamada de criação por Anónimo ou sem autenticação válida, quando é recebida, então é recusada no servidor. |
| REQ-VID-UPLOAD-010 | O sistema deve restringir o acesso ao projeto de vídeo e aos seus vídeos e miniaturas ao proprietário. | Segurança | Obrigatório | Obrigatório (igual: o controlo de acesso não é negociável no MVP) | Mantido | UC-VID-004: E5, RN2 | Dado um projeto de outro utilizador, quando se pede acesso ao projeto ou aos seus ficheiros, então o servidor recusa o acesso. |
| REQ-VID-UPLOAD-011 | O sistema deve aceitar apenas ficheiros de vídeo MP4 ou MOV com conteúdo real validado no servidor. | Compatibilidade | MP4 e MOV com conteúdo validado no servidor | Igual; a lista de codecs aceites fica por decidir (Q9) | Mantido | UC-VID-004: Passo 6, E2, RN3, A3 | Dado um ficheiro de texto renomeado para .mp4, quando é enviado, então é rejeitado; um MP4 ou MOV válido segue a validação restante. |
| REQ-VID-UPLOAD-012 | O sistema deve aplicar aos vídeos do perfil Registado os limites de 60 s de duração e 100 MB de tamanho, com duração e tamanho positivos e unidades decimais. | Eficiência de Desempenho (Capacidade) | 60 s e 100 MB por vídeo | Iguais, ajustáveis à configuração dos planos (A1) | Mantido | UC-VID-004: Passo 3, Passo 4, Passo 6, E2, RN4, A1 | Dado um Registado, quando são testados os valores limite (60 s e 100 MB), valores acima deles e zero, então aceita apenas ficheiros positivos dentro de ambos os limites. |
| REQ-VID-UPLOAD-013 | O sistema deve aplicar aos vídeos do perfil Premium os limites de 600 s de duração e 1 GB de tamanho, com duração e tamanho positivos e unidades decimais. | Eficiência de Desempenho (Capacidade) | 600 s e 1 GB por vídeo | Iguais, ajustáveis à configuração dos planos (A1) | Mantido | UC-VID-004: Passo 3, Passo 4, Passo 6, E2, RN4, A1 | Dado um Premium, quando são testados os valores limite (600 s e 1 GB), valores acima deles e zero, então aceita apenas ficheiros positivos dentro de ambos os limites. |
| REQ-VID-UPLOAD-016 | O sistema deve limitar o espaço ocupado e reservado por projeto a 500 MB para Registado e 10 GB para Premium. | Eficiência de Desempenho (Capacidade) | 500 MB (Registado) e 10 GB (Premium) por projeto | Iguais, ajustáveis à configuração dos planos (A1) | Mantido | UC-VID-004: Passo 4, E3, RN5, RN7, A1 | Dado um projeto no limite considerando reservas, quando se tenta aceitar mais bytes, então a seleção é recusada. |
| REQ-VID-UPLOAD-017 | O sistema deve limitar o espaço ocupado e reservado na conta a 2 GB para Registado e 50 GB para Premium. | Eficiência de Desempenho (Capacidade) | 2 GB (Registado) e 50 GB (Premium) por conta | Iguais, ajustáveis à configuração dos planos (A1) | Mantido | UC-VID-004: Passo 4, E3, RN6, RN7, A1 | Dada uma conta com vários projetos, quando uma seleção ultrapassa o total permitido, então é recusada mesmo que o projeto tenha espaço. |
| REQ-VID-UPLOAD-021 | O sistema deve limitar os carregamentos ativos por conta a um para Registado e três para Premium, independentemente do projeto ou separador. | Eficiência de Desempenho (Capacidade) | 1 (Registado) e 3 (Premium) carregamentos ativos por conta | Iguais, ajustáveis à configuração dos planos (A1) | Mantido | UC-VID-004: Passo 4, FA6, RN10, A1 | Dada uma conta com todas as vagas ocupadas, quando outro separador pede uma transferência, então não ultrapassa o limite. |
| REQ-VID-UPLOAD-027 | O sistema deve preservar o conteúdo original do vídeo durante o carregamento e a geração da miniatura. | Fiabilidade | Obrigatório: resumo criptográfico do original igual ao do ficheiro local | Obrigatório (igual: a integridade do original não é negociável) | Mantido | UC-VID-004: Passo 7, RN9, Pós-condição de sucesso | Dado o ficheiro local, quando descarrega o original guardado, então o resumo criptográfico dos bytes é igual. |
| REQ-VID-UPLOAD-038 | O sistema deve manter os vídeos concluídos quando outros ficheiros da seleção falham ou são cancelados, sem apresentar um projeto novo vazio se nenhum concluir. | Fiabilidade | Obrigatório | Obrigatório (igual: perder vídeos concluídos não é aceitável) | Mantido | UC-VID-004: FA2, FA3, E4, RN13, Garantia mínima | Dada uma seleção com um concluído e um falhado, quando termina, então o concluído permanece; com zero concluídos, não surge projeto vazio. |

#### 4.1.3 Verificação da completude e dos limites do âmbito

| **Tópico a verificar** | **Aplicável?** | **Decisão / justificação** | **Requisito(s) relacionado(s)** |
| :-- | :-- | :-- | :-- |
| Formato, codec, duração e dimensão do vídeo | Sim | São aceites MP4 e MOV, com o conteúdo validado no servidor (RN3), e limites de duração e tamanho por perfil (RN4). Não há limites de resolução nem de taxa de fotogramas no MVP (A8, Q9). A reprodução depende dos codecs suportados pelo navegador (A7, Q5). | REQ-VID-UPLOAD-011, 012, 013, 041 |
| Estado, progresso, cancelamento e resultado | Sim | Cada ficheiro passa pelos estados de RN11, com progresso em bytes enviados; os quatro primeiros estados admitem cancelamento. O resultado é um projeto em Your projects com pelo menos um vídeo concluído. | REQ-VID-UPLOAD-022, 023, 024, 028, 034, 037 |
| Falhas durante o processamento | Sim | Um ficheiro falhado passa a Falhou, com a causa; os dados incompletos, as reservas e as vagas são libertados e o utilizador pode repetir o ficheiro. Os envios abandonados são recuperados após um prazo de inatividade (A5, Q3). | REQ-VID-UPLOAD-035, 036, 038, 039 |
| Persistência e expiração dos ficheiros | Sim (persistência); Não (expiração) | Os vídeos concluídos ficam guardados no projeto, com o original inalterado, e contam para o espaço do projeto e da conta. Este caso de uso não define expiração automática; a eliminação de vídeos e projetos fica em Q6. | REQ-VID-UPLOAD-018, 020, 027, 028 |
| Perfis e contagem de operações | Sim | Só Registado e Premium criam projetos de vídeo, com limites próprios de duração, tamanho, armazenamento e carregamentos simultâneos. Carregar, pré-visualizar, visualizar e cancelar não consomem operações diárias (RN12). | REQ-VID-UPLOAD-009, 010, 012, 013, 016, 017, 021, 040 |
| Encadeamento de ferramentas e processamento em lote | Não (exclusão explícita) | Não existe processamento em lote neste caso de uso (RN14). As ferramentas de vídeo e os seus limites pertencem aos UC-VID-001, UC-VID-002 e UC-VID-003. | N/A |

**Evolução:** *Mantido* = requisito preservado do Exercício 1; *Refinado* = clarificado ou tornado verificável sem mudar a intenção; *Novo* = acrescentado para completar a ERS. **NOVO/ALT** indica o impacto face ao PictuRAS existente, não a novidade face ao Exercício 1.

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisito(s) relacionado(s)** |
| :-- | :-- | :-- | :-- |
| New Project | Alterar | O formulário existente passa a pedir o tipo de conteúdo (imagens ou vídeos), a validar o nome, a aceitar vários vídeos e a apresentar os limites e o espaço disponível. | REQ-VID-UPLOAD-001 a 008 |
| Projetos de imagens e respetivas ferramentas | Manter | Continuam no fluxo existente; não recebem vídeos nem ferramentas de vídeo. A separação é garantida pelos requisitos das linhas New Project e Editor do projeto. | Sem requisitos diretos; ver REQ-VID-UPLOAD-002 e 033 |
| Modelo e lista de projetos | Alterar | O projeto passa a identificar o tipo de conteúdo e a associar vários vídeos; só é listado depois de pelo menos um vídeo concluído. | REQ-VID-UPLOAD-028, 030, 038 |
| Editor do projeto | Alterar | Passa a ter seleção por miniaturas, leitor de vídeo e catálogo de ferramentas correspondente ao tipo de conteúdo. | REQ-VID-UPLOAD-029 a 033, 041 |
| Perfis e controlo de acesso | Alterar | Exclui o Anónimo de vídeo e passa a verificar a propriedade do projeto e dos ficheiros. Os limites por perfil de duração, tamanho e carregamentos simultâneos são novos. | REQ-VID-UPLOAD-009, 010, 012, 013, 021 |
| Quota de operações diárias | Manter | Upload, visualização e cancelamento não são operações de edição nem exigem quota disponível. | REQ-VID-UPLOAD-040 |
| Armazenamento da conta | Alterar | Passa a incluir vídeos e resultados, a considerar reservas em pedidos concorrentes e a aplicar novos limites por projeto. | REQ-VID-UPLOAD-016 a 020, 035, 036 |
| Carregamento de ficheiros | Alterar | Passa a incluir validação de vídeo no servidor, controlo de simultaneidade por conta, estados, progresso, cancelamento e geração de miniatura. | REQ-VID-UPLOAD-011, 014, 015, 022 a 027, 034 a 039 |
| Limite existente de quantidade de projetos | Manter | Continua aplicável; os valores devem ser confirmados em Q8 antes da implementação. | A2 / Q8, sem requisito numérico novo |
| Recorte, Filtros e Legendas | Estender | Utilizam o vídeo selecionado num projeto de vídeo. A execução e os limites de processamento ficam nos respetivos casos de uso. | REQ-VID-UPLOAD-029; UC-VID-001, UC-VID-002, UC-VID-003 |

### 4.3 Matriz de Rastreabilidade Atualizada

| **Elemento de origem** | **Descrição abreviada** | **Requisito(s) relacionado(s)** |
| :-- | :-- | :-- |
| Pré-condições | Sessão elegível; não exige quota de edição disponível | REQ-VID-UPLOAD-009, REQ-VID-UPLOAD-040 |
| Trigger | New Project | REQ-VID-UPLOAD-001 |
| Passo 1 | Formulário, tipo e limites | REQ-VID-UPLOAD-001, REQ-VID-UPLOAD-002, REQ-VID-UPLOAD-008 |
| Passo 2 | Nome e seleção de ficheiros | REQ-VID-UPLOAD-003, REQ-VID-UPLOAD-004, REQ-VID-UPLOAD-005, REQ-VID-UPLOAD-007 |
| Passo 3 | Pré-visualização e validação local | REQ-VID-UPLOAD-006, REQ-VID-UPLOAD-007, REQ-VID-UPLOAD-008, REQ-VID-UPLOAD-012, REQ-VID-UPLOAD-013 |
| Passo 4 | Confirmação, revalidação, reserva e vagas | REQ-VID-UPLOAD-012, REQ-VID-UPLOAD-013, REQ-VID-UPLOAD-015, REQ-VID-UPLOAD-016, REQ-VID-UPLOAD-017, REQ-VID-UPLOAD-019, REQ-VID-UPLOAD-021 |
| Passo 5 | Estados e progresso | REQ-VID-UPLOAD-022, REQ-VID-UPLOAD-023, REQ-VID-UPLOAD-024 |
| Passo 6 | Validação real no servidor | REQ-VID-UPLOAD-011, REQ-VID-UPLOAD-012, REQ-VID-UPLOAD-013, REQ-VID-UPLOAD-023 |
| Passo 7 | Miniatura e preservação do original | REQ-VID-UPLOAD-023, REQ-VID-UPLOAD-025, REQ-VID-UPLOAD-026, REQ-VID-UPLOAD-027 |
| Passo 8 | Associação, publicação e ocupação | REQ-VID-UPLOAD-018, REQ-VID-UPLOAD-020, REQ-VID-UPLOAD-028, REQ-VID-UPLOAD-029 |
| Passo 9 | Resultado e abertura | REQ-VID-UPLOAD-023, REQ-VID-UPLOAD-028, REQ-VID-UPLOAD-040 |
| Passo 10 | Seleção e leitor | REQ-VID-UPLOAD-030, REQ-VID-UPLOAD-031, REQ-VID-UPLOAD-032 |
| Passo 11 | Ferramentas do vídeo selecionado | REQ-VID-UPLOAD-033 |
| FA1 | Projeto de imagens | REQ-VID-UPLOAD-002, REQ-VID-UPLOAD-033 |
| FA2 | Seleção parcialmente rejeitada | REQ-VID-UPLOAD-014, REQ-VID-UPLOAD-015, REQ-VID-UPLOAD-038 |
| FA3 | Cancelamento | REQ-VID-UPLOAD-034, REQ-VID-UPLOAD-035, REQ-VID-UPLOAD-038 |
| FA4 | Saída do ecrã | REQ-VID-UPLOAD-035, REQ-VID-UPLOAD-037 |
| FA5 | Fotograma preto | REQ-VID-UPLOAD-025, REQ-VID-UPLOAD-026 |
| FA6 | Espera por vagas | REQ-VID-UPLOAD-021, REQ-VID-UPLOAD-022 |
| FA7 | Nova tentativa | REQ-VID-UPLOAD-039 |
| E1 | Nome ou seleção inválidos | REQ-VID-UPLOAD-003, REQ-VID-UPLOAD-014 |
| E2 | Formato, conteúdo ou limites inválidos | REQ-VID-UPLOAD-011, REQ-VID-UPLOAD-012, REQ-VID-UPLOAD-013, REQ-VID-UPLOAD-014 |
| E3 | Armazenamento insuficiente | REQ-VID-UPLOAD-005, REQ-VID-UPLOAD-008, REQ-VID-UPLOAD-016, REQ-VID-UPLOAD-017 |
| E4 | Falha de transferência ou preparação | REQ-VID-UPLOAD-023, REQ-VID-UPLOAD-035, REQ-VID-UPLOAD-038, REQ-VID-UPLOAD-039 |
| E5 | Acesso recusado | REQ-VID-UPLOAD-009, REQ-VID-UPLOAD-010 |
| E6 | Codec não suportado no navegador | REQ-VID-UPLOAD-041 |
| E7 | Encerramento abrupto | REQ-VID-UPLOAD-029, REQ-VID-UPLOAD-036 |
| Sucesso | Projeto utilizável, original intacto e quota inalterada | REQ-VID-UPLOAD-027, REQ-VID-UPLOAD-028, REQ-VID-UPLOAD-031, REQ-VID-UPLOAD-032, REQ-VID-UPLOAD-040 |
| Garantia mínima | Sem dados parciais; preservação dos concluídos | REQ-VID-UPLOAD-029, REQ-VID-UPLOAD-035, REQ-VID-UPLOAD-036, REQ-VID-UPLOAD-038, REQ-VID-UPLOAD-040 |
| RN1 | Tipo único e ferramentas correspondentes | REQ-VID-UPLOAD-002, REQ-VID-UPLOAD-033 |
| RN2 | Perfis e propriedade | REQ-VID-UPLOAD-009, REQ-VID-UPLOAD-010 |
| RN3 | MP4/MOV e conteúdo real | REQ-VID-UPLOAD-011 |
| RN4 | Limites por vídeo e unidades | REQ-VID-UPLOAD-012, REQ-VID-UPLOAD-013 |
| RN5 | Quantidade sujeita a armazenamento do projeto | REQ-VID-UPLOAD-004, REQ-VID-UPLOAD-016 |
| RN6 | Armazenamento global da conta | REQ-VID-UPLOAD-017 |
| RN7 | Ocupação e reservas | REQ-VID-UPLOAD-016, REQ-VID-UPLOAD-017, REQ-VID-UPLOAD-018, REQ-VID-UPLOAD-019, REQ-VID-UPLOAD-020, REQ-VID-UPLOAD-035, REQ-VID-UPLOAD-036 |
| RN8 | Miniatura automática e fallback | REQ-VID-UPLOAD-025, REQ-VID-UPLOAD-026 |
| RN9 | Original intacto e disponibilidade só após conclusão | REQ-VID-UPLOAD-027, REQ-VID-UPLOAD-029 |
| RN10 | Simultaneidade por conta | REQ-VID-UPLOAD-021 |
| RN11 | Estados e progresso de envio | REQ-VID-UPLOAD-022, REQ-VID-UPLOAD-023, REQ-VID-UPLOAD-024, REQ-VID-UPLOAD-034 |
| RN12 | Upload e visualização sem operações | REQ-VID-UPLOAD-040 |
| RN13 | Nome, publicação e preservação | REQ-VID-UPLOAD-003, REQ-VID-UPLOAD-028, REQ-VID-UPLOAD-038 |
| RN14 | Vídeo ativo e ferramentas | REQ-VID-UPLOAD-030, REQ-VID-UPLOAD-033 |
| A1 | Valores do MVP | REQ-VID-UPLOAD-012, REQ-VID-UPLOAD-013, REQ-VID-UPLOAD-016, REQ-VID-UPLOAD-017, REQ-VID-UPLOAD-021 |
| A2 | Quantidade de projetos existente | Sem requisito novo: limite existente mantido; valores por confirmar em Q8. |
| A3 | Validação local não substitui servidor | REQ-VID-UPLOAD-006, REQ-VID-UPLOAD-011 |
| A4 | Avisos sujeitos ao navegador | REQ-VID-UPLOAD-037 |
| A5 | Recuperação de abandonos | REQ-VID-UPLOAD-036 |
| A6 | Vídeos integrados em projetos | REQ-VID-UPLOAD-001, REQ-VID-UPLOAD-030, REQ-VID-UPLOAD-033 |
| A7 | Compatibilidade de reprodução | REQ-VID-UPLOAD-031, REQ-VID-UPLOAD-032, REQ-VID-UPLOAD-041 |
| A8 | Sem limites de resolução nem de fotogramas por segundo no MVP | Sem requisito novo: assunção de âmbito; ver Q9. |
| A9 | Critério de classificação NOVO/ALT e Manter/Estender/Alterar | Sem requisito: assunção de método; confirmar no código. |
| Q1 a Q9 | Decisões ainda não fechadas | Não originam requisitos enquanto não forem resolvidas. |
