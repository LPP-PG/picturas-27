#Requires -Version 5.1

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$baseline = '052310226c51fa57a17101c7bd1ad795674aac95'

$compose = git -C $repo show "${baseline}:docker-compose.yaml"
if ($LASTEXITCODE -ne 0) { throw 'Could not read the baseline Compose file from Git.' }

$configJson = $compose | docker compose --project-directory $repo -p picturas -f - config --format json
if ($LASTEXITCODE -ne 0) { throw 'Could not resolve the baseline Compose configuration.' }
$config = ($configJson -join "`n") | ConvertFrom-Json

$service = $config.services.video_tool
$dockerfilePath = 'Tools/video/Dockerfile'
$dockerfile = git -C $repo show "${baseline}:$dockerfilePath"
if ($LASTEXITCODE -ne 0) { throw 'Could not read the baseline video Dockerfile from Git.' }
if ($service.build.dockerfile -ne 'video/Dockerfile' -or
    $service.build.context -ne (Join-Path $repo 'Tools') -or
    $dockerfile -notcontains 'COPY ./video .' -or
    -not ($dockerfile -match '^CMD .*"video\.py"')) {
    throw 'The baseline video service does not match the expected build configuration.'
}

$scenarios = @(
    # The filters moved to a module shared with the image tools.
    @{ Id = 'C1'; Responsibility = 'Editing'; File = 'Tools/video/effects.py'; CurrentFile = 'Tools/utils/filters.py'; Function = 'brightness' }
    @{ Id = 'C2'; Responsibility = 'Subtitles'; File = 'Tools/video/subtitles.py'; Function = 'timestamp' }
    @{ Id = 'C3'; Responsibility = 'Frame extraction'; File = 'Tools/video/frame_extraction.py'; Function = 'sampling_times' }
)

$processor = git -C $repo show "${baseline}:Tools/video/video_processor.py"
if ($LASTEXITCODE -ne 0 -or
    -not ($processor -match '\bapply_frame_effects\(frame, tools\)') -or
    -not ($processor -match '^\s+from subtitles import caption_video$') -or
    -not ($processor -match '^\s+from frame_extraction import extract_frames$')) {
    throw 'Could not verify the three responsibilities in the video processor.'
}

Write-Output "Baseline: $baseline"
Write-Output ''
$evidence = foreach ($scenario in $scenarios) {
    $pattern = "^def $($scenario.Function)\("
    $match = git -C $repo grep -n -E $pattern $baseline -- $scenario.File
    if ($LASTEXITCODE -ne 0) { throw "Could not find the source for $($scenario.Id)." }
    Write-Output ($match.Substring($baseline.Length + 1))
}
$evidence

$results = foreach ($scenario in $scenarios) {
    $otherResponsibilities = @($scenarios | Where-Object Id -ne $scenario.Id).Count
    [pscustomobject]@{
        Scenario = $scenario.Id
        Responsibility = $scenario.Responsibility
        Service = 'video_tool'
        OtherResponsibilities = $otherResponsibilities
        Independent = [int]($otherResponsibilities -eq 0)
    }
}
$results | Format-Table -AutoSize
$score = ($results | Measure-Object -Property Independent -Sum).Sum
Write-Output "Independent updates: $score/$($scenarios.Count)"

$configJson = docker compose --project-directory $repo -f (Join-Path $repo 'docker-compose.yaml') config --format json
if ($LASTEXITCODE -ne 0) { throw 'Could not resolve the current Compose configuration.' }
$config = ($configJson -join [Environment]::NewLine) | ConvertFrom-Json

$videoBuilds = @($config.services.PSObject.Properties | Where-Object {
    $_.Value.build.dockerfile -match '^video[/\\]Dockerfile(?:\..+)?$'
})
$copies = @{}
foreach ($build in $videoBuilds) {
    $recipe = Get-Content -LiteralPath (Join-Path $build.Value.build.context $build.Value.build.dockerfile)
    # The video Dockerfiles copy the directory or list local sources on one line.
    $copies[$build.Name] = @($recipe -match '^\s*COPY\s+' | ForEach-Object {
        $tokens = $_.Trim() -split '\s+'
        $tokens[1..($tokens.Count - 2)]
    })
}

Write-Output ''
Write-Output 'Current checkout'
$locations = @{}
foreach ($scenario in $scenarios) {
    $file = $scenario.File
    if ($scenario.CurrentFile) { $file = $scenario.CurrentFile }
    $source = './' + ($file -replace '^Tools/', '')
    $pattern = "^def $($scenario.Function)\("
    $definition = Select-String -LiteralPath (Join-Path $repo $file) -Pattern $pattern
    if (-not $definition) { throw "Could not find the source for $($scenario.Id)." }
    Write-Output "${file}:$($definition.LineNumber)"
    $locations[$scenario.Id] = @($videoBuilds.Name | Where-Object {
        $copies[$_] -contains $source -or $copies[$_] -contains './video'
    })
    if ($locations[$scenario.Id].Count -eq 0) { throw "No Dockerfile includes $source." }
}

