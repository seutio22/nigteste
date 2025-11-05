# 🧪 TESTE DAS 3 MELHORIAS IMPLEMENTADAS
# Script para validar que as melhorias foram aplicadas corretamente

Write-Host "🧪 Testando Melhorias Implementadas..." -ForegroundColor Cyan

$errors = 0

# Teste 1: Verificar se @fastify/compress foi instalado
Write-Host "`n1️⃣ Verificando Compression HTTP..." -ForegroundColor Yellow
if (Test-Path "demandas-api\node_modules\@fastify\compress") {
    Write-Host "   ✅ @fastify/compress instalado" -ForegroundColor Green
} else {
    Write-Host "   ❌ @fastify/compress NÃO instalado" -ForegroundColor Red
    $errors++
}

# Teste 2: Verificar se compression está no código
$serverContent = Get-Content "demandas-api\src\server.ts" -Raw
if ($serverContent -match "@fastify/compress" -and $serverContent -match "app.register\(compress") {
    Write-Host "   ✅ Compression registrado no server.ts" -ForegroundColor Green
} else {
    Write-Host "   ❌ Compression NÃO encontrado no código" -ForegroundColor Red
    $errors++
}

# Teste 3: Verificar Connection Pooling
Write-Host "`n2️⃣ Verificando Connection Pooling..." -ForegroundColor Yellow
$prismaContent = Get-Content "demandas-api\src\lib\prisma.ts" -Raw
if ($prismaContent -match "connection_limit=10") {
    Write-Host "   ✅ Connection pooling otimizado (10 conexões)" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Connection pooling pode não estar otimizado" -ForegroundColor Yellow
}

# Teste 4: Verificar Migration de Índices
Write-Host "`n3️⃣ Verificando Índices..." -ForegroundColor Yellow
$migrationPath = "demandas-api\prisma\migrations\20251104202348_add_performance_indexes\migration.sql"
if (Test-Path $migrationPath) {
    $migrationContent = Get-Content $migrationPath -Raw
    $indexCount = ([regex]::Matches($migrationContent, "CREATE INDEX")).Count
    Write-Host "   ✅ Migration criada com $indexCount índices" -ForegroundColor Green
    
    if ($migrationContent -match "idx_demanda_updated_at" -and 
        $migrationContent -match "idx_manutencao_updated_at" -and
        $migrationContent -match "idx_atendimento_updated_at") {
        Write-Host "   ✅ Índices críticos incluídos" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Alguns índices podem estar faltando" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Migration NÃO encontrada" -ForegroundColor Red
    $errors++
}

# Teste 5: Verificar se build funciona
Write-Host "`n4️⃣ Verificando Build..." -ForegroundColor Yellow
if (Test-Path "demandas-api\dist\server.js") {
    Write-Host "   ✅ Build gerado com sucesso" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Build não encontrado (execute: npm run build)" -ForegroundColor Yellow
}

# Resumo
Write-Host "`n📊 Resumo dos Testes:" -ForegroundColor Cyan
if ($errors -eq 0) {
    Write-Host "   ✅ Todas as melhorias foram implementadas corretamente!" -ForegroundColor Green
    Write-Host "`n📝 Próximos passos:" -ForegroundColor Yellow
    Write-Host "   1. Execute: cd demandas-api && npm run db:migrate" -ForegroundColor White
    Write-Host "   2. Execute: npm run dev" -ForegroundColor White
    Write-Host "   3. Teste as rotas e verifique performance" -ForegroundColor White
} else {
    Write-Host "   ⚠️  Encontrados $errors erro(s) - verifique acima" -ForegroundColor Yellow
}

