$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Project = Join-Path $Root "src\Loaderly\Loaderly.csproj"

dotnet run --project $Project --configuration Debug
