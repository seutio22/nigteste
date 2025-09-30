@echo off
echo 🔄 Aplicando correção rápida do banco de dados...

echo 📦 Gerando cliente Prisma...
npx prisma generate

echo 💾 Aplicando mudanças no banco...
npx prisma db push

echo ✅ Pronto! Agora pode iniciar o servidor com: npm run dev
pause
