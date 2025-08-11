#!/bin/bash

echo "🔑 CONFIGURAÇÃO AUTOMÁTICA DE SECRETS - PROJETO DEMANDAS"
echo "========================================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Funções de output
print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Verificar se o gh CLI está instalado
if ! command -v gh &> /dev/null; then
    print_warning "GitHub CLI não está instalado!"
    echo ""
    echo "Para instalar:"
    echo "Windows: winget install GitHub.cli"
    echo "macOS: brew install gh"
    echo "Linux: sudo apt install gh"
    echo ""
    echo "Após instalar, execute: gh auth login"
    echo ""
    read -p "Pressione ENTER após instalar e fazer login no GitHub CLI..."
    
    if ! command -v gh &> /dev/null; then
        print_error "GitHub CLI ainda não está disponível!"
        exit 1
    fi
fi

# Verificar se está autenticado
if ! gh auth status &> /dev/null; then
    print_warning "Não está autenticado no GitHub!"
    echo "Execute: gh auth login"
    exit 1
fi

print_status "GitHub CLI autenticado"

# Obter informações do repositório
REPO_URL=$(git remote get-url origin)
REPO_OWNER=$(echo $REPO_URL | sed -n 's/.*github\.com[:/]\([^/]*\)\/\([^/]*\)\.git.*/\1/p')
REPO_NAME=$(echo $REPO_URL | sed -n 's/.*github\.com[:/]\([^/]*\)\/\([^/]*\)\.git.*/\2/p')

if [ -z "$REPO_OWNER" ] || [ -z "$REPO_NAME" ]; then
    print_error "Não foi possível obter informações do repositório!"
    exit 1
fi

print_info "Repositório: $REPO_OWNER/$REPO_NAME"

# Gerar secrets seguros
JWT_SECRET=$(openssl rand -base64 64)
RAILWAY_TOKEN=""
VERCEL_TOKEN=""
ORG_ID=""
PROJECT_ID=""

echo ""
print_info "Configurando secrets do GitHub..."

# Solicitar Railway Token
echo ""
echo "🔧 CONFIGURAÇÃO DO RAILWAY:"
echo "1. Acesse: https://railway.app/account/tokens"
echo "2. Clique em 'Create Token'"
echo "3. Copie o token gerado"
echo ""
read -p "Cole o Railway Token aqui: " RAILWAY_TOKEN

if [ -z "$RAILWAY_TOKEN" ]; then
    print_error "Railway Token é obrigatório!"
    exit 1
fi

# Solicitar Vercel Token
echo ""
echo "🌐 CONFIGURAÇÃO DO VERCEL:"
echo "1. Acesse: https://vercel.com/account/tokens"
echo "2. Clique em 'Create'"
echo "3. Copie o token gerado"
echo ""
read -p "Cole o Vercel Token aqui: " VERCEL_TOKEN

if [ -z "$VERCEL_TOKEN" ]; then
    print_error "Vercel Token é obrigatório!"
    exit 1
fi

# Solicitar Vercel Org ID
echo ""
echo "🏢 CONFIGURAÇÃO DA ORGANIZAÇÃO VERCEL:"
echo "1. Acesse: https://vercel.com/account"
echo "2. Copie o 'Team ID' (se houver) ou deixe vazio para conta pessoal"
echo ""
read -p "Cole o Vercel Org ID (ou deixe vazio): " ORG_ID

# Solicitar Vercel Project ID
echo ""
echo "📁 CONFIGURAÇÃO DO PROJETO VERCEL:"
echo "1. Crie um projeto no Vercel (será feito automaticamente)"
echo "2. Ou se já existir, copie o Project ID da URL"
echo ""
read -p "Cole o Vercel Project ID (ou deixe vazio para criar automaticamente): " PROJECT_ID

# Configurar secrets no GitHub
echo ""
print_info "Configurando secrets no GitHub..."

# JWT Secret
gh secret set JWT_SECRET --body "$JWT_SECRET" --repo "$REPO_OWNER/$REPO_NAME"
if [ $? -eq 0 ]; then
    print_status "JWT_SECRET configurado"
else
    print_error "Erro ao configurar JWT_SECRET"
fi

# Railway Token
gh secret set RAILWAY_TOKEN --body "$RAILWAY_TOKEN" --repo "$REPO_OWNER/$REPO_NAME"
if [ $? -eq 0 ]; then
    print_status "RAILWAY_TOKEN configurado"
else
    print_error "Erro ao configurar RAILWAY_TOKEN"
fi

