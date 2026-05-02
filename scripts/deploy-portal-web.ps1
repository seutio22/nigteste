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
# Vercel — na raiz do monorepo não há vercel.json (evita publicar o Nexus no domínio do portal).
# No painel do projeto «portal-web»: «Root Directory» VAZIO se o deploy for da pasta portal-web neste
# repo (CLI aqui ou GitHub Actions). Só use «portal-web» se a Vercel integrar Git no monorepo inteiro sem este workflow.
# Se aparecer portal-web\portal-web duplicado no CLI, confirme cwd; ou use só o workflow na Actions.
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
  Get-Process -Name esbuild -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  esbuild PID $($_.Id)" -ForegroundColor DarkGray
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 2
}

function Clear-FolderWithRobocopyMirror {
  param([Parameter(Mandatory)][string]$TargetDir)
  $empty = Join-Path $env:TEMP ("nm_empty_" + [guid]::NewGuid().ToString("n").Substring(0, 12))
  New-Item -ItemType Directory -Path $empty -Force | Out-Null
  try {
    # Espelha pasta vazia sobre o destino — truque Windows para ficheiros «presos»
    $null = & robocopy $empty $TargetDir /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP 2>&1
    $code = $LASTEXITCODE
    if ($code -ge 8) {
      throw "robocopy falhou com código $code"
    }
  } finally {
    Remove-Item -LiteralPath $empty -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Remove-NodeModulesSafe {
  $nm = Join-Path $pw "node_modules"
  if (-not (Test-Path $nm)) { return }
  Write-Host "A remover node_modules… (pode demorar)" -ForegroundColor Yellow
  try {
    Remove-Item -LiteralPath $nm -Recurse -Force -ErrorAction Stop
    return
  } catch {
    Write-Host "Remove-Item falhou; a tentar robocopy /MIR (esvaziar pasta bloqueada)…" -ForegroundColor Yellow
  }
  try {
    Clear-FolderWithRobocopyMirror -TargetDir $nm
    Start-Sleep -Milliseconds 500
    Remove-Item -LiteralPath $nm -Recurse -Force -ErrorAction Stop
    Write-Host "node_modules removido (após robocopy)." -ForegroundColor Green
  } catch {
    Write-Host "Ainda bloqueado após robocopy." -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host @"

  • Feche o Cursor por completo e volte a correr (PowerShell à parte):
      cd $root
      .\scripts\deploy-portal-web.ps1 -KillNode -Clean

  • Ou reinicie o PC e apague a pasta no Explorador:
      $nm

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
  5. cd portal-web; npx vercel deploy --prod --yes

"@ -ForegroundColor Yellow
  exit $LASTEXITCODE
}

Write-Host "Build (npx vite)…" -ForegroundColor Cyan
npx vite build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host @"

Deploy Vercel (cwd = portal-web)…
Se aparecer erro «portal-web\portal-web» não existe:
  Painel → projeto portal-web → Settings → General → Root Directory → APAGUE o valor (deixe vazio).
  Esse campo «portal-web» soma-se ao caminho do CLI e duplica a pasta.
  Com Root Directory vazio, deploys por Git no monorepo exigem Build/Install em portal-web (ver doc Vercel monorepo).

"@ -ForegroundColor DarkYellow
# Já estamos em $pw (portal-web) desde o início do script.
npx vercel deploy --prod --yes
exit $LASTEXITCODE
