# Script para configurar Vercel automaticamente
# Requer Vercel CLI instalado

Write-Host "🌐 Configurando Vercel..." -ForegroundColor Green

# Verificar se Vercel CLI está instalado
try {
    $vercelVersion = vercel --version
    Write-Host "✅ Vercel CLI encontrado: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI não encontrado. Instalando..." -ForegroundColor Yellow
    
    # Instalar Vercel CLI via npm
    Write-Host "📦 Instalando Vercel CLI..." -ForegroundColor Cyan
    npm install -g vercel
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Vercel CLI instalado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao instalar Vercel CLI" -ForegroundColor Red
        exit 1
    }
}

# Fazer login no Vercel
Write-Host "🔐 Fazendo login no Vercel..." -ForegroundColor Cyan
vercel login

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Login realizado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro no login do Vercel" -ForegroundColor Red
    exit 1
}

# Ler URL do Railway (se existir)
$railwayUrl = ""
if (Test-Path "railway-url.txt") {
    $railwayUrl = Get-Content "railway-url.txt" -Raw
    Write-Host "🚂 URL do Railway encontrada: $railwayUrl" -ForegroundColor Green
} else {
    Write-Host "⚠️ URL do Railway não encontrada. Use o valor padrão." -ForegroundColor Yellow
    $railwayUrl = "https://seu-backend.railway.app"
}

# Configurar projeto no Vercel
Write-Host "🏗️ Configurando projeto no Vercel..." -ForegroundColor Cyan

# Navegar para o diretório do frontend
Set-Location "demandas-web"

# Inicializar projeto Vercel
Write-Host "🚀 Inicializando projeto Vercel..." -ForegroundColor Cyan
vercel --yes

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Projeto configurado no Vercel!" -ForegroundColor Green
    
    # Configurar variável de ambiente para API URL
    Write-Host "🔧 Configurando variável de ambiente..." -ForegroundColor Cyan
    vercel env add VITE_API_URL production $railwayUrl
    
    # Deploy
    Write-Host "🚀 Fazendo deploy..." -ForegroundColor Cyan
    vercel --prod
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "🎉 Deploy realizado com sucesso!" -ForegroundColor Green
        
        # Obter URL do projeto
        $projectUrl = vercel ls --json | ConvertFrom-Json | Select-Object -ExpandProperty url
        Write-Host "🌐 URL do projeto: $projectUrl" -ForegroundColor Green
        
        # Salvar URL em arquivo para uso posterior
        $projectUrl | Out-File -FilePath "../vercel-url.txt" -Encoding UTF8
        Write-Host "💾 URL salva em vercel-url.txt" -ForegroundColor Cyan
        
    } else {
        Write-Host "❌ Erro no deploy" -ForegroundColor Red
        exit 1
    }
    
} else {
    Write-Host "❌ Erro ao configurar projeto" -ForegroundColor Red
    exit 1
}

# Voltar ao diretório raiz
Set-Location ".."

Write-Host "🎉 Configuração do Vercel concluída!" -ForegroundColor Green
