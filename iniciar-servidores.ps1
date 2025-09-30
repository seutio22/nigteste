# Script para iniciar os servidores de desenvolvimento
# Uso: .\iniciar-servidores.ps1

Write-Host "🚀 Iniciando servidores de desenvolvimento..." -ForegroundColor Green

# Função para iniciar um servidor em background
function Start-Server {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Command
    )
    
    Write-Host "📦 Iniciando $Name..." -ForegroundColor Yellow
    Write-Host "   Caminho: $Path" -ForegroundColor Gray
    Write-Host "   Comando: $Command" -ForegroundColor Gray
    
    # Mudar para o diretório e executar comando
    Push-Location $Path
    try {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $Command
        Write-Host "✅ $Name iniciado com sucesso!" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Erro ao iniciar $Name`: $_" -ForegroundColor Red
    }
    finally {
        Pop-Location
    }
}

# Iniciar API
Start-Server -Name "API Backend" -Path "demandas-api" -Command "npm run dev"

# Aguardar um pouco para a API inicializar
Write-Host "⏳ Aguardando API inicializar..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Iniciar Frontend
Start-Server -Name "Frontend React" -Path "demandas-web" -Command "npm run dev"

Write-Host "🎉 Servidores iniciados!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔧 API: http://localhost:3333" -ForegroundColor Cyan
Write-Host "💡 Use Ctrl+C para parar os servidores" -ForegroundColor Yellow
