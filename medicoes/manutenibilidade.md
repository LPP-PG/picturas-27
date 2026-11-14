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

## Reprodução

O [script](./medir-manutenibilidade.ps1) lê os ficheiros da baseline no commit `0523102` com `git show` e inspeciona os ficheiros atuais da pasta de trabalho. Assim, compara as duas versões sem mudar de branch nem substituir ficheiros locais. O commit tem de estar disponível no histórico do clone. A inspeção pode ser executada com os contentores parados.

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\medicoes\medir-manutenibilidade.ps1
```

Para repetir a verificação no Docker, arranca os três serviços numa cópia de teste com um nome de projeto Compose próprio e com as portas do RabbitMQ despublicadas. Para cada função, aplica a alteração descrita, executa `docker compose up -d --no-deps --build <serviço>` com o mesmo projeto Compose e compara os IDs da imagem e do contentor com `docker inspect` antes e depois.
