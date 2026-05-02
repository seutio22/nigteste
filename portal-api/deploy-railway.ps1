# Deploy da API do portal (Railway).
#
# === Painel Railway (Settings → Build) ===
#   Root Directory: portal-api  (sem "/" inicial)
#
# Stage dentro do monorepo: `.railway-staging-portal-api/` (ver .gitignore).
#
# O `npm exec` inline no PowerShell muitas vezes esconde stderr. Aqui usa-se `Start-Process`
# com `npm.cmd` e ficheiros temporários para mostrar **stdout e stderr** do Railway CLI.
#
# Autenticação: `railway login` OU `$env:RAILWAY_TOKEN` (token do **mesmo** projeto no Railway).
#
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $here '..')).Path
$portalSrc = Join-Path $repoRoot 'portal-api'
$stageRoot = Join-Path $repoRoot '.railway-staging-portal-api'
$stagePortal = Join-Path $stageRoot 'portal-api'
$robolog = Join-Path $stageRoot 'robocopy.log'

$ProjectId = 'af05d835-bea3-4b3a-a2b0-dcecec4e1121'
$EnvironmentId = 'd866c183-f35b-4294-aa56-51bf91b57bd3'
$ServiceId = 'bb0654bb-1aaa-44ae-a139-f5213b85bd97'

$env:RAILWAY_PROJECT_ID = $ProjectId
$env:RAILWAY_ENVIRONMENT_ID = $EnvironmentId
$env:RAILWAY_SERVICE_ID = $ServiceId

function Write-RailwayLogFiles([string]$OutPath, [string]$ErrPath) {
  if (Test-Path -LiteralPath $OutPath) {
    $t = Get-Content -LiteralPath $OutPath -Raw -ErrorAction SilentlyContinue
    if ($t) { Write-Host '--- stdout ---' -ForegroundColor DarkGray; Write-Host $t }
  }
  if (Test-Path -LiteralPath $ErrPath) {
    $e = Get-Content -LiteralPath $ErrPath -Raw -ErrorAction SilentlyContinue
    if ($e) { Write-Host '--- stderr ---' -ForegroundColor Yellow; Write-Host $e }
  }
}

function Invoke-NpmRailway {
  param(
    [Parameter(Mandatory)][string]$WorkingDirectory,
    [Parameter(Mandatory)][string[]]$RailwayArguments
  )
  $uid = [guid]::NewGuid().ToString('n').Substring(0, 10)
  $outF = Join-Path $env:TEMP "railway-out-$uid.txt"
  $errF = Join-Path $env:TEMP "railway-err-$uid.txt"
  Remove-Item -LiteralPath $outF, $errF -Force -ErrorAction SilentlyContinue

  $npmArgs = @('exec', '--yes', '--package=@railway/cli@latest', '--', 'railway') + $RailwayArguments
  $nc = Get-Command npm.cmd -ErrorAction SilentlyContinue
  $npmCmd = if ($nc) { $nc.Source } else { 'npm.cmd' }

  $p = Start-Process -FilePath $npmCmd -ArgumentList $npmArgs -WorkingDirectory $WorkingDirectory `
    -NoNewWindow -Wait -PassThru `
    -RedirectStandardOutput $outF -RedirectStandardError $errF

  Write-RailwayLogFiles -OutPath $outF -ErrPath $errF
  Remove-Item -LiteralPath $outF, $errF -Force -ErrorAction SilentlyContinue
  return $p.ExitCode
}

$code = 1
try {
  Write-Host 'A preparar `.railway-staging-portal-api/`…' -ForegroundColor Cyan
  Remove-Item -LiteralPath $stageRoot -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $stagePortal -Force | Out-Null

  $null = & robocopy.exe $portalSrc $stagePortal /E /XD node_modules dist .git /NFL /NDL /NJH /NJS /NP /R:1 /W:1 /LOG:$robolog
  if ($LASTEXITCODE -ge 8) {
    throw "robocopy falhou (código $LASTEXITCODE). Ver: $robolog"
  }

  Write-Host "  origem: $portalSrc" -ForegroundColor DarkGray
  Write-Host "  stage:  $stageRoot" -ForegroundColor DarkGray

  Write-Host 'Teste: railway whoami…' -ForegroundColor DarkCyan
  $whoExit = Invoke-NpmRailway -WorkingDirectory $stageRoot -RailwayArguments @('whoami')
  if ($whoExit -ne 0) {
    Write-Host 'Autenticação falhou. Corra: npm exec --yes --package=@railway/cli@latest -- railway login' -ForegroundColor Red
    Write-Host 'Ou defina RAILWAY_TOKEN com um Project Token do projeto certo no painel Railway.' -ForegroundColor Red
    exit $whoExit
  }

  $railwayArgs = @('up', '--ci', '--service', $ServiceId)
  if ($env:RAILWAY_DEPLOY_VERBOSE -eq '1') { $railwayArgs += '--verbose' }

  Write-Host 'railway up --ci --service …' -ForegroundColor Cyan
  $code = Invoke-NpmRailway -WorkingDirectory $stageRoot -RailwayArguments $railwayArgs
  Write-Host "--- railway terminou com código $code ---" -ForegroundColor $(if ($code -eq 0) { 'Green' } else { 'Red' })
} finally {
  Remove-Item -LiteralPath $stageRoot -Recurse -Force -ErrorAction SilentlyContinue
}

exit $code
