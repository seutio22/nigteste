# deploy-ultra-rapido.ps1
$ErrorActionPreference = "Stop"

Write-Host "Deploy Ultra Rapido (30-60 segundos)" -ForegroundColor Magenta

# Verificar se está logado nos CLIs
$railwayLoggedIn = $false
$vercelLoggedIn = $false

try {
    railway whoami 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $railwayLoggedIn = $true }
} catch { }

try {
    vercel whoami 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $vercelLoggedIn = $true }
} catch { }

if (-not $railwayLoggedIn -or -not $vercelLoggedIn) {
    Write-Host "Login necessario nos CLIs:" -ForegroundColor Red
    if (-not $railwayLoggedIn) {
        Write-Host "   - Execute: railway login" -ForegroundColor Yellow
    }
    if (-not $vercelLoggedIn) {
        Write-Host "   - Execute: vercel login" -ForegroundColor Yellow
    }
    Write-Host "Apos fazer login, execute este script novamente" -ForegroundColor Cyan
    exit 1
}

Write-Host "Iniciando deploy..." -ForegroundColor Yellow

# Deploy Railway (Backend)
Write-Host "Deploy Railway (Backend)..." -ForegroundColor Blue
$railwaySuccess = $false
try {
    cd demandas-api
    railway up --detach
    $railwaySuccess = $true
    cd ..
} catch {
    Write-Host "Erro no deploy Railway: $($_.Exception.Message)" -ForegroundColor Red
}

# Deploy Vercel (Frontend)
Write-Host "Deploy Vercel (Frontend)..." -ForegroundColor Blue
$vercelSuccess = $false
try {
    cd demandas-web
    vercel --prod --yes
    $vercelSuccess = $true
    cd ..
} catch {
    Write-Host "Erro no deploy Vercel: $($_.Exception.Message)" -ForegroundColor Red
}

# Resultado
Write-Host "Resultado do deploy:" -ForegroundColor Yellow
if ($railwaySuccess) {
    Write-Host "Railway: Sucesso" -ForegroundColor Green
} else {
    Write-Host "Railway: Erro" -ForegroundColor Red
}

if ($vercelSuccess) {
    Write-Host "Vercel: Sucesso" -ForegroundColor Green
} else {
    Write-Host "Vercel: Erro" -ForegroundColor Red
}

Write-Host "Deploy ultra rapido concluido!" -ForegroundColor Magenta
Write-Host "Tempo total: ~30-60 segundos" -ForegroundColor Cyan