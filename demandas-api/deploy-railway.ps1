# Deploy direto no Railway
# IMPORTANTE: Deploy da RAIZ do repo para o railway.json com rootDirectory: demandas-api ser encontrado
$envFile = Join-Path $PSScriptRoot ".env.railway"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $env:($matches[1].Trim()) = $matches[2].Trim()
        }
    }
}
# Ir para a raiz do repo (pai de demandas-api)
$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot
npx @railway/cli up --service nigteste --ci
