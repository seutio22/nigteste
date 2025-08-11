#!/bin/bash

echo "🚀 Iniciando deploy do PROJETO DEMANDAS..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para exibir mensagens
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se o projeto está no GitHub
if ! git remote get-url origin | grep -q "github.com"; then
    print_error "Este projeto deve estar no GitHub para deploy automático!"
    echo "Execute: git remote add origin https://github.com/seu-usuario/seu-repositorio.git"
    exit 1
fi

print_status "Projeto verificado no GitHub"

# Build do backend
echo "🔧 Build do backend..."
cd demandas-api
npm install
npm run build
if [ $? -eq 0 ]; then
    print_status "Backend buildado com sucesso"
else
    print_error "Erro no build do backend"
    exit 1
fi

# Build do frontend
echo "🌐 Build do frontend..."
cd ../demandas-web
npm install
npm run build
if [ $? -eq 0 ]; then
    print_status "Frontend buildado com sucesso"
else
    print_error "Erro no build do frontend"
    exit 1
fi

cd ..

# Commit e push das alterações
echo "📝 Commit das alterações..."
git add .
git commit -m "🚀 Configuração de deploy online"
git push origin main

print_status "Deploy configurado com sucesso!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. 🌐 Deploy do Frontend (Vercel):"
echo "   - Acesse: https://vercel.com"
echo "   - Importe este repositório"
echo "   - Configure: Root Directory = demandas-web"
echo ""
echo "2. 🔧 Deploy do Backend (Railway):"
echo "   - Acesse: https://railway.app"
echo "   - Importe este repositório"
echo "   - Configure as variáveis de ambiente"
echo ""
echo "3. 🗄️  Banco de Dados:"
echo "   - Crie PostgreSQL no Railway"
echo "   - Configure DATABASE_URL"
echo "   - Execute: npm run db:migrate"
echo ""
echo "4. 🔗 Conecte Frontend e Backend:"
echo "   - Configure VITE_API_URL no Vercel"
echo "   - Atualize CORS no backend"
echo ""
echo "📚 Consulte o README.md para instruções detalhadas"

