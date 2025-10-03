# deploy-vercel-direto.ps1
$ErrorActionPreference = "Stop"

Write-Host "Deploy Direto Vercel..." -ForegroundColor Cyan

try {
    # Verificar se esta logado no Vercel
    try {
        $vercelStatus = vercel whoami 2>$null
        Write-Host "Logado no Vercel como: $vercelStatus" -ForegroundColor Green
    } catch {
        Write-Host "Nao esta logado no Vercel. Execute 'vercel login' primeiro!" -ForegroundColor Red
        Write-Host "Dica: Abra um terminal e execute: vercel login" -ForegroundColor Yellow
        exit 1
    }
    
    # Navegar para o diretorio do frontend
    Set-Location "demandas-web"
    
    Write-Host "Fazendo deploy do frontend..." -ForegroundColor Cyan
    
    # Deploy direto para producao
    vercel deploy --prod --confirm
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Deploy Vercel concluido com sucesso!" -ForegroundColor Green
        Write-Host "Frontend disponivel em: https://nigteste.vercel.app" -ForegroundColor Cyan
    } else {
        Write-Host "Erro no deploy Vercel" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "Erro no deploy Vercel: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Voltar ao diretorio raiz
    Set-Location ".."
}

Write-Host "`nDeploy Vercel finalizado!" -ForegroundColor Magenta