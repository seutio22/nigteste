# deploy-railway-direto.ps1
$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploy Direto Railway..." -ForegroundColor Green

try {
    # Verificar se está logado no Railway
    $railwayStatus = railway whoami 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Não está logado no Railway. Execute 'railway login' primeiro!" -ForegroundColor Red
        Write-Host "💡 Dica: Abra um terminal e execute: railway login" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✅ Logado no Railway como: $railwayStatus" -ForegroundColor Green
    
    # Navegar para o diretório do backend
    Set-Location "demandas-api"
    
    Write-Host "📦 Fazendo deploy do backend..." -ForegroundColor Cyan
    
    # Deploy direto
    railway deploy --service nigteste-backend
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deploy Railway concluído com sucesso!" -ForegroundColor Green
        Write-Host "🌐 Backend disponível em: https://nigteste-production.up.railway.app" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Erro no deploy Railway" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Erro no deploy Railway: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Voltar ao diretório raiz
    Set-Location ".."
}

Write-Host "`n🎉 Deploy Railway finalizado!" -ForegroundColor Magenta
