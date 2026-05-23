param(
    [string[]]$Tools = @("yt-dlp", "ffmpeg", "ffprobe", "deno"),
    [string]$InstallPath = ""
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$ToolsPath = if ([string]::IsNullOrWhiteSpace($InstallPath)) {
    Join-Path $Root "tools\windows"
}
else {
    $InstallPath
}
$YtDlpPath = Join-Path $ToolsPath "yt-dlp.exe"
$FfmpegPath = Join-Path $ToolsPath "ffmpeg.exe"
$FfprobePath = Join-Path $ToolsPath "ffprobe.exe"
$DenoPath = Join-Path $ToolsPath "deno.exe"

New-Item -ItemType Directory -Force -Path $ToolsPath | Out-Null
$ToolsPath = (Resolve-Path $ToolsPath).Path
$YtDlpPath = Join-Path $ToolsPath "yt-dlp.exe"
$FfmpegPath = Join-Path $ToolsPath "ffmpeg.exe"
$FfprobePath = Join-Path $ToolsPath "ffprobe.exe"
$DenoPath = Join-Path $ToolsPath "deno.exe"

$Requested = New-Object "System.Collections.Generic.HashSet[string]" ([System.StringComparer]::OrdinalIgnoreCase)
foreach ($Tool in $Tools) {
    foreach ($Part in ($Tool -split ",")) {
        $Name = $Part.Trim()
        if ($Name.Length -gt 0) {
            [void]$Requested.Add($Name)
        }
    }
}

function Test-Requested {
    param([string]$Name)
    return $Requested.Contains($Name) -or $Requested.Contains("all")
}

function Invoke-Download {
    param(
        [string]$Uri,
        [string]$OutFile
    )

    Stop-BundledToolProcess -Destination $OutFile
    Invoke-WebRequest -Uri $Uri -OutFile $OutFile
}

function Stop-BundledToolProcess {
    param([string]$Destination)

    $Target = [System.IO.Path]::GetFullPath($Destination)
    $ProcessName = [System.IO.Path]::GetFileNameWithoutExtension($Target)
    foreach ($Process in Get-Process -Name $ProcessName -ErrorAction SilentlyContinue) {
        try {
            $ModulePath = [System.IO.Path]::GetFullPath($Process.MainModule.FileName)
            if ($ModulePath.Equals($Target, [System.StringComparison]::OrdinalIgnoreCase)) {
                $Process.Kill()
                $Process.WaitForExit(5000)
            }
        }
        catch {
        }
        finally {
            $Process.Dispose()
        }
    }
}

function Copy-ToolExecutable {
    param(
        [string]$Source,
        [string]$Destination
    )

    Stop-BundledToolProcess -Destination $Destination
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

function Get-SystemTool {
    param([string]$Name)

    $OriginalPath = $env:PATH
    try {
        $env:PATH = (($OriginalPath -split [System.IO.Path]::PathSeparator) |
            Where-Object {
                $_ -and
                ($_ -notlike "*\tools\windows*") -and
                ($_ -notlike "$ToolsPath*")
            }) -join [System.IO.Path]::PathSeparator
        return Get-Command $Name -ErrorAction SilentlyContinue
    }
    finally {
        $env:PATH = $OriginalPath
    }
}

if (Test-Requested "yt-dlp") {
    Write-Host "Installing yt-dlp..."
    Invoke-Download `
        -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" `
        -OutFile $YtDlpPath

    Write-Host "yt-dlp:"
    & $YtDlpPath --version
}
else {
    Write-Host "Skipping yt-dlp."
}

if (Test-Requested "deno") {
    Write-Host "Installing Deno JavaScript runtime..."
    $DenoZip = Join-Path ([System.IO.Path]::GetTempPath()) "loaderly-deno.zip"
    $DenoExtract = Join-Path ([System.IO.Path]::GetTempPath()) "loaderly-deno"
    if (Test-Path $DenoExtract) {
        Remove-Item -LiteralPath $DenoExtract -Recurse -Force
    }

    Invoke-Download `
        -Uri "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip" `
        -OutFile $DenoZip
    Expand-Archive -LiteralPath $DenoZip -DestinationPath $DenoExtract -Force
    Copy-ToolExecutable -Source (Join-Path $DenoExtract "deno.exe") -Destination $DenoPath

    Write-Host "deno:"
    & $DenoPath --version | Select-Object -First 1
}
else {
    Write-Host "Skipping deno."
}

$InstallFfmpeg = (Test-Requested "ffmpeg") -or (Test-Requested "ffprobe")
if ($InstallFfmpeg) {
    Write-Host "Installing or updating FFmpeg tools..."
    $Package = Get-Command winget -ErrorAction SilentlyContinue
    if ($Package) {
        winget upgrade --id Gyan.FFmpeg -e --silent --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -ne 0) {
            winget install --id Gyan.FFmpeg -e --silent --accept-package-agreements --accept-source-agreements
            if ($LASTEXITCODE -ne 0) {
                Write-Host "winget could not install or update FFmpeg. Checking available ffmpeg tools..."
            }
        }
    }

    $Ffmpeg = Get-SystemTool "ffmpeg"
    $Ffprobe = Get-SystemTool "ffprobe"
    if (-not $Ffmpeg -or -not $Ffprobe) {
        throw "FFmpeg was not found after installation. Install Gyan.FFmpeg with winget or place ffmpeg.exe and ffprobe.exe in tools\windows."
    }

    $FfmpegItem = Get-Item $Ffmpeg.Source
    $FfmpegSource = if ($FfmpegItem.Target) { $FfmpegItem.Target[0] } else { $FfmpegItem.FullName }
    Copy-ToolExecutable -Source $FfmpegSource -Destination $FfmpegPath

    $FfprobeItem = Get-Item $Ffprobe.Source
    $FfprobeSource = if ($FfprobeItem.Target) { $FfprobeItem.Target[0] } else { $FfprobeItem.FullName }
    Copy-ToolExecutable -Source $FfprobeSource -Destination $FfprobePath

    Write-Host "ffmpeg:"
    & $FfmpegPath -version | Select-Object -First 1
    Write-Host "ffprobe:"
    & $FfprobePath -version | Select-Object -First 1
}
else {
    Write-Host "Skipping ffmpeg and ffprobe."
}

Write-Host "Windows tools are ready."
