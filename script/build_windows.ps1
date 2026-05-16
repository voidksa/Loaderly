param(
    [ValidateSet("Debug", "Release")]
    [string]$Configuration = "Release",

    [string]$OutputPath = "",

    [switch]$Sign,

    [switch]$RequireSigning,

    [string]$CertificateThumbprint = "",

    [string]$TimestampUrl = "http://timestamp.digicert.com",

    [string]$SignToolPath = "",

    [switch]$NoRestore
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Project = Join-Path $Root "src\Loaderly\Loaderly.csproj"

function Resolve-SignTool {
    if (-not [string]::IsNullOrWhiteSpace($SignToolPath)) {
        if (-not (Test-Path $SignToolPath)) {
            throw "SignToolPath does not exist: $SignToolPath"
        }

        return (Resolve-Path $SignToolPath).Path
    }

    $command = Get-Command "signtool.exe" -ErrorAction SilentlyContinue
    if ($null -ne $command) {
        return $command.Source
    }

    $kitRoot = Join-Path ${env:ProgramFiles(x86)} "Windows Kits\10\bin"
    if (Test-Path $kitRoot) {
        $candidate = Get-ChildItem -Path $kitRoot -Recurse -Filter "signtool.exe" -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match "\\x64\\signtool\.exe$" } |
            Sort-Object FullName -Descending |
            Select-Object -First 1
        if ($null -ne $candidate) {
            return $candidate.FullName
        }
    }

    return $null
}

function Invoke-SignFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not ($Sign -or $RequireSigning)) {
        return
    }

    if ([string]::IsNullOrWhiteSpace($CertificateThumbprint)) {
        if ($RequireSigning) {
            throw "Signing is required, but CertificateThumbprint was not provided."
        }

        Write-Warning "Skipping signing for $Path because CertificateThumbprint was not provided."
        return
    }

    $tool = Resolve-SignTool
    if ($null -eq $tool) {
        if ($RequireSigning) {
            throw "Signing is required, but signtool.exe was not found."
        }

        Write-Warning "Skipping signing for $Path because signtool.exe was not found."
        return
    }

    & $tool sign /fd SHA256 /tr $TimestampUrl /td SHA256 /sha1 $CertificateThumbprint $Path
    if ($LASTEXITCODE -ne 0) {
        throw "signtool failed for $Path"
    }
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $Root "dist\windows"
}

if (Test-Path $OutputPath) {
    $ResolvedRoot = (Resolve-Path $Root).Path
    $ResolvedOutput = (Resolve-Path $OutputPath).Path
    if (-not $ResolvedOutput.StartsWith($ResolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to clean output outside repository: $ResolvedOutput"
    }

    Get-ChildItem -LiteralPath $OutputPath -Force | Remove-Item -Recurse -Force
}

$AppPublishArgs = @(
    $Project,
    "--configuration", $Configuration,
    "--runtime", "win-x64",
    "--self-contained", "true",
    "-p:PublishSingleFile=false",
    "--output", $OutputPath
)

if ($NoRestore) {
    $AppPublishArgs += "--no-restore"
}

dotnet publish @AppPublishArgs

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Invoke-SignFile -Path (Join-Path $OutputPath "Loaderly.exe")

$SourceTools = Join-Path $Root "tools\windows"
if (Test-Path $SourceTools) {
    $PublishedTools = Join-Path $OutputPath "tools\windows"
    New-Item -ItemType Directory -Force -Path $PublishedTools | Out-Null
    foreach ($ToolName in @("yt-dlp.exe", "ffmpeg.exe", "ffprobe.exe", "deno.exe")) {
        $ToolPath = Join-Path $SourceTools $ToolName
        if (Test-Path $ToolPath) {
            Copy-Item -Path $ToolPath -Destination $PublishedTools -Force
        }
    }
}

$PublishedScripts = Join-Path $OutputPath "script"
New-Item -ItemType Directory -Force -Path $PublishedScripts | Out-Null
Copy-Item -LiteralPath (Join-Path $Root "script\install_windows_tools.ps1") -Destination $PublishedScripts -Force

Write-Host "Windows build written to $OutputPath"
