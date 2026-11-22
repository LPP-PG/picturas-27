param(
    [string]$NomeTeste = "B_R1"
)

$pasta = Join-Path $PSScriptRoot "Medicoes_Finais"
New-Item -ItemType Directory -Force -Path $pasta | Out-Null

$ficheiro = Join-Path $pasta "recursos_$NomeTeste.csv"

if (Test-Path $ficheiro) {
    Write-Error "O ficheiro ja existe. Escolhe outro nome de teste."
    exit 1
}

Write-Host "A monitorizar os recursos: $NomeTeste"
Write-Host "Resultados: $ficheiro"
Write-Host "Para terminar, prime Ctrl+C"

while ($true) {
    $data = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"

    $linhas = docker stats --no-stream `
        --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}}" 2>$null

    foreach ($linha in $linhas) {
        if ($linha -match "^picturas-video_subtitles_tool-\d+,") {
            $partes = $linha -split ",", 3

            $registo = [PSCustomObject]@{
                DataHora = $data
                Container = $partes[0]
                CPU = $partes[1]
                Memoria = $partes[2]
            }

            $registo | Export-Csv -Path $ficheiro `
                -NoTypeInformation -Append -Encoding UTF8
        }
    }

    Start-Sleep -Seconds 5
}