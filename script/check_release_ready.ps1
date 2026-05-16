$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$failures = New-Object System.Collections.Generic.List[string]

Push-Location $Root
try {
    $trackedFiles = git ls-files
    $blockedGlobs = @(
        "dist/*",
        "src/*/bin/*",
        "src/*/obj/*",
        "tests/*/bin/*",
        "tests/*/obj/*",
        "secrets/*",
        "*.pfx",
        "*.snk",
        "*.key",
        ".env",
        ".env.*"
    )

    foreach ($file in $trackedFiles) {
        $normalized = $file -replace "\\", "/"
        foreach ($glob in $blockedGlobs) {
            if ($normalized -like $glob) {
                $failures.Add("Tracked release-blocked file: $file")
            }
        }

        $extension = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
        $scanContent = $extension -in @(".json", ".config", ".xml", ".env", ".ps1", ".props", ".targets", ".yml", ".yaml", ".toml", ".md", ".txt")
        if (-not $scanContent -or -not (Test-Path $file)) {
            continue
        }

        $content = Get-Content -Raw -LiteralPath $file -ErrorAction SilentlyContinue
        if ([string]::IsNullOrEmpty($content)) {
            continue
        }

        if ($content -match "sk-or-[A-Za-z0-9_-]{24,}") {
            $failures.Add("OpenRouter-looking secret in tracked file: $file")
        }

        if ($content -match '"openRouterApiKey"\s*:\s*"[^"\s][^"]+"') {
            $failures.Add("Legacy plaintext openRouterApiKey in tracked file: $file")
        }

        if ($content -match "(?i)(OPENROUTER_API_KEY|GITHUB_TOKEN|GH_TOKEN)\s*=") {
            $failures.Add("Environment-style secret in tracked file: $file")
        }
    }
}
finally {
    Pop-Location
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "Release readiness check passed."
