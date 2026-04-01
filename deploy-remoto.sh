#!/bin/bash

echo "🚀 DEPLOY REMOTO AUTOMÁTICO - PROJETO DEMANDAS"
echo "================================================"
echo "Este script pode ser executado remotamente para configurar tudo!"
echo ""

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

# Verificar se está no diretório correto
if [ ! -f "demandas-api/package.json" ] || [ ! -f "demandas-web/package.json" ]; then
    print_error "Execute este script na raiz do projeto!"
    exit 1
fi

print_status "Diretório do projeto verificado"

# Verificar se o Git está configurado
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_warning "Git não inicializado. Inicializando..."
    git init
    git add .
    git commit -m "🚀 Configuração inicial do projeto"
fi

# Verificar se o repositório remoto está configurado
if ! git remote get-url origin > /dev/null 2>&1; then
    print_error "Repositório remoto não configurado!"
    echo ""
    echo "Para deploy remoto, você precisa:"
    echo "1. Criar um repositório no GitHub"
    echo "2. Executar: git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git"
    echo "3. Ou me dar acesso ao repositório para eu configurar"
    echo ""
    exit 1
fi

print_status "Repositório Git configurado"

# Obter informações do repositório
REPO_URL=$(git remote get-url origin)
REPO_OWNER=$(echo $REPO_URL | sed -n 's/.*github\.com[:/]\([^/]*\)\/\([^/]*\)\.git.*/\1/p')
REPO_NAME=$(echo $REPO_URL | sed -n 's/.*github\.com[:/]\([^/]*\)\/\([^/]*\)\.git.*/\2/p')

print_info "Repositório: $REPO_OWNER/$REPO_NAME"

# Configurar variáveis de ambiente automaticamente
echo ""
print_step "CONFIGURANDO VARIÁVEIS DE AMBIENTE AUTOMATICAMENTE..."

# Gerar JWT secret seguro
JWT_SECRET=$(openssl rand -base64 64)

# Criar arquivo .env para o backend
cat > demandas-api/.env << EOF
# Configurações do Banco de Dados (será configurado pelo Railway)
DATABASE_URL=""

# Configurações de Segurança
JWT_SECRET="$JWT_SECRET"

# Configurações do Servidor
NODE_ENV="production"
PORT=3333

# Configurações de CORS (será atualizado após deploy)
CORS_ORIGIN=""
EOF

print_status "Arquivo .env do backend criado"

# Criar arquivo .env para o frontend
cat > demandas-web/.env << EOF
# URL da API (será configurado após deploy do Railway)
VITE_API_URL=""

# Configurações de ambiente
VITE_APP_NAME="Sistema de Demandas"
VITE_APP_VERSION="0.8.4"
EOF

print_status "Arquivo .env do frontend criado"

# Instalar dependências e fazer build
echo ""
print_step "INSTALANDO DEPENDÊNCIAS E FAZENDO BUILD..."

# Backend
cd demandas-api
print_info "Backend: Instalando dependências..."
npm install

print_info "Backend: Fazendo build..."
npm run build

if [ $? -eq 0 ]; then
    print_status "Backend buildado com sucesso"
else
    print_error "Erro no build do backend"
    exit 1
fi

cd ..

# Frontend
cd demandas-web
print_info "Frontend: Instalando dependências..."
npm install

print_info "Frontend: Fazendo build..."
npm run build

if [ $? -eq 0 ]; then
    print_status "Frontend buildado com sucesso"
else
    print_error "Erro no build do frontend"
    exit 1
fi

cd ..

# Criar arquivo de configuração do Railway
cat > railway.json << EOF
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "on_failure"
  }
}
EOF

print_status "Configuração do Railway criada"

# Criar arquivo de configuração do Vercel
cat > vercel.json << EOF
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
EOF

print_status "Configuração do Vercel criada"

# Criar arquivo de configuração do GitHub Actions
mkdir -p .github/workflows
cat > .github/workflows/deploy.yml << 'EOF'
name: 🚀 Deploy Automático

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Test Backend
        working-directory: ./demandas-api
        run: |
          npm ci
          npm run build
      
      - name: Test Frontend
        working-directory: ./demandas-web
        run: |
          npm ci
          npm run build

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@v1.0.0
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: ${{ secrets.RAILWAY_SERVICE }}

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./demandas-web
EOF

print_status "GitHub Actions configurado para deploy automático"

