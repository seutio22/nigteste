# Deploy direto no Railway
# Usa o token de .env.railway (não commitado)
$envFile = Join-Path $PSScriptRoot ".env.railway"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
            $env:($matches[1].Trim()) = $matches[2].Trim()
        }
    }
}
Set-Location $PSScriptRoot
npx @railway/cli up --service nigteste --ci
