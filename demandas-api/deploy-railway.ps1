# Não use `railway up` só desta pasta — com Root Directory = demandas-api no painel o build falha
# (Docker não encontra package.json). Use o script na raiz do monorepo:
#   ..\deploy-railway-direto.ps1
& (Join-Path (Split-Path $PSScriptRoot -Parent) "deploy-railway-direto.ps1")
