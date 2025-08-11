#!/bin/bash

echo "🚀 DEPLOY COMPLETO AUTOMÁTICO - PROJETO DEMANDAS"
echo "=================================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Funções de output
print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_step() { echo -e "${PURPLE}🔧 $1${NC}"; }

# Função para aguardar confirmação
wait_for_confirmation() {
    echo ""
    read -p "Pressione ENTER para continuar..."
}

# Função para verificar se um comando existe
command_exists() {
    command -v "$1" &> /dev/null
}

# Verificar se está no diretório correto
if [ ! -f "demandas-api/package.json" ] || [ ! -f "demandas-web/package.json" ]; then
    print_error "Execute este script na raiz do projeto!"
    exit 1
fi

print_status "Diretório do projeto verificado"

# Menu principal
echo ""
echo "🎯 ESCOLHA UMA OPÇÃO:"
echo "1. 🚀 Deploy Completo (Recomendado para primeira vez)"
echo "2. 🔑 Configurar apenas Secrets"
echo "3. 🔧 Configurar apenas Railway"
echo "4. 🌐 Configurar apenas Vercel"
echo "5. 📤 Deploy Rápido (apenas push)"
echo "6. ❌ Sair"
echo ""

read -p "Digite sua opção (1-6): " OPTION

case $OPTION in
    1)
        print_step "INICIANDO DEPLOY COMPLETO..."
        ;;
    2)
        print_step "CONFIGURANDO APENAS SECRETS..."
        ;;
    3)
        print_step "CONFIGURANDO APENAS RAILWAY..."
        ;;
    4)
        print_step "CONFIGURANDO APENAS VERCEL..."
        ;;
    5)
        print_step "DEPLOY RÁPIDO..."
        ;;
    6)
        print_info "Saindo..."
        exit 0
        ;;
    *)
        print_error "Opção inválida!"
        exit 1
        ;;
esac

# Função para deploy completo
deploy_completo() {
    echo ""
    print_step "PASSO 1: Configurando Secrets do GitHub"
    echo "=============================================="
    
    if [ "$OPTION" = "1" ] || [ "$OPTION" = "2" ]; then
        if ! command_exists gh; then
            print_warning "GitHub CLI não está instalado!"
            echo "Instalando GitHub CLI..."
            
            if command_exists winget; then
                winget install GitHub.cli
            elif command_exists brew; then
                brew install gh
            elif command_exists apt; then
                sudo apt update && sudo apt install gh -y
            else
                print_error "Não foi possível instalar o GitHub CLI automaticamente!"
                echo "Instale manualmente: https://cli.github.com/"
                wait_for_confirmation
            fi
        fi
        
        print_info "Executando configuração de secrets..."
        ./setup-secrets.sh
        wait_for_confirmation
    fi
    
    echo ""
    print_step "PASSO 2: Configurando Deploy Automático"
    echo "============================================="
    
    if [ "$OPTION" = "1" ]; then
        print_info "Executando configuração de deploy..."
        ./setup-deploy.sh
        wait_for_confirmation
    fi
    
    echo ""
    print_step "PASSO 3: Configurando Railway (Backend)"
    echo "============================================="
    
    if [ "$OPTION" = "1" ] || [ "$OPTION" = "3" ]; then
        print_info "Configurando Railway..."
        ./setup-railway.sh
        wait_for_confirmation
    fi
    
    echo ""
    print_step "PASSO 4: Configurando Vercel (Frontend)"
    echo "=============================================="
    
    if [ "$OPTION" = "1" ] || [ "$OPTION" = "4" ]; then
        print_info "Configurando Vercel..."
        ./setup-vercel.sh
        wait_for_confirmation
    fi
    
    echo ""
    print_step "PASSO 5: Deploy Automático"
    echo "================================"
    
    if [ "$OPTION" = "1" ] || [ "$OPTION" = "5" ]; then
        print_info "Executando deploy automático..."
        ./quick-deploy.sh
    fi
}

# Função para deploy rápido
deploy_rapido() {
    echo ""
    print_step "DEPLOY RÁPIDO"
    echo "================"
    
    # Verificar se há alterações
    if [ -n "$(git status --porcelain)" ]; then
        print_info "Há alterações não commitadas. Fazendo commit..."
        git add .
        git commit -m "🚀 Deploy automático $(date)"
    fi
    
    # Push para trigger do deploy automático
    print_info "Enviando para deploy automático..."
    if git push origin main 2>/dev/null || git push origin master 2>/dev/null; then
        print_status "Deploy iniciado com sucesso!"
        echo ""
        echo "📊 Acompanhe o progresso:"
        echo "   - GitHub Actions: https://github.com/$(git remote get-url origin | sed 's/.*github\.com[:/]\([^/]*\)\/\([^/]*\)\.git.*/\1\/\2/')/actions"
        echo "   - Railway: https://railway.app"
        echo "   - Vercel: https://vercel.com"
    else
        print_error "Erro ao fazer push!"
    fi
}

# Executar baseado na opção escolhida
case $OPTION in
    1)
        deploy_completo
        ;;
    2|3|4)
        deploy_completo
        ;;
    5)
        deploy_rapido
        ;;
esac

# Instruções finais
echo ""
echo "🎉 PROCESSO CONCLUÍDO!"
echo "======================="
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. 🔍 MONITORAR DEPLOY:"
echo "   - GitHub Actions: Verificar status dos workflows"
echo "   - Railway: Acompanhar logs do backend"
echo "   - Vercel: Verificar build do frontend"
echo ""
echo "2. 🔗 CONFIGURAR CONEXÕES:"
echo "   - Configure VITE_API_URL no Vercel"
echo "   - Atualize CORS no backend"
echo ""
echo "3. 🧪 TESTAR APLICAÇÃO:"
echo "   - Acesse o frontend no Vercel"
echo "   - Teste login e funcionalidades"
echo "   - Verifique chamadas para a API"
echo ""
echo "4. 🚀 PRÓXIMOS DEPLOYS:"
echo "   - Use: ./quick-deploy.sh"
echo "   - Ou simplesmente: git push origin main"
echo ""
echo "📚 Para suporte, consulte o README.md"
echo "🔧 Para problemas, verifique os logs nas plataformas"
