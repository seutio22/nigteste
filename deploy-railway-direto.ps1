# deploy-railway-direto.ps1
$ErrorActionPreference = "Stop"

function Invoke-Railway {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]] $CliArgs
    )
    if (Get-Command railway -ErrorAction SilentlyContinue) {
        & railway @CliArgs
    } else {
        # No Windows o `npx @railway/cli` pode falhar com "could not determine executable to run"
        # dependendo de como os argumentos são splatados. Usamos parâmetro explícito.
        & npx --yes "@railway/cli@latest" @CliArgs
    }
}

Write-Host "🚀 Deploy Direto Railway..." -ForegroundColor Green

$originalCwd = (Get-Location).Path
$enteredRepoRoot = $false
try {
    Invoke-Railway whoami 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Não está logado no Railway. Execute 'railway login' ou 'npx @railway/cli login' primeiro!" -ForegroundColor Red
        Write-Host "💡 Dica: Abra um terminal e execute: railway login" -ForegroundColor Yellow
        exit 1
    }
    $railwayStatus = Invoke-Railway whoami 2>$null

    Write-Host "✅ Logado no Railway como: $railwayStatus" -ForegroundColor Green

    Write-Host "📦 Fazendo deploy do backend..." -ForegroundColor Cyan

    # Projeto/serviço da API demandas (evita falhar quando esta pasta está `railway link` a outro serviço, ex.: portal-colaborador-api).
    $railwayProject = if ($env:RAILWAY_PROJECT_ID) { $env:RAILWAY_PROJECT_ID } else { '2192a2e2-aa38-4290-9bd7-6c895e168b06' }
    $railwayEnv = if ($env:RAILWAY_ENVIRONMENT) { $env:RAILWAY_ENVIRONMENT } else { 'production' }
    $railwayService = if ($env:RAILWAY_SERVICE_NAME) { $env:RAILWAY_SERVICE_NAME } else { 'nigteste' }

    # Monorepo + Windows: `railway up .` sem --path-as-root dá "prefix not found". `railway up ./demandas-api --path-as-root`
    # faz o Docker usar contexto na raiz do repo e quebra o COPY do Dockerfile (package.json não encontrado).
    # O que funciona: enviar o repositório completo com `--path-as-root .` a partir desta raiz (alinhado com Root Directory = demandas-api no painel).
    $repoRoot = $PSScriptRoot
    if (-not (Test-Path (Join-Path $repoRoot "demandas-api\package.json"))) {
        $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
    }
    Set-Location $repoRoot
    $enteredRepoRoot = $true

    # `railway deploy` na CLI atual é para templates; o deploy do código usa `railway up` (como no GitHub Actions).
    Invoke-Railway up --ci --path-as-root . -p $railwayProject -e $railwayEnv -s $railwayService

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deploy Railway concluído com sucesso!" -ForegroundColor Green
        Write-Host "🌐 Backend disponível em: https://nigteste-production.up.railway.app" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Erro no deploy Railway" -ForegroundColor Red
        exit 1
    }

} catch {
    Write-Host "❌ Erro no deploy Railway: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    if ($enteredRepoRoot) { Set-Location -LiteralPath $originalCwd }
}

Write-Host "`n🎉 Deploy Railway finalizado!" -ForegroundColor Magenta
