# 🚀 DEPLOY AUTOMÁTICO - PROJETO DEMANDAS (Windows PowerShell)
# ================================================================

Write-Host "🚀 DEPLOY AUTOMÁTICO - PROJETO DEMANDAS" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Funções de output colorido
function Write-Status { Write-Host "✅ $($args[0])" -ForegroundColor Green }
function Write-Warning { Write-Host "⚠️  $($args[0])" -ForegroundColor Yellow }
function Write-Error { Write-Host "❌ $($args[0])" -ForegroundColor Red }
function Write-Info { Write-Host "ℹ️  $($args[0])" -ForegroundColor Blue }
function Write-Step { Write-Host "🔧 $($args[0])" -ForegroundColor Magenta }

# Verificar se está no diretório correto
if (-not (Test-Path "demandas-api/package.json") -or -not (Test-Path "demandas-web/package.json")) {
    Write-Error "Execute este script na raiz do projeto!"
    exit 1
}

Write-Status "Diretório do projeto verificado"

# Menu principal
Write-Host ""
Write-Host "🎯 ESCOLHA UMA OPÇÃO:" -ForegroundColor Cyan
Write-Host "1. 🚀 Deploy Completo (Recomendado para primeira vez)" -ForegroundColor White
Write-Host "2. 🔑 Configurar apenas Secrets" -ForegroundColor White
Write-Host "3. 🔧 Configurar apenas Railway" -ForegroundColor White
Write-Host "4. 🌐 Configurar apenas Vercel" -ForegroundColor White
Write-Host "5. 📤 Deploy Rápido (apenas push)" -ForegroundColor White
Write-Host "6. ❌ Sair" -ForegroundColor White
Write-Host ""

$OPTION = Read-Host "Digite sua opção (1-6)"

switch ($OPTION) {
    "1" { Write-Step "INICIANDO DEPLOY COMPLETO..." }
    "2" { Write-Step "CONFIGURANDO APENAS SECRETS..." }
    "3" { Write-Step "CONFIGURANDO APENAS RAILWAY..." }
    "4" { Write-Step "CONFIGURANDO APENAS VERCEL..." }
    "5" { Write-Step "DEPLOY RÁPIDO..." }
    "6" { Write-Info "Saindo..."; exit 0 }
    default { Write-Error "Opção inválida!"; exit 1 }
}

# Função para aguardar confirmação
function Wait-ForConfirmation {
    Write-Host ""
    Read-Host "Pressione ENTER para continuar"
}

