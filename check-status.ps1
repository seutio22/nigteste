# Script para verificar status do Backend e Frontend
# Autor: Sistema de Demandas
# Data: 2025-08-15

Write-Host "🔍 VERIFICANDO STATUS DO SISTEMA..." -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Cyan

# Função para verificar se uma porta está em uso
function Test-Port {
    param([int]$Port, [string]$ServiceName)
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        
        if ($connections) {
            foreach ($connection in $connections) {
                $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "✅ $ServiceName está rodando na porta $Port (PID: $($process.Id))" -ForegroundColor Green
                    Write-Host "   Processo: $($process.ProcessName)" -ForegroundColor Gray
                    Write-Host "   Iniciado: $($process.StartTime)" -ForegroundColor Gray
                    return $true
                }
            }
        } else {
            Write-Host "❌ $ServiceName não está rodando na porta $Port" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "⚠️  Erro ao verificar $ServiceName: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

# Função para testar conectividade
function Test-Connectivity {
    param([int]$Port, [string]$ServiceName, [string]$Endpoint)
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port$Endpoint" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $ServiceName respondeu com sucesso (Status: $($response.StatusCode))" -ForegroundColor Green
            return $true
        } else {
            Write-Host "⚠️  $ServiceName respondeu com status: $($response.StatusCode)" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "❌ $ServiceName não respondeu: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Função para verificar processos Node.js
function Check-NodeProcesses {
    Write-Host "🔍 Verificando processos Node.js..." -ForegroundColor Blue
    
    try {
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        $tsNodeProcesses = Get-Process -Name "ts-node-dev" -ErrorAction SilentlyContinue
        
        if ($nodeProcesses) {
            Write-Host "✅ Processos Node.js encontrados:" -ForegroundColor Green
            foreach ($process in $nodeProcesses) {
                Write-Host "   PID: $($process.Id), Iniciado: $($process.StartTime)" -ForegroundColor Gray
            }
        } else {
            Write-Host "ℹ️  Nenhum processo Node.js encontrado" -ForegroundColor Gray
        }
        
        if ($tsNodeProcesses) {
            Write-Host "✅ Processos ts-node-dev encontrados:" -ForegroundColor Green
            foreach ($process in $tsNodeProcesses) {
                Write-Host "   PID: $($process.Id), Iniciado: $($process.StartTime)" -ForegroundColor Gray
            }
        } else {
            Write-Host "ℹ️  Nenhum processo ts-node-dev encontrado" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "⚠️  Erro ao verificar processos Node.js: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Função principal
function Check-All {
    Write-Host "🎯 Verificando sistema completo..." -ForegroundColor Magenta
    
    # Verificar portas
    $backendRunning = Test-Port -Port 4000 -ServiceName "Backend"
    $frontendRunning = Test-Port -Port 5173 -ServiceName "Frontend"
    
    Write-Host ""
    
    # Testar conectividade
    if ($backendRunning) {
        Write-Host "🔍 Testando conectividade do Backend..." -ForegroundColor Blue
        Test-Connectivity -Port 4000 -ServiceName "Backend" -Endpoint "/health"
    }
    
    if ($frontendRunning) {
        Write-Host "🔍 Testando conectividade do Frontend..." -ForegroundColor Blue
        Test-Connectivity -Port 5173 -ServiceName "Frontend" -Endpoint "/"
    }
    
    Write-Host ""
    
    # Verificar processos
    Check-NodeProcesses
    
    Write-Host ""
    Write-Host "📊 RESUMO DO STATUS:" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    
    if ($backendRunning) {
        Write-Host "✅ Backend:  RODANDO na porta 4000" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend:  PARADO" -ForegroundColor Red
    }
    
    if ($frontendRunning) {
        Write-Host "✅ Frontend: RODANDO na porta 5173" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend: PARADO" -ForegroundColor Red
    }
    
    Write-Host ""
    
    if ($backendRunning -and $frontendRunning) {
        Write-Host "🎉 SISTEMA FUNCIONANDO PERFEITAMENTE!" -ForegroundColor Green
        Write-Host "🌐 Acesse: http://localhost:5173" -ForegroundColor White
    } elseif ($backendRunning -or $frontendRunning) {
        Write-Host "⚠️  SISTEMA PARCIALMENTE FUNCIONANDO" -ForegroundColor Yellow
        Write-Host "💡 Execute start-tudo.ps1 para iniciar tudo" -ForegroundColor Yellow
    } else {
        Write-Host "❌ SISTEMA COMPLETAMENTE PARADO" -ForegroundColor Red
        Write-Host "💡 Execute start-tudo.ps1 para iniciar tudo" -ForegroundColor Yellow
    }
}

# Executar função principal
Check-All
