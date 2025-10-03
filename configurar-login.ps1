# configurar-login.ps1
$ErrorActionPreference = "Stop"

Write-Host "Configurando Login nos CLIs..." -ForegroundColor Green

Write-Host "`n1. Railway Login:" -ForegroundColor Yellow
Write-Host "   - Abra um terminal e execute: railway login" -ForegroundColor Cyan
Write-Host "   - Siga as instrucoes para fazer login" -ForegroundColor Cyan

Write-Host "`n2. Vercel Login:" -ForegroundColor Yellow
Write-Host "   - Abra um terminal e execute: vercel login" -ForegroundColor Cyan
Write-Host "   - Siga as instrucoes para fazer login" -ForegroundColor Cyan

Write-Host "`n3. Verificar Login:" -ForegroundColor Yellow
Write-Host "   - Execute: railway whoami" -ForegroundColor Cyan
Write-Host "   - Execute: vercel whoami" -ForegroundColor Cyan

Write-Host "`nApos fazer login, voce podera usar:" -ForegroundColor Green
Write-Host "   - .\deploy-railway-direto.ps1 (so backend)" -ForegroundColor Cyan
Write-Host "   - .\deploy-vercel-direto.ps1 (so frontend)" -ForegroundColor Cyan
Write-Host "   - .\deploy-completo-direto.ps1 (ambos)" -ForegroundColor Cyan
Write-Host "   - .\deploy-ultra-rapido.ps1 (paralelo, mais rapido)" -ForegroundColor Cyan

Write-Host "`nDica: O deploy direto e 3-5x mais rapido que o Git!" -ForegroundColor Magenta