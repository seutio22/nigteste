#!/bin/bash

echo "🚀 CONFIGURAÇÃO AUTOMÁTICA DE DEPLOY - PROJETO DEMANDAS"
echo "========================================================"

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
    print_warning "Repositório remoto não configurado!"
    echo ""
    echo "Para continuar, você precisa:"
    echo "1. Criar um repositório no GitHub"
    echo "2. Executar: git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git"
    echo ""
    read -p "Pressione ENTER após configurar o repositório remoto..."
    
    if ! git remote get-url origin > /dev/null 2>&1; then
        print_error "Repositório remoto ainda não configurado!"
        exit 1
    fi
fi

print_status "Repositório Git configurado"

# Configurar variáveis de ambiente
echo ""
print_info "Configurando variáveis de ambiente..."

# Criar arquivo .env para o backend
cat > demandas-api/.env.example << EOF
# Configurações do Banco de Dados
DATABASE_URL="postgresql://usuario:senha@localhost:5432/demandas"

# Configurações de Segurança
JWT_SECRET="sua-chave-secreta-super-segura-aqui"

# Configurações do Servidor
NODE_ENV="development"
PORT=3333

# Configurações de CORS (para desenvolvimento)
CORS_ORIGIN="http://localhost:5173"
EOF

# Criar arquivo .env para o frontend
cat > demandas-web/.env.example << EOF
# URL da API
VITE_API_URL="http://localhost:3333"

# Configurações de ambiente
VITE_APP_NAME="Sistema de Demandas"
VITE_APP_VERSION="1.0.0"
EOF

print_status "Arquivos .env.example criados"

# Instalar dependências e fazer build
echo ""
print_info "Instalando dependências e fazendo build..."

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

# Commit e push das alterações
echo ""
print_info "Fazendo commit das configurações..."
git add .
git commit -m "🚀 Configuração automática de deploy completa"

if git push origin main 2>/dev/null || git push origin master 2>/dev/null; then
    print_status "Configurações enviadas para o repositório"
else
    print_warning "Não foi possível fazer push. Execute manualmente: git push origin main"
fi

# Criar script de deploy rápido
cat > quick-deploy.sh << 'EOF'
#!/bin/bash
echo "🚀 Deploy Rápido - PROJETO DEMANDAS"
echo "===================================="

# Verificar se há alterações
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Há alterações não commitadas. Fazendo commit..."
    git add .
    git commit -m "🚀 Deploy automático $(date)"
fi

# Push para trigger do deploy automático
echo "📤 Enviando para deploy automático..."
git push origin main 2>/dev/null || git push origin master 2>/dev/null

echo "✅ Deploy iniciado! Verifique o status no GitHub Actions."
echo "🌐 Frontend: https://vercel.com"
echo "🔧 Backend: https://railway.app"
EOF

chmod +x quick-deploy.sh

print_status "Script de deploy rápido criado (quick-deploy.sh)"

# Instruções finais
echo ""
echo "🎉 CONFIGURAÇÃO AUTOMÁTICA CONCLUÍDA!"
echo "======================================"
echo ""
echo "📋 PRÓXIMOS PASSOS AUTOMÁTICOS:"
echo ""
echo "1. 🔑 CONFIGURAR SECRETS NO GITHUB:"
echo "   - Vá para: Settings > Secrets and variables > Actions"
echo "   - Adicione: RAILWAY_TOKEN, RAILWAY_SERVICE"
echo "   - Adicione: VERCEL_TOKEN, ORG_ID, PROJECT_ID"
echo ""
echo "2. 🚀 DEPLOY AUTOMÁTICO:"
echo "   - A cada push para main/master, o deploy acontece automaticamente"
echo "   - Use: ./quick-deploy.sh para deploy rápido"
echo ""
echo "3. 🌐 CONFIGURAR PLATAFORMAS:"
echo "   - Railway: Importe o repositório e configure o banco PostgreSQL"
echo "   - Vercel: Importe o repositório e configure o domínio"
echo ""
echo "4. 🔗 CONECTAR FRONTEND E BACKEND:"
echo "   - Configure VITE_API_URL no Vercel com a URL do Railway"
echo ""
echo "📚 Para mais detalhes, consulte o README.md"
echo "🚀 Para deploy rápido: ./quick-deploy.sh"

