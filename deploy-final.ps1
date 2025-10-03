# Script final para deploy direto
Write-Host "🚀 Deploy direto Railway + Vercel" -ForegroundColor Magenta

# Função para deploy com fallback
function Deploy-Platform {
    param(
        [string]$Platform,
        [string]$Command,
        [string]$Directory
    )
    
    Write-Host "🔧 Deploy $Platform..." -ForegroundColor Yellow
    
    # Salvar diretório atual
    $originalDir = Get-Location
    
    try {
        # Navegar para o diretório
        Set-Location $Directory
        
        # Executar comando
        Invoke-Expression $Command
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Deploy $Platform concluído!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Erro no deploy $Platform" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Erro no deploy $Platform" -ForegroundColor Red
        return $false
    } finally {
        # Voltar ao diretório original
        Set-Location $originalDir
    }
}

# Deploy Railway
$railwaySuccess = Deploy-Platform "Railway" "railway deploy" "demandas-api"

# Deploy Vercel
$vercelSuccess = Deploy-Platform "Vercel" "vercel --prod --yes" "demandas-web"

# Resumo
Write-Host "`n📊 RESUMO:" -ForegroundColor Cyan
Write-Host "🚂 Railway: $(if ($railwaySuccess) { '✅ Sucesso' } else { '❌ Erro' })" -ForegroundColor $(if ($railwaySuccess) { 'Green' } else { 'Red' })
Write-Host "🎨 Vercel: $(if ($vercelSuccess) { '✅ Sucesso' } else { '❌ Erro' })" -ForegroundColor $(if ($vercelSuccess) { 'Green' } else { 'Red' })

# Fallback se necessário
if (-not $railwaySuccess -or -not $vercelSuccess) {
    Write-Host "`n🔄 Executando fallback via Git..." -ForegroundColor Yellow
    git add .
    git commit -m "trigger: Deploy fallback - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" --allow-empty
    git push origin main
    Write-Host "✅ Deploy automático iniciado via Git push" -ForegroundColor Green
}

Write-Host "`n🎉 Deploy finalizado!" -ForegroundColor Magenta
