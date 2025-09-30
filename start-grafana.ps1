# Script para iniciar o Grafana
Write-Host "🚀 Iniciando Grafana Dashboard..." -ForegroundColor Green

# Verificar se o Docker está rodando
try {
    docker --version | Out-Null
    Write-Host "✅ Docker encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker não encontrado. Instale o Docker Desktop primeiro." -ForegroundColor Red
    exit 1
}

# Parar containers existentes se estiverem rodando
Write-Host "🛑 Parando containers existentes..." -ForegroundColor Yellow
docker-compose -f docker-compose.grafana.yml down

# Iniciar o Grafana
Write-Host "🚀 Iniciando Grafana..." -ForegroundColor Green
docker-compose -f docker-compose.grafana.yml up -d

# Aguardar o Grafana inicializar
Write-Host "⏳ Aguardando Grafana inicializar..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar se está rodando
$grafanaStatus = docker ps --filter "name=grafana-dashboard" --format "table {{.Status}}"
if ($grafanaStatus -like "*Up*") {
    Write-Host "✅ Grafana iniciado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Acesse o Grafana em: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "👤 Login: admin" -ForegroundColor Cyan
    Write-Host "🔑 Senha: admin123" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 Dashboard personalizado já configurado!" -ForegroundColor Green
    Write-Host "🔗 Para parar: docker-compose -f docker-compose.grafana.yml down" -ForegroundColor Yellow
} else {
    Write-Host "❌ Erro ao iniciar Grafana" -ForegroundColor Red
    Write-Host "📋 Logs: docker logs grafana-dashboard" -ForegroundColor Yellow
}
