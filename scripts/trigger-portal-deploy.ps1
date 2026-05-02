# Dispara deploy da API (Railway) e do portal-web (Vercel) via GitHub Actions.
# Pré-requisito: gh CLI autenticado — na pasta do repo:  gh auth login
#
# Uso (PowerShell):  .\scripts\trigger-portal-deploy.ps1

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error "Instale o GitHub CLI: https://cli.github.com/"
}

gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Execute primeiro: gh auth login" -ForegroundColor Yellow
  exit 1
}

Write-Host "A disparar workflows em branch main..." -ForegroundColor Cyan
gh workflow run portal-api-railway.yml --ref main
gh workflow run portal-web-vercel.yml --ref main

Write-Host "Feito. Acompanhe: gh run list --workflow=portal-api-railway.yml --limit 3" -ForegroundColor Green
Write-Host "              gh run list --workflow=portal-web-vercel.yml --limit 3" -ForegroundColor Green
