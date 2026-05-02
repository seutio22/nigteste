# Atalho: deploy só do portal do colaborador (portal-web → Vercel), por CLI. Sem GitHub.
#
# Pré-requisito: npx vercel login
#
# Uso (PowerShell, na raiz do repo):
#   .\scripts\trigger-portal-deploy.ps1
#   .\scripts\trigger-portal-deploy.ps1 -Clean
#   .\scripts\trigger-portal-deploy.ps1 -KillNode -Clean
#
# Nexus (demandas-web), se precisares noutro momento:  .\scripts\deploy-vercel-nexus.ps1

param(
  [switch]$Clean,
  [switch]$KillNode
)

$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "deploy-portal-web.ps1") -Clean:$Clean -KillNode:$KillNode
exit $LASTEXITCODE