$results = foreach ($scenario in $scenarios) {
    $affected = $locations[$scenario.Id]
    $others = @($scenarios | Where-Object {
        $other = $_
        $other.Id -ne $scenario.Id -and @($locations[$other.Id] | Where-Object { $affected -contains $_ }).Count -gt 0
    })
    [pscustomobject]@{
        Scenario = $scenario.Id
        Responsibility = $scenario.Responsibility
        Service = $affected -join ', '
        OtherResponsibilities = $others.Count
        Independent = [int]($others.Count -eq 0)
    }
}
$results | Format-Table -AutoSize
$score = ($results | Measure-Object -Property Independent -Sum).Sum
Write-Output "Independent updates: $score/$($scenarios.Count)"

# Duplicated PIL filters: in how many files of the services that offer the filter
# is each one implemented? A filter is duplicated when it is in more than one.
$filterFiles = @(
    'Tools/brightness/brightness.py', 'Tools/contrast/contrast.py',
    'Tools/saturation/saturation.py', 'Tools/rotate/rotate.py',
    'Tools/resize/resize.py', 'Tools/binarization/binarization.py',
    'Tools/cut/cut.py', 'Tools/border/border.py',
    'Tools/video/effects.py', 'Tools/utils/filters.py'
)
$filters = [ordered]@{
    brightness = 'ImageEnhance\.Brightness\('
    contrast = 'ImageEnhance\.Contrast\('
    saturation = 'ImageEnhance\.Color\('
    rotate = 'img\.rotate\('
    resize = 'img\.resize\('
    binarization = 'ImageOps\.grayscale\('
    cut = 'img\.crop\('
    border = 'ImageOps\.expand\('
}

function Get-FilterFiles($pattern, $revision) {
    # git grep exits with 1 when nothing matches, which is a valid result here
    if ($revision) {
        @(git -C $repo grep -l -E $pattern $revision -- @filterFiles) -replace "^${revision}:", ''
    } else {
        @(git -C $repo grep -l -E $pattern -- @filterFiles)
    }
}

$duplication = foreach ($name in $filters.Keys) {
    $before = @(Get-FilterFiles $filters[$name] $baseline | Where-Object { $_ })
    $after = @(Get-FilterFiles $filters[$name] $null | Where-Object { $_ })
    [pscustomobject]@{
        Filter = $name
        FilesBefore = $before.Count
        FilesAfter = $after.Count
        After = $after -join ', '
    }
}

Write-Output ''
Write-Output 'Duplicated PIL filters'
$duplication | Format-Table -AutoSize
$implBefore = ($duplication | Measure-Object -Property FilesBefore -Sum).Sum
$implAfter = ($duplication | Measure-Object -Property FilesAfter -Sum).Sum
$dupBefore = @($duplication | Where-Object FilesBefore -gt 1).Count
$dupAfter = @($duplication | Where-Object FilesAfter -gt 1).Count
Write-Output "Implementations: $implBefore -> $implAfter"
Write-Output "Duplicated filters: $dupBefore/$($filters.Count) -> $dupAfter/$($filters.Count)"

# Message handling around the filters: lines of the eight image tools and how
# many places build a reply to the projects service.
$toolFiles = @($filterFiles | Where-Object { $_ -notmatch '^Tools/(video|utils)/' })
$sharedWorker = 'Tools/utils/image_tool.py'

function Measure-ToolCode($revision) {
    $lines = 0
    $replies = 0
    foreach ($file in $toolFiles + $sharedWorker) {
        if ($revision) {
            # The shared worker does not exist in the baseline
            if (-not (git -C $repo ls-tree --name-only $revision -- $file)) { continue }
            $text = @(git -C $repo show "${revision}:$file")
        } else {
            $path = Join-Path $repo $file
            if (-not (Test-Path -LiteralPath $path)) { continue }
            $text = @(Get-Content -LiteralPath $path)
        }
        $lines += $text.Count
        $replies += @($text -match 'send_msg\(').Count
    }
    [pscustomobject]@{ Lines = $lines; Replies = $replies }
}

$toolsBefore = Measure-ToolCode $baseline
$toolsAfter = Measure-ToolCode $null
Write-Output ''
Write-Output 'Image tools (eight tools plus the shared worker)'
Write-Output "Lines: $($toolsBefore.Lines) -> $($toolsAfter.Lines)"
Write-Output "Places that send a reply (send_msg): $($toolsBefore.Replies) -> $($toolsAfter.Replies)"
