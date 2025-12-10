# Script para fazer deploy no Vercel e salvar output
$ErrorActionPreference = "Continue"

Write-Host "=== INICIANDO DEPLOY VERCEL ===" -ForegroundColor Green

$logFile = "deploy-vercel-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# Mudar para o diretório do projeto
Set-Location "c:\Users\Larissa\nigteste\nigteste\demandas-web"

# Token do Vercel
$env:VERCEL_TOKEN = "1zGvh5dfuG1p6TVf4uHxd04E"

Write-Host "Executando deploy..." -ForegroundColor Yellow
Write-Host "Log será salvo em: $logFile" -ForegroundColor Cyan

# Executar deploy e salvar output
try {
    $output = npx vercel@latest deploy --prod --yes --token $env:VERCEL_TOKEN 2>&1 | Tee-Object -FilePath $logFile
    
    Write-Host "`n=== OUTPUT DO DEPLOY ===" -ForegroundColor Green
    Write-Host $output
    
    Write-Host "`n=== DEPLOY CONCLUÍDO ===" -ForegroundColor Green
    Write-Host "Log completo salvo em: $logFile" -ForegroundColor Cyan
    
    # Verificar se há URL no output
    if ($output -match "https://.*\.vercel\.app") {
        $url = $matches[0]
        Write-Host "`n✅ URL do Deploy: $url" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Erro durante deploy: $_" -ForegroundColor Red
    $_ | Out-File -FilePath $logFile -Append
}

# Voltar para o diretório raiz
Set-Location "c:\Users\Larissa\nigteste\nigteste"

Write-Host "`nPressione qualquer tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
