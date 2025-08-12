# Script para verificar status do GitHub Actions
Write-Host "🔍 VERIFICANDO STATUS DO DEPLOY..." -ForegroundColor Green

# Verificar último commit
Write-Host "`n📋 ÚLTIMO COMMIT:" -ForegroundColor Cyan
git log --oneline -1

# Verificar status do repositório
Write-Host "`n📊 STATUS DO REPOSITÓRIO:" -ForegroundColor Cyan
git status

# Verificar se o workflow foi criado
Write-Host "`n📁 ARQUIVOS DE WORKFLOW:" -ForegroundColor Cyan
if (Test-Path ".github/workflows") {
    Get-ChildItem ".github/workflows" | ForEach-Object {
        Write-Host "✅ $($_.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Pasta .github/workflows não encontrada" -ForegroundColor Red
}

# Verificar se os secrets estão configurados
Write-Host "`n🔐 SECRETS NECESSÁRIOS:" -ForegroundColor Cyan
$requiredSecrets = @("VERCEL_TOKEN", "ORG_ID", "PROJECT_ID")
foreach ($secret in $requiredSecrets) {
    Write-Host "🔑 $secret" -ForegroundColor Yellow
}

Write-Host "`n🌐 LINKS PARA VERIFICAÇÃO:" -ForegroundColor Cyan
Write-Host "GitHub Actions: https://github.com/seutio22/nigteste/actions" -ForegroundColor Blue
Write-Host "Vercel Dashboard: https://vercel.com/dashboard" -ForegroundColor Blue

Write-Host "`n🎯 PRÓXIMOS PASSOS:" -ForegroundColor Green
Write-Host "1. Verifique o GitHub Actions para ver erros" -ForegroundColor White
Write-Host "2. Verifique o Vercel Dashboard para status" -ForegroundColor White
Write-Host "3. Aguarde mais alguns minutos para deploy" -ForegroundColor White
