# Script PowerShell para executar SQL no Railway
# Execute primeiro: npx @railway/cli login
# Depois execute este script

Write-Host "🔍 Executando SQL no Railway..." -ForegroundColor Cyan

# Primeiro, vamos verificar o status
$status = npx @railway/cli status
Write-Host $status

# Executar o SQL diretamente
Write-Host "`n📝 Executando correção de status..." -ForegroundColor Yellow

# Opção 1: Via psql direto
$sql = @"
SELECT 
  id,
  status,
  ticket,
  descricao,
  "createdAt",
  "updatedAt"
FROM "Demanda"
WHERE status = 'EM ANDAMENT';
"@

Write-Host "`n🔍 Verificando registros antes da alteração..." -ForegroundColor Cyan
npx @railway/cli run --service api psql $env:DATABASE_URL -c $sql

# UPDATE
$updateSql = @"
UPDATE "Demanda"
SET 
  status = 'Em Andamento',
  "updatedAt" = NOW()
WHERE 
  status = 'EM ANDAMENT';
"@

Write-Host "`n✨ Executando UPDATE..." -ForegroundColor Green
npx @railway/cli run --service api psql $env:DATABASE_URL -c $updateSql

Write-Host "`n✅ Correção concluída!" -ForegroundColor Green

