# Script para configurar GitHub Pages automaticamente
Write-Host "🚀 CONFIGURANDO GITHUB PAGES AUTOMATICAMENTE..." -ForegroundColor Green

# Verificar se é um repositório Git
if (-not (Test-Path ".git")) {
    Write-Host "❌ ERRO: Não é um repositório Git!" -ForegroundColor Red
    Write-Host "Execute: git init" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Repositório Git encontrado" -ForegroundColor Green

# Adicionar todos os arquivos
Write-Host "📁 Adicionando arquivos..." -ForegroundColor Cyan
git add .

# Commit das alterações
Write-Host "💾 Fazendo commit..." -ForegroundColor Cyan
git commit -m "🚀 Configuração GitHub Pages + Workflows"

# Push para o repositório
Write-Host "🚀 Enviando para GitHub..." -ForegroundColor Cyan
git push origin main

Write-Host "`n🎉 CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "📱 GitHub Pages será configurado automaticamente" -ForegroundColor White
Write-Host "🌐 URL: https://seutio22.github.io/nigteste" -ForegroundColor Blue
Write-Host "⏱️ Tempo estimado: 3-5 minutos" -ForegroundColor Yellow

Write-Host "`n📋 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "1. Acesse: https://github.com/seutio22/nigteste/actions" -ForegroundColor White
Write-Host "2. Aguarde o workflow 'Setup GitHub Pages' executar" -ForegroundColor White
Write-Host "3. Depois aguarde o 'Deploy GitHub Pages'" -ForegroundColor White
Write-Host "4. Acesse: https://seutio22.github.io/nigteste" -ForegroundColor White
