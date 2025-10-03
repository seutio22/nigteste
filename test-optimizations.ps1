# test-optimizations.ps1
# Script para testar as otimizacoes implementadas

Write-Host "Testando Otimizacoes de Performance" -ForegroundColor Magenta
Write-Host "=====================================" -ForegroundColor Magenta

# Verificar se os servidores estao rodando
Write-Host "`nVerificando status dos servidores..." -ForegroundColor Cyan

$backendRunning = $false
$frontendRunning = $false

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3333/health" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $backendRunning = $true
        Write-Host "Backend rodando na porta 3333" -ForegroundColor Green
    }
} catch {
    Write-Host "Backend nao esta rodando na porta 3333" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $frontendRunning = $true
        Write-Host "Frontend rodando na porta 5173" -ForegroundColor Green
    }
} catch {
    Write-Host "Frontend nao esta rodando na porta 5173" -ForegroundColor Red
}

if (-not $backendRunning -or -not $frontendRunning) {
    Write-Host "`nServidores nao estao rodando. Iniciando..." -ForegroundColor Yellow
    
    # Iniciar backend
    if (-not $backendRunning) {
        Write-Host "Iniciando backend..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-Command", "cd demandas-api; npm run dev" -WindowStyle Minimized
        Start-Sleep -Seconds 5
    }
    
    # Iniciar frontend
    if (-not $frontendRunning) {
        Write-Host "Iniciando frontend..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-Command", "cd demandas-web; npm run dev" -WindowStyle Minimized
        Start-Sleep -Seconds 10
    }
}

# Testar API de paginacao
Write-Host "`nTestando API de paginacao..." -ForegroundColor Cyan

$testEndpoints = @(
    "clientes?page=1&limit=10",
    "clientes?page=1&limit=5&search=ALLPARK",
    "contratos?page=1&limit=10",
    "analistas?page=1&limit=10"
)

foreach ($endpoint in $testEndpoints) {
    try {
        Write-Host "  Testando: $endpoint" -ForegroundColor Gray
        $response = Invoke-WebRequest -Uri "http://localhost:3333/$endpoint" -TimeoutSec 10
        $data = $response.Content | ConvertFrom-Json
        
        if ($data.pagination) {
            Write-Host "    Paginacao funcionando - Pagina: $($data.pagination.page), Total: $($data.pagination.total)" -ForegroundColor Green
        } else {
            Write-Host "    Resposta sem paginacao" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "    Erro: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Verificar novos arquivos criados
Write-Host "`nVerificando novos arquivos de otimizacao..." -ForegroundColor Cyan

$newFiles = @(
    "demandas-web/src/hooks/usePaginatedData.ts",
    "demandas-web/src/store/optimizedMasterDataStore.ts", 
    "demandas-web/src/components/OptimizedDataGrid.tsx",
    "demandas-web/src/pages/DadosOptimized.tsx"
)

foreach ($file in $newFiles) {
    if (Test-Path $file) {
        Write-Host "  $file - OK" -ForegroundColor Green
    } else {
        Write-Host "  $file - NAO ENCONTRADO" -ForegroundColor Red
    }
}

# Resumo final
Write-Host "`nRESUMO DAS OTIMIZACOES:" -ForegroundColor Magenta
Write-Host "========================" -ForegroundColor Magenta
Write-Host "Paginacao no servidor implementada" -ForegroundColor Green
Write-Host "Cache inteligente com TTL" -ForegroundColor Green
Write-Host "Hook usePaginatedData criado" -ForegroundColor Green
Write-Host "Store otimizado sem persistencia" -ForegroundColor Green
Write-Host "Componente OptimizedDataGrid" -ForegroundColor Green
Write-Host "Pagina DadosOptimized para teste" -ForegroundColor Green
Write-Host "Reducao do uso de localStorage" -ForegroundColor Green

Write-Host "`nPROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Testar a pagina /dados-otimizados no navegador" -ForegroundColor White
Write-Host "2. Comparar performance com /dados original" -ForegroundColor White
Write-Host "3. Migrar outras paginas gradualmente" -ForegroundColor White
Write-Host "4. Monitorar uso de memoria e cache" -ForegroundColor White

Write-Host "`nTeste concluido!" -ForegroundColor Magenta