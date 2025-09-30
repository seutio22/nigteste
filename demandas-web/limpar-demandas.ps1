# Script para limpar demandas incorretas
# Execute este script para remover dados que foram inseridos incorretamente

Write-Host "🔧 Script para Limpar Demandas Incorretas" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$API_BASE = "http://localhost:3333"

# Função para verificar se o backend está rodando
function Test-Backend {
    try {
        $response = Invoke-WebRequest -Uri "$API_BASE/health" -Method GET -TimeoutSec 5
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

# Função para verificar dados atuais
function Get-Demandas {
    try {
        $response = Invoke-WebRequest -Uri "$API_BASE/demandas" -Method GET
        $demandas = $response.Content | ConvertFrom-Json
        return $demandas
    }
    catch {
        Write-Host "❌ Erro ao buscar demandas: $($_.Exception.Message)" -ForegroundColor Red
        return @()
    }
}

# Função para identificar dados incorretos
function Get-DemandasIncorretas {
    param($demandas)
    
    $incorretas = @()
    
    foreach ($demanda in $demandas) {
        # Dados incorretos são aqueles que:
        # 1. Não têm ticket (campo obrigatório para demandas reais)
        # 2. Têm apenas nome e tipoServicoId (dados mestres simples)
        # 3. Não têm clienteId (campo obrigatório para demandas reais)
        
        if (-not $demanda.ticket -or ($demanda.nome -and -not $demanda.clienteId)) {
            $incorretas += $demanda
        }
    }
    
    return $incorretas
}

# Função para remover demanda
function Remove-Demanda {
    param($id)
    
    try {
        $response = Invoke-WebRequest -Uri "$API_BASE/demandas/$id" -Method DELETE
        return $response.StatusCode -eq 200
    }
    catch {
        Write-Host "❌ Erro ao remover demanda $id`: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Função para limpar dados incorretos
function Clear-DemandasIncorretas {
    Write-Host "🔍 Verificando dados atuais..." -ForegroundColor Yellow
    
    $demandas = Get-Demandas
    if ($demandas.Count -eq 0) {
        Write-Host "✅ Nenhuma demanda encontrada no banco de dados." -ForegroundColor Green
        return
    }
    
    Write-Host "📊 Total de demandas encontradas: $($demandas.Count)" -ForegroundColor White
    
    $incorretas = Get-DemandasIncorretas -demandas $demandas
    
    if ($incorretas.Count -eq 0) {
        Write-Host "✅ Nenhuma demanda incorreta encontrada!" -ForegroundColor Green
        return
    }
    
    Write-Host "🚨 Demandas incorretas identificadas: $($incorretas.Count)" -ForegroundColor Red
    
    foreach ($incorreta in $incorretas) {
        Write-Host "  - ID: $($incorreta.id), Nome: $($incorreta.nome), Ticket: $($incorreta.ticket)" -ForegroundColor Yellow
    }
    
    $confirmacao = Read-Host "`nDeseja remover estas demandas incorretas? (S/N)"
    
    if ($confirmacao -eq "S" -or $confirmacao -eq "s") {
        Write-Host "🗑️ Removendo demandas incorretas..." -ForegroundColor Yellow
        
        $removidas = 0
        foreach ($incorreta in $incorretas) {
            if (Remove-Demanda -id $incorreta.id) {
                Write-Host "✅ Removida: $($incorreta.nome)" -ForegroundColor Green
                $removidas++
            }
            else {
                Write-Host "❌ Falha ao remover: $($incorreta.nome)" -ForegroundColor Red
            }
        }
        
        Write-Host "`n🎯 Resumo da limpeza:" -ForegroundColor Cyan
        Write-Host "  - Total de incorretas: $($incorretas.Count)" -ForegroundColor White
        Write-Host "  - Removidas com sucesso: $removidas" -ForegroundColor Green
        Write-Host "  - Falhas: $($incorretas.Count - $removidas)" -ForegroundColor Red
    }
    else {
        Write-Host "❌ Operação cancelada pelo usuário." -ForegroundColor Yellow
    }
}

# Função para limpar todas as demandas
function Clear-TodasDemandas {
    Write-Host "🚨 ATENÇÃO: Esta operação irá remover TODAS as demandas!" -ForegroundColor Red
    $confirmacao = Read-Host "Tem certeza? Digite 'SIM' para confirmar"
    
    if ($confirmacao -eq "SIM") {
        Write-Host "💥 Removendo TODAS as demandas..." -ForegroundColor Red
        
        $demandas = Get-Demandas
        if ($demandas.Count -eq 0) {
            Write-Host "✅ Nenhuma demanda para remover." -ForegroundColor Green
            return
        }
        
        $removidas = 0
        foreach ($demanda in $demandas) {
            if (Remove-Demanda -id $demanda.id) {
                Write-Host "✅ Removida: $($demanda.ticket)" -ForegroundColor Green
                $removidas++
            }
            else {
                Write-Host "❌ Falha ao remover: $($demanda.ticket)" -ForegroundColor Red
            }
        }
        
        Write-Host "`n🎯 Limpeza total concluída!" -ForegroundColor Cyan
        Write-Host "  - Total removido: $removidas" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Operação cancelada pelo usuário." -ForegroundColor Yellow
    }
}

# Função para mostrar menu
function Show-Menu {
    Write-Host "`n🛠️ Escolha uma opção:" -ForegroundColor Cyan
    Write-Host "1. Verificar dados atuais" -ForegroundColor White
    Write-Host "2. Limpar dados incorretos" -ForegroundColor White
    Write-Host "3. Limpar TODAS as demandas (CUIDADO!)" -ForegroundColor Red
    Write-Host "4. Sair" -ForegroundColor White
}

# Função principal
function Main {
    # Verificar se o backend está rodando
    if (-not (Test-Backend)) {
        Write-Host "❌ Backend não está rodando em $API_BASE" -ForegroundColor Red
        Write-Host "   Certifique-se de que o servidor está ativo antes de executar este script." -ForegroundColor Yellow
        return
    }
    
    Write-Host "✅ Backend conectado com sucesso!" -ForegroundColor Green
    
    do {
        Show-Menu
        $opcao = Read-Host "Digite sua opção (1-4)"
        
        switch ($opcao) {
            "1" {
                Write-Host "`n🔍 Verificando dados atuais..." -ForegroundColor Yellow
                $demandas = Get-Demandas
                if ($demandas.Count -eq 0) {
                    Write-Host "✅ Nenhuma demanda encontrada no banco de dados." -ForegroundColor Green
                }
                else {
                    Write-Host "📊 Total de demandas: $($demandas.Count)" -ForegroundColor White
                    foreach ($demanda in $demandas) {
                        Write-Host "  - ID: $($demanda.id), Ticket: $($demanda.ticket), Status: $($demanda.status)" -ForegroundColor Gray
                    }
                }
            }
            "2" {
                Clear-DemandasIncorretas
            }
            "3" {
                Clear-TodasDemandas
            }
            "4" {
                Write-Host "👋 Saindo..." -ForegroundColor Cyan
                break
            }
            default {
                Write-Host "❌ Opção inválida. Digite 1, 2, 3 ou 4." -ForegroundColor Red
            }
        }
        
        if ($opcao -ne "4") {
            Read-Host "`nPressione Enter para continuar..."
        }
        
    } while ($opcao -ne "4")
}

# Executar função principal
Main
