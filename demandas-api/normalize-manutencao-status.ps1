# Script PowerShell para normalizar status de Manutenção
# Este script executa o SQL diretamente no banco de dados PostgreSQL

# Verificar se o psql está disponível
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "❌ psql não encontrado. Instalando via chocolatey ou use outro método..." -ForegroundColor Red
    Write-Host ""
    Write-Host "Opções:" -ForegroundColor Yellow
    Write-Host "1. Instalar PostgreSQL client: choco install postgresql" -ForegroundColor Cyan
    Write-Host "2. Ou execute o SQL manualmente no Railway Dashboard" -ForegroundColor Cyan
    Write-Host "3. Ou use o script Node.js: node normalize-manutencao-concluida.js" -ForegroundColor Cyan
    exit 1
}

# Solicitar DATABASE_URL
Write-Host "🔐 Para executar este script, você precisa da DATABASE_URL do Railway" -ForegroundColor Yellow
Write-Host ""
Write-Host "Como obter:" -ForegroundColor Cyan
Write-Host "1. Acesse: https://railway.app/project" -ForegroundColor White
Write-Host "2. Selecione seu projeto" -ForegroundColor White
Write-Host "3. Vá em 'Variables' e copie a DATABASE_URL" -ForegroundColor White
Write-Host ""
$databaseUrl = Read-Host "Cole a DATABASE_URL aqui (ou pressione Enter para usar variável de ambiente)"

if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    $databaseUrl = $env:DATABASE_URL
}

if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    Write-Host "❌ DATABASE_URL não fornecida!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📊 Executando normalização de status..." -ForegroundColor Green
Write-Host ""

# Ler o arquivo SQL
$sqlFile = Join-Path $PSScriptRoot "normalize-manutencao-status.sql"
$sqlContent = Get-Content $sqlFile -Raw

# Executar SQL
try {
    $env:PGPASSWORD = ($databaseUrl -split '@')[0] -replace '.*:', ''
    $dbHost = ($databaseUrl -split '@')[1] -split '/|:' | Select-Object -First 1
    $dbPort = if ($databaseUrl -match ':\d+/') { ($databaseUrl -split ':')[3] -split '/' | Select-Object -First 1 } else { '5432' }
    $dbName = ($databaseUrl -split '/')[-1] -replace '\?.*', ''
    $dbUser = ($databaseUrl -split '://')[1] -split ':' | Select-Object -First 1
    
    Write-Host "🔗 Conectando ao banco: $dbName em $dbHost" -ForegroundColor Cyan
    
    # Executar SQL
    $sqlContent | & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName
    
    Write-Host ""
    Write-Host "✅ Normalização concluída!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao executar SQL: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Alternativa: Execute o SQL manualmente no Railway Dashboard" -ForegroundColor Yellow
    Write-Host "   Ou use: node normalize-manutencao-concluida.js (se tiver DATABASE_URL configurada)" -ForegroundColor Yellow
    exit 1
}

