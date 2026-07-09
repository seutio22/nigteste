# Sobe API (3001) + Web (5173) para desenvolvimento local
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host 'Encerrando instancias antigas nas portas 3001 e 5173...' -ForegroundColor Yellow
foreach ($port in 3001, 5173) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}
Start-Sleep -Seconds 1

Write-Host 'Iniciando API em http://127.0.0.1:3001 ...' -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "Set-Location '$root\demandas-api'; npm run dev"
) | Out-Null

Start-Sleep -Seconds 3

Write-Host 'Iniciando Web em http://localhost:5173 (proxy /api -> 3001) ...' -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "Set-Location '$root\demandas-web'; `$env:VITE_API_URL='/api'; `$env:VITE_API_PROXY_TARGET='http://127.0.0.1:3001'; npm run dev"
) | Out-Null

Write-Host ''
Write-Host 'Pronto. Abra: http://localhost:5173' -ForegroundColor Green
Write-Host 'Se login falhar, limpe localStorage (F12 > Application > Local Storage > Clear).' -ForegroundColor DarkYellow