# Vercel Token
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN" --repo "$REPO_OWNER/$REPO_NAME"
if [ $? -eq 0 ]; then
    print_status "VERCEL_TOKEN configurado"
else
    print_error "Erro ao configurar VERCEL_TOKEN"
fi

# Vercel Org ID (se fornecido)
if [ -n "$ORG_ID" ]; then
    gh secret set ORG_ID --body "$ORG_ID" --repo "$REPO_OWNER/$REPO_NAME"
    if [ $? -eq 0 ]; then
        print_status "ORG_ID configurado"
    else
        print_error "Erro ao configurar ORG_ID"
    fi
fi

# Vercel Project ID (se fornecido)
if [ -n "$PROJECT_ID" ]; then
    gh secret set PROJECT_ID --body "$PROJECT_ID" --repo "$REPO_OWNER/$REPO_NAME"
    if [ $? -eq 0 ]; then
        print_status "PROJECT_ID configurado"
    else
        print_error "Erro ao configurar PROJECT_ID"
    fi
fi

# Criar arquivo de configuração local
cat > .env.local << EOF
# Secrets configurados no GitHub
JWT_SECRET="$JWT_SECRET"
RAILWAY_TOKEN="$RAILWAY_TOKEN"
VERCEL_TOKEN="$VERCEL_TOKEN"
ORG_ID="$ORG_ID"
PROJECT_ID="$PROJECT_ID"

# URLs dos serviços (serão configuradas após deploy)
RAILWAY_URL=""
VERCEL_URL=""
EOF

print_status "Arquivo .env.local criado com os secrets"

# Criar script de configuração do Railway
cat > setup-railway.sh << 'EOF'
#!/bin/bash
echo "🔧 CONFIGURAÇÃO AUTOMÁTICA DO RAILWAY"
echo "====================================="

# Verificar se o Railway CLI está instalado
if ! command -v railway &> /dev/null; then
    echo "Instalando Railway CLI..."
    npm install -g @railway/cli
fi

# Login no Railway
echo "🔐 Fazendo login no Railway..."
railway login

# Criar projeto
echo "🚀 Criando projeto no Railway..."
railway init

# Adicionar banco PostgreSQL
echo "🗄️ Adicionando banco PostgreSQL..."
railway add

# Obter URL do serviço
echo "🔗 Obtendo URL do serviço..."
RAILWAY_URL=$(railway status --json | jq -r '.services[0].url')

if [ -n "$RAILWAY_URL" ]; then
    echo "✅ URL do Railway: $RAILWAY_URL"
    echo "Adicione esta URL como VITE_API_URL no Vercel"
else
    echo "⚠️ Não foi possível obter a URL do Railway"
fi
EOF

chmod +x setup-railway.sh

# Criar script de configuração do Vercel
cat > setup-vercel.sh << 'EOF'
#!/bin/bash
echo "🌐 CONFIGURAÇÃO AUTOMÁTICA DO VERCEL"
echo "===================================="

# Verificar se o Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "Instalando Vercel CLI..."
    npm install -g vercel
fi

# Login no Vercel
echo "🔐 Fazendo login no Vercel..."
vercel login

# Deploy do projeto
echo "🚀 Fazendo deploy no Vercel..."
cd demandas-web
vercel --prod

# Obter URL do projeto
echo "🔗 Obtendo URL do projeto..."
VERCEL_URL=$(vercel ls --json | jq -r '.[0].url')

if [ -n "$VERCEL_URL" ]; then
    echo "✅ URL do Vercel: https://$VERCEL_URL"
    echo "Configure esta URL no CORS do backend"
else
    echo "⚠️ Não foi possível obter a URL do Vercel"
fi

cd ..
EOF

chmod +x setup-vercel.sh

# Instruções finais
echo ""
echo "🎉 CONFIGURAÇÃO DE SECRETS CONCLUÍDA!"
echo "====================================="
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. 🚀 EXECUTAR DEPLOY AUTOMÁTICO:"
echo "   ./setup-deploy.sh"
echo ""
echo "2. 🔧 CONFIGURAR RAILWAY:"
echo "   ./setup-railway.sh"
echo ""
echo "3. 🌐 CONFIGURAR VERCEL:"
echo "   ./setup-vercel.sh"
echo ""
echo "4. 🔗 CONECTAR SERVIÇOS:"
echo "   - Configure VITE_API_URL no Vercel"
echo "   - Atualize CORS no backend"
echo ""
echo "5. 🚀 DEPLOY RÁPIDO:"
echo "   ./quick-deploy.sh"
echo ""
echo "📚 Todos os scripts estão prontos para uso!"

