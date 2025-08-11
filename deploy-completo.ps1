# Script principal para deploy completo automático
# Este script configura Railway e Vercel automaticamente

Write-Host "🚀 DEPLOY COMPLETO AUTOMÁTICO" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Verificar se estamos no diretório correto
if (-not (Test-Path "demandas-api") -or -not (Test-Path "demandas-web")) {
    Write-Host "❌ Erro: Execute este script no diretório raiz do projeto" -ForegroundColor Red
    exit 1
}

# Menu de opções
Write-Host "`n📋 Escolha uma opção:" -ForegroundColor Yellow
Write-Host "1. 🚂 Configurar Railway (Backend)" -ForegroundColor Cyan
Write-Host "2. 🌐 Configurar Vercel (Frontend)" -ForegroundColor Cyan
Write-Host "3. 🚀 Deploy Completo (Railway + Vercel)" -ForegroundColor Green
Write-Host "4. 📤 Commit e Push das configurações" -ForegroundColor Blue
Write-Host "5. ❌ Sair" -ForegroundColor Red

$opcao = Read-Host "`nDigite sua opção (1-5)"

switch ($opcao) {
    "1" {
        Write-Host "`n🚂 Configurando Railway..." -ForegroundColor Green
        & ".\setup-railway.ps1"
    }
    "2" {
        Write-Host "`n🌐 Configurando Vercel..." -ForegroundColor Green
        & ".\setup-vercel.ps1"
    }
    "3" {
        Write-Host "`n🚀 Deploy Completo..." -ForegroundColor Green
        Write-Host "1️⃣ Configurando Railway..." -ForegroundColor Cyan
        & ".\setup-railway.ps1"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n2️⃣ Configurando Vercel..." -ForegroundColor Cyan
            & ".\setup-vercel.ps1"
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n🎉 DEPLOY COMPLETO REALIZADO COM SUCESSO!" -ForegroundColor Green
                Write-Host "📱 Backend: $(Get-Content 'railway-url.txt' -ErrorAction SilentlyContinue)" -ForegroundColor Cyan
                Write-Host "🌐 Frontend: $(Get-Content 'vercel-url.txt' -ErrorAction SilentlyContinue)" -ForegroundColor Cyan
            } else {
                Write-Host "❌ Erro na configuração do Vercel" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Erro na configuração do Railway" -ForegroundColor Red
        }
    }
    "4" {
        Write-Host "`n📤 Commit e Push das configurações..." -ForegroundColor Green
        
        # Adicionar arquivos de configuração
        git add .
        
        # Commit
        git commit -m "🚀 Configuração para deploy automático (Railway + Vercel)"
        
        # Push
        git push origin master
        
        Write-Host "✅ Configurações enviadas para o GitHub!" -ForegroundColor Green
    }
    "5" {
        Write-Host "👋 Até logo!" -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "❌ Opção inválida!" -ForegroundColor Red
    }
}

Write-Host "`n🎯 Processo concluído!" -ForegroundColor Green
