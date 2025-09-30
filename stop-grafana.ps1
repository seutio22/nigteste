# Script para parar o Grafana
Write-Host "🛑 Parando Grafana Dashboard..." -ForegroundColor Yellow

# Parar containers
docker-compose -f docker-compose.grafana.yml down

Write-Host "✅ Grafana parado com sucesso!" -ForegroundColor Green
