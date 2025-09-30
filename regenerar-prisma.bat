@echo off
echo Regenerando Prisma client...
cd demandas-api
npx prisma generate
echo Prisma client regenerado!
echo Reiniciando servidor...
npm run dev
