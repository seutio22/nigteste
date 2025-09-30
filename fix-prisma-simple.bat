@echo off
echo Regenerando Prisma client...
cd demandas-api
npx prisma generate
echo Prisma regenerado!
echo Iniciando servidor...
npm run dev
