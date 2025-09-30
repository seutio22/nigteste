# Script para limpar demandas simples indevidas da tabela principal
# Este script remove apenas as demandas que são "atv demandas" (dados mestres simples)
# que foram inseridas indevidamente na tabela de demandas operacionais

Write-Host "🧹 LIMPEZA DE DEMANDAS SIMPLES INDECIDAS" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host ""

# URL da API
$apiUrl = "http://localhost:3333"

# Função para fazer requisições HTTP
function Invoke-ApiRequest {
    param(
        [string]$Method = "GET",
        [string]$Endpoint,
        [string]$Body = ""
    )
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        $params = @{
            Uri = "$apiUrl$Endpoint"
            Method = $Method
            Headers = $headers
        }
        
        if ($Body -and $Method -ne "GET") {
            $params.Body = $Body
        }
        
        $response = Invoke-RestMethod @params
        return $response
    }
    catch {
        Write-Host "❌ Erro na requisição: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Verificar se a API está rodando
Write-Host "🔍 Verificando se a API está rodando..." -ForegroundColor Cyan
try {
    $health = Invoke-ApiRequest -Endpoint "/health"
    if ($health.status -eq "ok") {
        Write-Host "✅ API está rodando" -ForegroundColor Green
    } else {
        Write-Host "❌ API não está respondendo corretamente" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Não foi possível conectar à API. Verifique se o servidor está rodando." -ForegroundColor Red
    Write-Host "   Execute: npm run dev na pasta demandas-api" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Verificar quantas demandas simples existem
Write-Host "🔍 Verificando demandas simples existentes..." -ForegroundColor Cyan
$atvDemandas = Invoke-ApiRequest -Endpoint "/atv-demandas"

if ($atvDemandas) {
    Write-Host "✅ Encontradas $($atvDemandas.Count) demandas simples (atv demandas)" -ForegroundColor Green
    
    # Mostrar algumas demandas como exemplo
    Write-Host "📋 Exemplos de demandas simples:" -ForegroundColor Cyan
    $atvDemandas | Select-Object -First 5 | ForEach-Object {
        Write-Host "   • $($_.nome) (ID: $($_.id))" -ForegroundColor White
    }
    
    if ($atvDemandas.Count -gt 5) {
        Write-Host "   ... e mais $($atvDemandas.Count - 5) demandas" -ForegroundColor Gray
    }
} else {
    Write-Host "ℹ️  Nenhuma demanda simples encontrada" -ForegroundColor Blue
}

Write-Host ""

# Perguntar se deseja continuar
Write-Host "⚠️  ATENÇÃO: Esta operação irá remover TODAS as demandas simples da tabela principal!" -ForegroundColor Red
Write-Host "   As demandas serão perdidas permanentemente." -ForegroundColor Red
Write-Host ""

$confirmacao = Read-Host "🤔 Deseja continuar? (digite 'SIM' para confirmar)"

if ($confirmacao -ne "SIM") {
    Write-Host "❌ Operação cancelada pelo usuário" -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# Executar a limpeza
Write-Host "🧹 Executando limpeza..." -ForegroundColor Cyan
$resultado = Invoke-ApiRequest -Method "DELETE" -Endpoint "/demandas/limpar-atv-demandas"

if ($resultado) {
    Write-Host "✅ Limpeza concluída com sucesso!" -ForegroundColor Green
    Write-Host "📊 Resultado:" -ForegroundColor Cyan
    Write-Host "   • Mensagem: $($resultado.message)" -ForegroundColor White
    Write-Host "   • Demandas removidas: $($resultado.removidas)" -ForegroundColor White
    
    if ($resultado.demandasRemovidas -and $resultado.demandasRemovidas.Count -gt 0) {
        Write-Host "   • Demandas removidas:" -ForegroundColor Cyan
        $resultado.demandasRemovidas | ForEach-Object {
            Write-Host "     - $($_.nome) (ID: $($_.id))" -ForegroundColor White
        }
    }
} else {
    Write-Host "❌ Erro ao executar a limpeza" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎯 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Agora use o endpoint /atv-demandas para inserir dados na tabela correta" -ForegroundColor White
Write-Host "2. Os dados não aparecerão mais na página demandas principal" -ForegroundColor White
Write-Host "3. A tabela 'Atividades Demandas' na página dados funcionará corretamente" -ForegroundColor White

Write-Host ""
Write-Host "✅ Limpeza concluída!" -ForegroundColor Green
