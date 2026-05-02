# Deploy do portal-web na Vercel (produção).
#
# Erro EBUSY em esbuild.exe = outro processo está a usar esbuild (Node).
#
# Ordem recomendada:
#   1) .\scripts\deploy-portal-web.ps1 -KillNode -Clean
#      (-KillNode termina TODOS os processos node.exe — fecha dev servers; pode afetar extensões que usem Node.)
#   2) Se ainda bloquear: feche o Cursor por completo e apague portal-web\node_modules no Explorador,
#      ou abra PowerShell FORA do Cursor e volte a correr este script.
#
# Root Directory na Vercel: Settings → General → Root Directory (evitar duplicar portal-web).
#
# Uso:
#   .\scripts\deploy-portal-web.ps1
#   .\scripts\deploy-portal-web.ps1 -Clean
#   .\scripts\deploy-portal-web.ps1 -KillNode -Clean

param(
  [switch]$Clean,
  [switch]$KillNode
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$pw = Join-Path $root "portal-web"
Set-Location $pw

if ($KillNode) {
  Write-Host "A terminar processos Node (node.exe)…" -ForegroundColor Yellow
  Get-Process -Name node -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  PID $($_.Id)" -ForegroundColor DarkGray
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 2
}

function Remove-NodeModulesSafe {
  $nm = Join-Path $pw "node_modules"
  if (-not (Test-Path $nm)) { return }
  Write-Host "A remover node_modules… (pode demorar)" -ForegroundColor Yellow
  try {
    Remove-Item -LiteralPath $nm -Recurse -Force -ErrorAction Stop
  } catch {
    Write-Host "Não foi possível apagar node_modules (ficheiro ainda bloqueado)." -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host @"

Tente:
  .\scripts\deploy-portal-web.ps1 -KillNode -Clean

Ou feche o Cursor inteiro, apague manualmente a pasta:
  $pw\node_modules

"@ -ForegroundColor Yellow
    exit 1
  }
}

if ($Clean) {
  Remove-NodeModulesSafe
}

Write-Host "Instalar dependências…" -ForegroundColor Cyan
npm ci
if ($LASTEXITCODE -ne 0) {
  Write-Host "npm ci falhou (ex.: EBUSY). A limpar node_modules e a repetir uma vez…" -ForegroundColor Yellow
  Remove-NodeModulesSafe
  npm ci
  if ($LASTEXITCODE -ne 0) {
    Write-Host "A tentar npm install…" -ForegroundColor Yellow
    npm install
  }
}

if ($LASTEXITCODE -ne 0) {
  Write-Host @"

Falhou de novo. Passos manuais:
  1. Task Manager → terminar todos os «Node.js JavaScript Runtime»
  2. Fechar outros terminais / Cursor a correr vite
  3. Apagar pasta: $pw\node_modules
  4. npm ci
  5. npx vite build && npx vercel deploy --prod --yes

"@ -ForegroundColor Yellow
  exit $LASTEXITCODE
}

Write-Host "Build (npx vite)…" -ForegroundColor Cyan
npx vite build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Deploy produção Vercel…" -ForegroundColor Cyan
npx vercel deploy --prod --yes
exit $LASTEXITCODE
