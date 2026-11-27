# Medição da manutenibilidade do processamento de vídeo

**Métrica.** Número de cenários em que uma alteração interna pode ser reimplantada sem reimplantar as outras responsabilidades de vídeo. Cada cenário vale **1** se afetar zero outras responsabilidades e **0** nos restantes casos. O alvo da separação acordada é **3/3**.

**Ambiente.** Windows, PowerShell 7.6.9, Git 2.55.0.windows.5 e Docker Compose v5.5.1. Baseline de 13/11/2026 e medição final de 14/11/2026 sobre a implementação local da branch `fase-2`.

## Resultados

| Cenário e função analisada | Base — serviço / outras responsabilidades afetadas | Após refactoring — serviço / outras afetadas | Pontuação |
|---|---|---|---:|
| C1 · Brilho [brightness](../Tools/utils/filters.py) | `video_tool` / Legendagem e extração (2) | `video_tool` / 0 | 0 → 1 |
| C2 · Legendagem [timestamp](../Tools/video/subtitles.py) | `video_tool` / Edição e extração (2) | `video_subtitles_tool` / 0 | 0 → 1 |
| C3 · Extração [sampling_times](../Tools/video/frame_extraction.py) | `video_tool` / Edição e legendagem (2) | `video_frames_tool` / 0 | 0 → 1 |
| **Total** | | | **0/3 → 3/3** |

