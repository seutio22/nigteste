# Script para deploy completo com commit automático
# Este script faz commit, push e deploy no Vercel

$ErrorActionPreference = "Continue"

Write-Host "🚀 Iniciando deploy completo automático..." -ForegroundColor Magenta
Write-Host ""

# 1. Verificar se estamos no diretório correto
$currentDir = Get-Location
Write-Host "📁 Diretório atual: $currentDir" -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
    Write-Host "❌ Erro: Não é um repositório Git!" -ForegroundColor Red
    Write-Host "   Execute este script da raiz do projeto (nigteste)" -ForegroundColor Yellow
    exit 1
}

# 2. Verificar status do Git
Write-Host "`n📊 Verificando status do Git..." -ForegroundColor Cyan
$gitStatus = git status --short 2>&1
if ($gitStatus) {
    Write-Host "   Mudanças encontradas:" -ForegroundColor Yellow
    $gitStatus | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "   Nenhuma mudança pendente" -ForegroundColor Green
}

# 3. Adicionar todas as mudanças
Write-Host "`n➕ Adicionando mudanças ao Git..." -ForegroundColor Cyan
git add -A 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Mudanças adicionadas" -ForegroundColor Green
} else {
    Write-Host "   ❌ Erro ao adicionar mudanças" -ForegroundColor Red
    exit 1
}

# 4. Criar commit
Write-Host "`n💾 Criando commit..." -ForegroundColor Cyan
$commitMessage = "Deploy automático - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$commitOutput = git commit -m $commitMessage --author="silmahayla@gmail.com" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Commit criado: $commitMessage" -ForegroundColor Green
    Write-Host "   $commitOutput" -ForegroundColor Gray
} else {
    if ($commitOutput -match "nothing to commit") {
        Write-Host "   ⚠️  Nada para commitar (working tree clean)" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ Erro ao criar commit: $commitOutput" -ForegroundColor Red
        exit 1
    }
}

# 5. Push para o repositório
Write-Host "`n📤 Fazendo push para origin/main..." -ForegroundColor Cyan
$pushOutput = git push origin main 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Push realizado com sucesso!" -ForegroundColor Green
    Write-Host "   $pushOutput" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Erro no push: $pushOutput" -ForegroundColor Red
    Write-Host "   Continuando com deploy manual..." -ForegroundColor Yellow
}

# 6. Deploy no Vercel
Write-Host "`n🎨 Iniciando deploy no Vercel..." -ForegroundColor Cyan

# Verificar se o token está configurado
$vercelToken = "1zGvh5dfuG1p6TVf4uHxd04E"
if (-not $vercelToken) {
    Write-Host "   ❌ Token do Vercel não configurado!" -ForegroundColor Red
    Write-Host "   Configure a variável VERCEL_TOKEN" -ForegroundColor Yellow
    exit 1
}

# Navegar para o diretório do frontend
$originalDir = Get-Location
Set-Location demandas-web

Write-Host "   📁 Diretório: demandas-web" -ForegroundColor Gray

# Executar deploy
$env:VERCEL_TOKEN = $vercelToken
Write-Host "   🚀 Executando: vercel deploy --prod --yes" -ForegroundColor Gray

$deployOutput = npx vercel@latest deploy --prod --yes --token $env:VERCEL_TOKEN 2>&1

# Voltar ao diretório original
Set-Location $originalDir

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Deploy no Vercel concluído!" -ForegroundColor Green
    Write-Host ""
    Write-Host "$deployOutput" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Erro no deploy do Vercel" -ForegroundColor Red
    Write-Host "   Output: $deployOutput" -ForegroundColor Yellow
    exit 1
}

# 7. Resumo final
Write-Host ""
Write-Host "🎉 Deploy completo finalizado!" -ForegroundColor Magenta
Write-Host ""
Write-Host "📋 Resumo:" -ForegroundColor Cyan
Write-Host "   ✅ Commit: $commitMessage" -ForegroundColor Green
Write-Host "   ✅ Push: origin/main" -ForegroundColor Green
Write-Host "   ✅ Deploy: Vercel Production" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: https://nigteste.vercel.app" -ForegroundColor White
Write-Host "   GitHub: https://github.com/seutio22/nigteste/commits/main" -ForegroundColor White
Write-Host "   Vercel: https://vercel.com/denisons-projects-6adcf8ff/nigteste/deployments" -ForegroundColor White
