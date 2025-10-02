# Forcar aplicacao do schema no Railway
echo 'Aplicando schema no Railway...'
npx prisma db push --accept-data-loss --force-reset
echo 'Schema aplicado com sucesso!'
