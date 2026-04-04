# Deploy da API do portal (Railway: amusing-flexibility / portal-colaborador-api).
#
# O CLI no Windows muitas vezes falha com "prefix not found" em `railway up .` (mesmo em pastas pequenas).
# O que funciona: railway up ./portal-api --path-as-root a partir da raiz do monorepo.
#
# Alinhe o painel Railway com isso:
#   Root Directory = portal-api   (SEM "/" no início — nunca "/portal-api")
#   Dockerfile = default (portal-api/Dockerfile)
#
# Se quiser Root Directory VAZIO + Dockerfile.portal-colaborador-api na raiz do Git:
#   use deploy automático pelo repositório (push na main), não dependa do `up .` neste PC.
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$repoRoot = Resolve-Path (Join-Path $here '..')
Set-Location $repoRoot

$ProjectId = 'af05d835-bea3-4b3a-a2b0-dcecec4e1121'
$EnvironmentId = 'd866c183-f35b-4294-aa56-51bf91b57bd3'
$ServiceId = 'bb0654bb-1aaa-44ae-a139-f5213b85bd97'

$env:RAILWAY_PROJECT_ID = $ProjectId
$env:RAILWAY_ENVIRONMENT_ID = $EnvironmentId
$env:RAILWAY_SERVICE_ID = $ServiceId

Write-Host "Railway: up ./portal-api --path-as-root (ajuste o painel: Root Directory = portal-api)" -ForegroundColor Cyan
Write-Host "  repo: $repoRoot" -ForegroundColor DarkGray

npx --yes '@railway/cli@latest' up ./portal-api --path-as-root `
  -p $ProjectId `
  -e $EnvironmentId `
  -s $ServiceId `
  @args