# Função para verificar se um comando existe
function Test-Command($CommandName) {
    return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

# Função para deploy completo
function Start-CompleteDeploy {
    Write-Host ""
    Write-Step "PASSO 1: Configurando Secrets do GitHub"
    Write-Host "==============================================" -ForegroundColor Gray
    
    if ($OPTION -eq "1" -or $OPTION -eq "2") {
        if (-not (Test-Command "gh")) {
            Write-Warning "GitHub CLI não está instalado!"
            Write-Host "Instalando GitHub CLI..."
            
            try {
                winget install GitHub.cli
                Write-Status "GitHub CLI instalado com sucesso!"
            }
            catch {
                Write-Error "Erro ao instalar GitHub CLI!"
                Write-Host "Instale manualmente: https://cli.github.com/"
                Wait-ForConfirmation
            }
        }
        
        Write-Info "Executando configuração de secrets..."
        if (Test-Path "setup-secrets.sh") {
            bash setup-secrets.sh
        } else {
            Write-Error "Arquivo setup-secrets.sh não encontrado!"
        }
        Wait-ForConfirmation
    }
    
    Write-Host ""
    Write-Step "PASSO 2: Configurando Deploy Automático"
    Write-Host "=============================================" -ForegroundColor Gray
    
    if ($OPTION -eq "1") {
        Write-Info "Executando configuração de deploy..."
        if (Test-Path "setup-deploy.sh") {
            bash setup-deploy.sh
        } else {
            Write-Error "Arquivo setup-deploy.sh não encontrado!"
        }
        Wait-ForConfirmation
    }
    
    Write-Host ""
    Write-Step "PASSO 3: Configurando Railway (Backend)"
    Write-Host "=============================================" -ForegroundColor Gray
    
    if ($OPTION -eq "1" -or $OPTION -eq "3") {
        Write-Info "Configurando Railway..."
        if (Test-Path "setup-railway.sh") {
            bash setup-railway.sh
        } else {
            Write-Error "Arquivo setup-railway.sh não encontrado!"
        }
        Wait-ForConfirmation
    }
    
    Write-Host ""
    Write-Step "PASSO 4: Configurando Vercel (Frontend)"
    Write-Host "==============================================" -ForegroundColor Gray
    
    if ($OPTION -eq "1" -or $OPTION -eq "4") {
        Write-Info "Configurando Vercel..."
        if (Test-Path "setup-vercel.sh") {
            bash setup-vercel.sh
        } else {
            Write-Error "Arquivo setup-vercel.sh não encontrado!"
        }
        Wait-ForConfirmation
    }
    
    Write-Host ""
    Write-Step "PASSO 5: Deploy Automático"
    Write-Host "================================" -ForegroundColor Gray
    
    if ($OPTION -eq "1" -or $OPTION -eq "5") {
        Write-Info "Executando deploy automático..."
        if (Test-Path "quick-deploy.sh") {
            bash quick-deploy.sh
        } else {
            Write-Error "Arquivo quick-deploy.sh não encontrado!"
        }
    }
}

# Função para deploy rápido
function Start-QuickDeploy {
    Write-Host ""
    Write-Step "DEPLOY RÁPIDO"
    Write-Host "================" -ForegroundColor Gray
    
    # Verificar se há alterações
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Info "Há alterações não commitadas. Fazendo commit..."
        git add .
        git commit -m "🚀 Deploy automático $(Get-Date)"
    }
    
    # Push para trigger do deploy automático
    Write-Info "Enviando para deploy automático..."
    try {
        git push origin main
        Write-Status "Deploy iniciado com sucesso!"
        Write-Host ""
        Write-Host "📊 Acompanhe o progresso:" -ForegroundColor Cyan
        Write-Host "   - GitHub Actions: https://github.com/$(git remote get-url origin | Select-String -Pattern 'github\.com[:/]([^/]*)/([^/]*)\.git' | ForEach-Object { $_.Matches[0].Groups[1].Value + '/' + $_.Matches[0].Groups[2].Value })/actions" -ForegroundColor White
        Write-Host "   - Railway: https://railway.app" -ForegroundColor White
        Write-Host "   - Vercel: https://vercel.com" -ForegroundColor White
    }
    catch {
        Write-Error "Erro ao fazer push!"
    }
}

# Executar baseado na opção escolhida
switch ($OPTION) {
    "1" { Start-CompleteDeploy }
    "2" { Start-CompleteDeploy }
    "3" { Start-CompleteDeploy }
    "4" { Start-CompleteDeploy }
    "5" { Start-QuickDeploy }
}

# Instruções finais
Write-Host ""
Write-Host "🎉 PROCESSO CONCLUÍDO!" -ForegroundColor Green
Write-Host "=======================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 🔍 MONITORAR DEPLOY:" -ForegroundColor White
Write-Host "   - GitHub Actions: Verificar status dos workflows" -ForegroundColor Gray
Write-Host "   - Railway: Acompanhar logs do backend" -ForegroundColor Gray
Write-Host "   - Vercel: Verificar build do frontend" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 🔗 CONFIGURAR CONEXÕES:" -ForegroundColor White
Write-Host "   - Configure VITE_API_URL no Vercel" -ForegroundColor Gray
Write-Host "   - Atualize CORS no backend" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 🧪 TESTAR APLICAÇÃO:" -ForegroundColor White
Write-Host "   - Acesse o frontend no Vercel" -ForegroundColor Gray
Write-Host "   - Teste login e funcionalidades" -ForegroundColor Gray
Write-Host "   - Verifique chamadas para a API" -ForegroundColor Gray
Write-Host ""
Write-Host "4. 🚀 PRÓXIMOS DEPLOYS:" -ForegroundColor White
Write-Host "   - Use: ./quick-deploy.sh" -ForegroundColor Gray
Write-Host "   - Ou simplesmente: git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Para suporte, consulte o README.md" -ForegroundColor White
Write-Host "🔧 Para problemas, verifique os logs nas plataformas" -ForegroundColor White

# Aguardar tecla para sair
Write-Host ""
Read-Host "Pressione ENTER para sair"

