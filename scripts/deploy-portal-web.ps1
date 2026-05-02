# Deploy do portal-web na Vercel (produção).
#
# Erro EBUSY em esbuild.exe: feche o «npm run dev», pré-visualizações e outros terminais Node;
# no Cursor pare o servidor Vite. Depois: .\scripts\deploy-portal-web.ps1 -Clean
#
# Root Directory na Vercel: ver comentários no histórico do repo ou em scripts/deploy-portal-web.ps1 (commit anterior).
#
# Uso:
#   .\scripts\deploy-portal-web.ps1           # instala e faz deploy
#   .\scripts\deploy-portal-web.ps1 -Clean    # apaga node_modules primeiro (resolve EBUSY após fechar Node)

param(
  [switch]$Clean
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$pw = Join-Path $root "portal-web"
Set-Location $pw

function Remove-NodeModulesSafe {
  $nm = Join-Path $pw "node_modules"
  if (-not (Test-Path $nm)) { return }
  Write-Host "A remover node_modules… (pode demorar)" -ForegroundColor Yellow
  try {
    Remove-Item -LiteralPath $nm -Recurse -Force -ErrorAction Stop
  } catch {
    Write-Host "Não foi possível apagar node_modules ainda bloqueado. Feche processos Node (Task Manager → Node.js) e volte a correr com -Clean." -ForegroundColor Red
    Write-Host $_.Exception.Message
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
