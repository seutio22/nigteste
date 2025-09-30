# Script para iniciar Backend e Frontend simultaneamente
# Autor: Sistema de Demandas
# Data: 2025-08-15

Write-Host "🚀 INICIANDO SISTEMA DE DEMANDAS COMPLETO..." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan

# Função para verificar se uma porta está em uso
function Test-Port {
    param([int]$Port)
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        return $connection -ne $null
    }
    catch {
        return $false
    }
}

# Função para aguardar uma porta ficar disponível
function Wait-ForPort {
    param([int]$Port, [string]$ServiceName)
    $attempts = 0
    $maxAttempts = 30
    
    Write-Host "⏳ Aguardando $ServiceName na porta $Port..." -ForegroundColor Yellow
    
    while ($attempts -lt $maxAttempts) {
        if (Test-Port -Port $Port) {
            Write-Host "✅ $ServiceName está rodando na porta $Port" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 2
        $attempts++
        Write-Host "   Tentativa $attempts/$maxAttempts..." -ForegroundColor Gray
    }
    
    Write-Host "❌ Timeout: $ServiceName não iniciou na porta $Port" -ForegroundColor Red
    return $false
}

# Função para iniciar o Backend
function Start-Backend {
    Write-Host "🔧 Iniciando Backend (API)..." -ForegroundColor Blue
    
    if (Test-Port -Port 4000) {
        Write-Host "⚠️  Porta 4000 já está em uso!" -ForegroundColor Yellow
        return $false
    }
    
    # Navegar para o diretório da API
    Set-Location "demandas-api"
    
    # Iniciar o backend em background
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Minimized
    
    # Aguardar o backend iniciar
    if (Wait-ForPort -Port 4000 -ServiceName "Backend") {
        Write-Host "✅ Backend iniciado com sucesso!" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Falha ao iniciar Backend" -ForegroundColor Red
        return $false
    }
}

# Função para iniciar o Frontend
function Start-Frontend {
    Write-Host "🌐 Iniciando Frontend (Web)..." -ForegroundColor Blue
    
    if (Test-Port -Port 5173) {
        Write-Host "⚠️  Porta 5173 já está em uso!" -ForegroundColor Yellow
        return $false
    }
    
    # Navegar para o diretório do frontend
    Set-Location "demandas-web"
    
    # Iniciar o frontend em background
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev:local" -WindowStyle Minimized
    
    # Aguardar o frontend iniciar
    if (Wait-ForPort -Port 5173 -ServiceName "Frontend") {
        Write-Host "✅ Frontend iniciado com sucesso!" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Falha ao iniciar Frontend" -ForegroundColor Red
        return $false
    }
}

# Função para abrir os navegadores
function Open-Browsers {
    Write-Host "🌍 Abrindo navegadores..." -ForegroundColor Blue
    
    Start-Sleep -Seconds 3
    
    # Abrir Backend
    Start-Process "http://localhost:4000/health"
    Write-Host "✅ Backend aberto em: http://localhost:4000" -ForegroundColor Green
    
    # Abrir Frontend
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:5173"
    Write-Host "✅ Frontend aberto em: http://localhost:5173" -ForegroundColor Green
}

# Função principal
function Start-All {
    Write-Host "🎯 Iniciando sistema completo..." -ForegroundColor Magenta
    
    # Voltar para o diretório raiz
    Set-Location $PSScriptRoot
    
    # Iniciar Backend
    if (-not (Start-Backend)) {
        Write-Host "❌ Sistema não pode ser iniciado devido a falha no Backend" -ForegroundColor Red
        return
    }
    
    # Voltar para o diretório raiz
    Set-Location $PSScriptRoot
    
    # Iniciar Frontend
    if (-not (Start-Frontend)) {
        Write-Host "❌ Sistema não pode ser iniciado devido a falha no Frontend" -ForegroundColor Red
        return
    }
    
    # Voltar para o diretório raiz
    Set-Location $PSScriptRoot
    
    # Abrir navegadores
    Open-Browsers
    
    Write-Host ""
    Write-Host "🎉 SISTEMA INICIADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "📱 Backend:  http://localhost:4000" -ForegroundColor White
    Write-Host "🌐 Frontend: http://localhost:5173" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Para parar: Feche as janelas do PowerShell ou use Ctrl+C" -ForegroundColor Yellow
    Write-Host "🔄 Para reiniciar: Execute este script novamente" -ForegroundColor Yellow
}

# Executar função principal
Start-All
