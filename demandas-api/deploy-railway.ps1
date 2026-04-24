# Deploy direto no Railway (monorepo: usar --path-as-root a partir da raiz do repo).
$envFile = Join-Path $PSScriptRoot ".env.railway"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $env:($matches[1].Trim()) = $matches[2].Trim()
        }
    }
}
$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot
npx @railway/cli up --ci --path-as-root . --service nigteste
