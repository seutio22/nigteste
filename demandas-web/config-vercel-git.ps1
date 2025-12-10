# Script para configurar integração Git-Vercel via API
$VERCEL_TOKEN = "1zGvh5dfuG1p6TVf4uHxd04E"
$PROJECT_ID = "prj_YCSWa1BsHC0v96zzKpf9KYypIVG6"
$ORG_ID = "team_E3rouVsN5DmrJbiNvzq5JIEv"

$headers = @{
    "Authorization" = "Bearer $VERCEL_TOKEN"
    "Content-Type" = "application/json"
}

Write-Host "🔍 Verificando configuração atual do projeto..." -ForegroundColor Cyan

# 1. Buscar configuração atual
try {
    $url = "https://api.vercel.com/v9/projects/$PROJECT_ID"
    $project = Invoke-RestMethod -Uri $url -Method GET -Headers $headers
    
    Write-Host "✅ Projeto encontrado: $($project.name)" -ForegroundColor Green
    Write-Host "   Git Repository: $($project.link.type)/$($project.link.repo)" -ForegroundColor Yellow
    Write-Host "   Production Branch: $($project.link.productionBranch)" -ForegroundColor Yellow
    Write-Host "   Root Directory: $($project.rootDirectory)" -ForegroundColor Yellow
    Write-Host "   Build Command: $($project.buildCommand)" -ForegroundColor Yellow
    Write-Host "   Output Directory: $($project.outputDirectory)" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Erro ao buscar projeto: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n🔧 Configurando integração Git..." -ForegroundColor Cyan

# 2. Atualizar configuração Git
$gitConfig = @{
    gitRepository = @{
        type = "github"
        repo = "seutio22/nigteste"
        productionBranch = "main"
    }
    rootDirectory = "demandas-web"
    buildCommand = "npm run build"
    outputDirectory = "dist"
    installCommand = "npm install"
    framework = $null
} | ConvertTo-Json -Depth 10

try {
    $url = "https://api.vercel.com/v9/projects/$PROJECT_ID"
    $response = Invoke-RestMethod -Uri $url -Method PATCH -Headers $headers -Body $gitConfig
    
    Write-Host "✅ Configuração Git atualizada com sucesso!" -ForegroundColor Green
    Write-Host "   Repository: $($response.link.type)/$($response.link.repo)" -ForegroundColor Yellow
    Write-Host "   Branch: $($response.link.productionBranch)" -ForegroundColor Yellow
    Write-Host "   Root Directory: $($response.rootDirectory)" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Erro ao atualizar configuração: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Detalhes: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n🌐 Verificando variáveis de ambiente..." -ForegroundColor Cyan

# 3. Verificar variáveis de ambiente
try {
    $url = "https://api.vercel.com/v9/projects/$PROJECT_ID/env"
    $envVars = Invoke-RestMethod -Uri $url -Method GET -Headers $headers
    
    $viteApiUrl = $envVars.envs | Where-Object { $_.key -eq "VITE_API_URL" }
    if ($viteApiUrl) {
        Write-Host "✅ VITE_API_URL já configurada: $($viteApiUrl.value)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  VITE_API_URL não encontrada. Configure manualmente em:" -ForegroundColor Yellow
        Write-Host "   https://vercel.com/denisons-projects-6adcf8ff/nigteste/settings/environment-variables" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Não foi possível verificar variáveis de ambiente" -ForegroundColor Yellow
}

Write-Host "`n✅ Configuração concluída!" -ForegroundColor Green
Write-Host "`n📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Verifique se o GitHub App do Vercel está instalado:" -ForegroundColor White
Write-Host "      https://github.com/settings/installations" -ForegroundColor Yellow
Write-Host "   2. Faça um push na branch gh-pages para testar o deploy automático" -ForegroundColor White
Write-Host "   3. Acompanhe os deploys em:" -ForegroundColor White
Write-Host "      https://vercel.com/denisons-projects-6adcf8ff/nigteste/deployments" -ForegroundColor Yellow
