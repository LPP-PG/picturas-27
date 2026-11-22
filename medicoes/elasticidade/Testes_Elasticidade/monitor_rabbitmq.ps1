
# Monitorizacao da elasticidade - PictuRAS
# Guarda as metricas da video_queue num ficheiro CSV

$ficheiro = Join-Path $PSScriptRoot "baseline_rabbitmq.csv"

Write-Host "A iniciar monitorizacao da video_queue..."
Write-Host "Resultados guardados em: $ficheiro"
Write-Host "Para parar, prime Ctrl + C"

while ($true) {
    $data = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    try {
        $filas = docker compose exec -T rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers --formatter=json 2>$null | ConvertFrom-Json

        $video = $filas | Where-Object { $_.name -eq "video_queue" }

        if ($null -ne $video) {
            $registo = [PSCustomObject]@{
                DataHora = $data
                MensagensEspera = $video.messages_ready
                MensagensEmProcessamento = $video.messages_unacknowledged
                Consumidores = $video.consumers
            }

            $registo | Export-Csv -Path $ficheiro -NoTypeInformation -Append -Encoding UTF8

            Write-Host "$data | Espera: $($video.messages_ready) | Entregues: $($video.messages_unacknowledged) | Consumidores: $($video.consumers)"
        }
        else {
            Write-Warning "A video_queue nao foi encontrada."
        }
    }
    catch {
        Write-Warning "Erro ao consultar o RabbitMQ: $_"
    }

    Start-Sleep -Seconds 5
}