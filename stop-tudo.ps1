# Script para parar Backend e Frontend
# Autor: Sistema de Demandas
# Data: 2025-08-15

Write-Host "🛑 PARANDO SISTEMA DE DEMANDAS..." -ForegroundColor Red
Write-Host "================================================" -ForegroundColor Cyan

# Função para parar processos por porta
function Stop-ProcessByPort {
    param([int]$Port, [string]$ServiceName)
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        
        if ($connections) {
            foreach ($connection in $connections) {
                $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "🔄 Parando $ServiceName (PID: $($process.Id))..." -ForegroundColor Yellow
                    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                }
            }
            Write-Host "✅ $ServiceName parado na porta $Port" -ForegroundColor Green
        } else {
            Write-Host "ℹ️  $ServiceName não estava rodando na porta $Port" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "⚠️  Erro ao parar $ServiceName: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Função para parar processos Node.js
function Stop-NodeProcesses {
    Write-Host "🔍 Procurando processos Node.js..." -ForegroundColor Blue
    
    try {
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        $tsNodeProcesses = Get-Process -Name "ts-node-dev" -ErrorAction SilentlyContinue
        
        if ($nodeProcesses) {
            Write-Host "🔄 Parando processos Node.js..." -ForegroundColor Yellow
            Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
            Write-Host "✅ Processos Node.js parados" -ForegroundColor Green
        }
        
        if ($tsNodeProcesses) {
            Write-Host "🔄 Parando processos ts-node-dev..." -ForegroundColor Yellow
            Stop-Process -Name "ts-node-dev" -Force -ErrorAction SilentlyContinue
            Write-Host "✅ Processos ts-node-dev parados" -ForegroundColor Green
        }
        
        if (-not $nodeProcesses -and -not $tsNodeProcesses) {
            Write-Host "ℹ️  Nenhum processo Node.js encontrado" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "⚠️  Erro ao parar processos Node.js: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Função para parar processos PowerShell relacionados
function Stop-PowerShellProcesses {
    Write-Host "🔍 Procurando janelas PowerShell do sistema..." -ForegroundColor Blue
    
    try {
        $currentPID = $PID
        $psProcesses = Get-Process -Name "powershell" -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $currentPID }
        
        if ($psProcesses) {
            Write-Host "🔄 Parando janelas PowerShell do sistema..." -ForegroundColor Yellow
            foreach ($process in $psProcesses) {
                if ($process.MainWindowTitle -like "*npm*" -or $process.MainWindowTitle -like "*dev*") {
                    Write-Host "   Parando PID $($process.Id): $($process.MainWindowTitle)" -ForegroundColor Gray
                    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                }
            }
            Write-Host "✅ Janelas PowerShell paradas" -ForegroundColor Green
        } else {
            Write-Host "ℹ️  Nenhuma janela PowerShell do sistema encontrada" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "⚠️  Erro ao parar processos PowerShell: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Função principal
function Stop-All {
    Write-Host "🎯 Parando sistema completo..." -ForegroundColor Magenta
    
    # Parar por portas
    Stop-ProcessByPort -Port 4000 -ServiceName "Backend"
    Stop-ProcessByPort -Port 5173 -ServiceName "Frontend"
    
    # Parar processos Node.js
    Stop-NodeProcesses
    
    # Parar processos PowerShell relacionados
    Stop-PowerShellProcesses
    
    Write-Host ""
    Write-Host "🎉 SISTEMA PARADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "💡 Para iniciar novamente: Execute start-tudo.ps1" -ForegroundColor Yellow
    Write-Host "🔄 Para verificar status: Execute check-status.ps1" -ForegroundColor Yellow
}

# Executar função principal
Stop-All
