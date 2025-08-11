# Script para configurar Railway automaticamente
# Requer Railway CLI instalado

Write-Host "🚂 Configurando Railway..." -ForegroundColor Green

# Verificar se Railway CLI está instalado
try {
    $railwayVersion = railway --version
    Write-Host "✅ Railway CLI encontrado: $railwayVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI não encontrado. Instalando..." -ForegroundColor Yellow
    
    # Instalar Railway CLI via npm
    Write-Host "📦 Instalando Railway CLI..." -ForegroundColor Cyan
    npm install -g @railway/cli
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Railway CLI instalado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao instalar Railway CLI" -ForegroundColor Red
        exit 1
    }
}

# Fazer login no Railway
Write-Host "🔐 Fazendo login no Railway..." -ForegroundColor Cyan
railway login

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Login realizado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro no login do Railway" -ForegroundColor Red
    exit 1
}

# Criar novo projeto
Write-Host "🏗️ Criando novo projeto no Railway..." -ForegroundColor Cyan
railway init --name "demandas-api"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Projeto criado no Railway!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao criar projeto" -ForegroundColor Red
    exit 1
}

# Adicionar variáveis de ambiente
Write-Host "🔧 Configurando variáveis de ambiente..." -ForegroundColor Cyan

$envVars = @{
    "NODE_ENV" = "production"
    "JWT_SECRET" = "seu_jwt_secret_aqui_123456789"
    "PORT" = "3333"
}

foreach ($envVar in $envVars.GetEnumerator()) {
    Write-Host "🔐 Configurando: $($envVar.Key) = $($envVar.Value)" -ForegroundColor Yellow
    railway variables set "$($envVar.Key)=$($envVar.Value)"
}

# Deploy
Write-Host "🚀 Fazendo deploy..." -ForegroundColor Cyan
railway up

if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 Deploy realizado com sucesso!" -ForegroundColor Green
    
    # Obter URL do projeto
    $projectUrl = railway status --json | ConvertFrom-Json | Select-Object -ExpandProperty url
    Write-Host "🌐 URL do projeto: $projectUrl" -ForegroundColor Green
    
    # Salvar URL em arquivo para uso posterior
    $projectUrl | Out-File -FilePath "railway-url.txt" -Encoding UTF8
    Write-Host "💾 URL salva em railway-url.txt" -ForegroundColor Cyan
    
} else {
    Write-Host "❌ Erro no deploy" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Configuração do Railway concluída!" -ForegroundColor Green