# Criar arquivo de instruções para deploy remoto
cat > DEPLOY-REMOTO.md << EOF
# 🚀 DEPLOY REMOTO - INSTRUÇÕES PARA TERCEIROS

## 📋 INFORMAÇÕES NECESSÁRIAS:

### **1. GitHub Repository:**
- URL: $REPO_URL
- Owner: $REPO_OWNER
- Name: $REPO_NAME

### **2. Tokens Necessários:**
- **Railway Token**: https://railway.app/account/tokens
- **Vercel Token**: https://vercel.com/account/tokens

### **3. Secrets para Configurar:**
- \`RAILWAY_TOKEN\`: Token do Railway
- \`RAILWAY_SERVICE\`: Nome do serviço no Railway
- \`VERCEL_TOKEN\`: Token do Vercel
- \`ORG_ID\`: ID da organização Vercel (opcional)
- \`PROJECT_ID\`: ID do projeto Vercel (opcional)

## 🔧 PASSOS PARA DEPLOY REMOTO:

### **1. Configurar Secrets no GitHub:**
1. Acesse: https://github.com/$REPO_OWNER/$REPO_NAME/settings/secrets/actions
2. Adicione os secrets listados acima

### **2. Deploy no Railway:**
1. Acesse: https://railway.app
2. Importe o repositório: $REPO_URL
3. Configure as variáveis de ambiente:
   - \`DATABASE_URL\`: URL do PostgreSQL (criado automaticamente)
   - \`JWT_SECRET\`: $JWT_SECRET
   - \`NODE_ENV\`: production

### **3. Deploy no Vercel:**
1. Acesse: https://vercel.com
2. Importe o repositório: $REPO_URL
3. Configure:
   - Root Directory: demandas-web
   - Build Command: npm run build
   - Output Directory: dist

### **4. Conectar Frontend e Backend:**
1. Copie a URL do Railway
2. Configure \`VITE_API_URL\` no Vercel
3. Atualize CORS no backend com a URL do Vercel

## 🎯 RESULTADO ESPERADO:
- Frontend: https://seu-projeto.vercel.app
- Backend: https://seu-projeto.railway.app
- Banco: PostgreSQL gerenciado pelo Railway

## 📞 SUPORTE:
- GitHub Actions: https://github.com/$REPO_OWNER/$REPO_NAME/actions
- Railway: https://railway.app
- Vercel: https://vercel.com
EOF

print_status "Instruções para deploy remoto criadas (DEPLOY-REMOTO.md)"

# Commit e push das alterações
echo ""
print_step "FAZENDO COMMIT DAS CONFIGURAÇÕES..."
git add .
git commit -m "🚀 Configuração para deploy remoto automático"

if git push origin main 2>/dev/null || git push origin master 2>/dev/null; then
    print_status "Configurações enviadas para o repositório"
else
    print_warning "Não foi possível fazer push. Execute manualmente: git push origin main"
fi

# Instruções finais
echo ""
echo "🎉 CONFIGURAÇÃO PARA DEPLOY REMOTO CONCLUÍDA!"
echo "=============================================="
echo ""
echo "📋 PRÓXIMOS PASSOS PARA DEPLOY REMOTO:"
echo ""
echo "1. 🔑 CONFIGURAR SECRETS NO GITHUB:"
echo "   - Vá para: https://github.com/$REPO_OWNER/$REPO_NAME/settings/secrets/actions"
echo "   - Adicione: RAILWAY_TOKEN, RAILWAY_SERVICE, VERCEL_TOKEN"
echo ""
echo "2. 🚀 DEPLOY AUTOMÁTICO:"
echo "   - A cada push para main/master, o deploy acontece automaticamente"
echo "   - Use: git push origin main para trigger"
echo ""
echo "3. 🌐 CONFIGURAR PLATAFORMAS:"
echo "   - Railway: Importe o repositório e configure o banco PostgreSQL"
echo "   - Vercel: Importe o repositório e configure o domínio"
echo ""
echo "4. 🔗 CONECTAR FRONTEND E BACKEND:"
echo "   - Configure VITE_API_URL no Vercel com a URL do Railway"
echo "   - Atualize CORS no backend"
echo ""
echo "📚 Consulte o arquivo DEPLOY-REMOTO.md para instruções detalhadas"
echo "🚀 Para deploy rápido: git push origin main"
echo ""
echo "💡 DICA: Me dê acesso ao repositório e eu faço tudo automaticamente!"