Na base, o Dockerfile de `video_tool` copiava toda a pasta `video`. Na versão modular, o [Compose](../docker-compose.yaml#L255) associa cada serviço a um Dockerfile que inclui o código da sua responsabilidade e os módulos comuns. O resultado aplica-se às alterações locais dos três cenários. Uma alteração ao código partilhado, como `worker.py`, pode exigir reconstruir várias imagens.

Na base, a função de C1 estava em `Tools/video/effects.py`. Depois de removida a duplicação dos filtros PIL, está em `Tools/utils/filters.py`, partilhado com as ferramentas de imagem. Entre os serviços de vídeo, só o `video_tool` inclui esse ficheiro, por isso C1 continua a valer 1. Uma alteração a um filtro passa também a reconstruir as ferramentas de imagem, que é o objetivo: o filtro fica igual nas imagens e nos vídeos.

## Verificação no Docker

Usámos uma cópia de teste para fazer uma alteração interna em cada função, preservando o resultado. Guardámos o fator do brilho numa variável, separámos a parte horária dos milissegundos na formatação das legendas e guardámos a lista de instantes de amostragem numa variável antes de a devolver. Reconstruímos a imagem e reimplantámos cada serviço individualmente. Em todos os ensaios, os outros dois contentores de vídeo e o RabbitMQ mantiveram os mesmos IDs e imagens. No fim, as três filas de trabalho tinham um consumidor cada.

| Cenário | ID da imagem antes → depois | ID do contentor antes → depois |
|---|---|---|
| C1 | `bda336e63e12` → `3583d8f2eaf5` | `16165dabd3e4` → `31f285268762` |
| C2 | `f2af0a0040c8` → `6417f741c570` | `28e07c892937` → `48dbe9d2542d` |
| C3 | `4e85d50be824` → `c7bd6bc3e980` | `c6a213322805` → `e28f6112f079` |

## Ensaio complementar com a legendagem parada

Na versão modularizada, parámos o serviço de legendagem com `docker compose stop video_subtitles_tool`. Num projeto com dois vídeos, aplicámos uma alteração de velocidade e uma rotação. Ambos os resultados ficaram disponíveis na interface. Com a legendagem ainda parada, aplicámos uma rotação seguida de extração de fotogramas. A interface apresentou os fotogramas com a rotação aplicada, confirmando que os serviços de edição e de extração concluíram o processamento em sequência.

Num pedido que incluía legendagem, a interface permaneceu em *Processing* a 50% durante o período observado, sem apresentar erro. A espera é compatível com o processamento assíncrono, uma vez que a fila pode receber pedidos mesmo sem um *worker* disponível para os executar.

## Duplicação dos filtros PIL

**Métrica.** Número de filtros PIL implementados em mais de um ficheiro, entre os oito que existem para imagens e para vídeo (brilho, contraste, saturação, rodar, redimensionar, binarização, recorte e borda). Para cada filtro, conta-se em quantos ficheiros aparece a operação PIL que o implementa, por exemplo `ImageEnhance.Brightness(` no brilho ou `img.crop(` no recorte.

**Alvo e mínimo aceitável.** 0 de 8 nos dois casos. Um filtro escrito em dois sítios pode passar a dar resultados diferentes nas imagens e nos vídeos sem que ninguém repare, e isso vale para qualquer um dos oito.

**Ficheiros analisados.** O ficheiro principal de cada uma das oito ferramentas de imagem, `Tools/video/effects.py` e `Tools/utils/filters.py`. As ferramentas de IA também usam `crop` e `resize`, mas para preparar a entrada dos modelos, por isso não contam. O `Tools/cut/processor.py` tem um recorte, mas o `cut.py` importa-o sem nunca o chamar.

| | Base (`0523102`) | Depois |
|---|---:|---:|
| Filtros duplicados | 8 de 8 | 0 de 8 |
| Implementações de filtros | 16 | 8 |

Na base, cada filtro estava escrito na sua ferramenta de imagem e outra vez em `Tools/video/effects.py`. Agora os oito estão só em `Tools/utils/filters.py`, que as ferramentas de imagem e o `video_tool` importam. Medido a 15/11/2026 com o script desta pasta.

O recorte mostra o risco que a duplicação trazia. O frontend envia as margens a retirar de cada lado, mas as duas cópias tratavam esses valores como coordenadas, por isso o recorte falhava ou cortava mal nas imagens e nos vídeos. O erro vinha da base. Com o filtro num só ficheiro, bastou uma correção para os dois casos.

Para confirmar que o comportamento se manteve, comparámos pixel a pixel os filtros antigos e os novos: nas imagens com os modos RGB, P, L e RGBA e nos fotogramas de vídeo. Os resultados são iguais em todos os filtros exceto o recorte, que mudou de propósito. Os 79 testes do `video_tool`, incluindo cinco novos para o recorte, passam.

## Código repetido nas ferramentas de imagem

Depois de juntar os filtros, as oito ferramentas de imagem continuavam com o mesmo código à volta do filtro: ler a mensagem do RabbitMQ, confirmar o `procedure`, abrir e guardar a imagem, calcular o tempo de processamento e responder ao `projects`. Esse código passou para `Tools/utils/image_tool.py`, como já acontecia nos vídeos com `Tools/video/worker.py`. Cada ferramenta ficou só com o seu nome e os seus dois códigos de erro. Removemos também `Tools/cut/processor.py`, um recorte que o `cut.py` importava sem nunca usar.

| | Base (`0523102`) | Depois |
|---|---:|---:|
| Linhas das oito ferramentas e da base comum | 745 | 120 |
| Sítios que enviam uma resposta ao `projects` | 24 | 2 |

Na base, as oito ferramentas passavam os argumentos de erro fora de ordem ao `ToolMSG.send_msg`. O método lançava uma exceção em vez de responder e a ferramenta terminava até o Docker a reiniciar. Com a base comum a resposta de erro é enviada e a ferramenta continua a receber pedidos. O `ToolMSG` continua a trocar `messageId` e `correlationId` nas respostas de erro, por isso o `projects` ainda não as reconhece e o erro não chega ao utilizador. Essa troca também afeta as ferramentas de IA e ficou fora desta alteração.

Os 20 testes automáticos em `Tools/tests/` cobrem as oito ferramentas com sucesso e com o procedimento errado, uma falha de processamento seguida de um pedido válido, um parâmetro em falta, um ficheiro inexistente e uma mensagem inválida. Também corremos as ferramentas antigas e as novas com as mesmas mensagens, em imagens RGB, P, L e RGBA. Nos 31 casos de sucesso as imagens e as respostas são iguais; nos casos de erro as antigas terminavam com uma exceção.

Na aplicação, aplicámos a uma imagem de teste cada filtro e a cadeia saturação, binarização, rodar e recorte, e o resultado foi igual, pixel a pixel, ao filtro aplicado diretamente. A cadeia binarização seguida de borda, que falha desde a base, fez a borda responder com o erro 1201 sem reiniciar, e o pedido seguinte foi processado.

## Efeito no tempo de processamento dos vídeos

A divisão em três serviços mudou a forma como um vídeo é processado. Antes, o `projects` enviava uma mensagem por vídeo com o pipeline inteiro. Agora envia uma mensagem por etapa e recebe a resposta de cada uma em `video_result_queue` antes de enviar a seguinte. Medimos se isso tornou o processamento mais lento. Juntar os filtros num ficheiro não conta para este efeito: o filtro de brilho antigo e o novo demoram o mesmo (10,2 s para 300 fotogramas 1080p, nas imagens Docker das duas versões).

**Métrica.** Segundos desde o pedido de processamento (o Apply) até os resultados ficarem visíveis na API, com o projeto acabado de criar.

**Cenários.** Nenhum usa o recorte, porque na base o recorte falha e a comparação deixaria de ser justa.

- A: `sample_10s_720p.mp4` com brilho, contraste, rodar 90° e redimensionar para 640×360. É uma só etapa nas duas versões e serve de controlo.
- B: `speech_mandela_177s_1080p.webm` cortado nos primeiros 30 s, com brilho, legendas automáticas e extração de 4 fotogramas PNG. Depois da divisão são três etapas, uma em cada serviço.

**Método.** O [script](./medir-tempo-video.py) usa a API como o frontend: cria uma conta premium de teste, um projeto novo por execução, envia o vídeo, adiciona as ferramentas, pede o processamento e consulta os resultados a cada 0,25 s. Em cada cenário faz uma execução de aquecimento, que não conta, e cinco medições, das quais se usa a mediana. A base corre a partir de uma cópia do commit `0523102` com outro nome de projeto Compose (`picturas-base`). As duas versões usam o porto 8080, por isso correm à vez. Fizemos duas rondas em ordem inversa (base e depois `fase-2`, e a seguir `fase-2` e depois base) para que a ordem não pese no resultado.

**Ambiente.** AMD Ryzen 7 260 (8 núcleos, 16 threads), 31,3 GB de RAM, Windows 11 Home 10.0.26200, Docker 29.8.0 com 16 CPUs e 15,3 GB atribuídos, Docker Compose 5.5.1 e Python 3.12.10. Medido a 15/11/2026.

| Cenário | Base, ronda 1 | Base, ronda 2 | `fase-2`, ronda 1 | `fase-2`, ronda 2 |
|---|---:|---:|---:|---:|
| A (1 etapa) | 8,19 s | 8,19 s | 8,50 s | 7,65 s |
| B (3 etapas) | 31,03 s | 30,58 s | 34,20 s | 32,46 s |

Os valores de cada execução estão em [resultados](./resultados/).

No cenário A não há diferença que se possa atribuir à divisão: as duas rondas do `fase-2` diferem mais entre si do que da base.

No cenário B, o `fase-2` foi mais lento nas duas rondas, 3,2 s e 1,9 s (10,2% e 6,1%). Para ver de onde vem, corremos cada etapa diretamente dentro da imagem Docker do seu serviço, sem RabbitMQ nem `projects`. No `fase-2`, a soma das três etapas deu 33,7 s, contra 34,2 s pela API na mesma ronda, por isso as mensagens e a coordenação entre serviços custam cerca de 0,5 s. A etapa de edição, corrida três vezes em alternância nas duas versões, demorou entre 21,4 s e 21,8 s em ambas. O resto da diferença, entre 1 e 2 s, não ficou isolado. Cada etapa volta a ler as características do vídeo com `ffprobe` e escreve o resultado numa pasta própria antes de a etapa seguinte começar, mas não medimos esses passos em separado.

Após os ensaios, a equipa definiu, para cada ronda do cenário de três etapas, um alvo de aumento do tempo mediano de até 5% e um aumento máximo aceitável de 10%. O alvo ficou por atingir nas duas rondas. O limite foi excedido na primeira e respeitado na segunda.

## Reprodução

O [script](./medir-manutenibilidade.ps1) lê os ficheiros da baseline no commit `0523102` com `git show` e inspeciona os ficheiros atuais da pasta de trabalho. Na duplicação dos filtros usa `git grep` sobre o mesmo commit e sobre a pasta de trabalho. Assim, compara as duas versões sem mudar de branch nem substituir ficheiros locais. O commit tem de estar disponível no histórico do clone. A inspeção pode ser executada com os contentores parados.

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\medicoes\medir-manutenibilidade.ps1
```

Os testes das ferramentas de imagem não precisam de Docker nem de RabbitMQ:

```bash
cd Tools
pip install -r utils/requirements.txt pytest
python -m pytest tests
```

Para repetir a medição do tempo, com a versão a medir a correr em `https://localhost:8080`:

```bash
git worktree add --detach ../picturas-base 0523102
docker compose stop
docker compose -f ../picturas-base/docker-compose.yaml -p picturas-base up -d --build
python medicoes/medir-tempo-video.py --label base --reps 5
docker compose -f ../picturas-base/docker-compose.yaml -p picturas-base stop
docker compose start
python medicoes/medir-tempo-video.py --label fase-2 --reps 5
```

Os comandos correm na pasta `picturas-27`. O script só usa a biblioteca padrão do Python e guarda os resultados em `medicoes/resultados/`.

Para repetir a verificação no Docker, arranca os três serviços numa cópia de teste com um nome de projeto Compose próprio e com as portas do RabbitMQ despublicadas. Para cada função, aplica a alteração descrita, executa `docker compose up -d --no-deps --build <serviço>` com o mesmo projeto Compose e compara os IDs da imagem e do contentor com `docker inspect` antes e depois.
