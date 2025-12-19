#!/bin/bash
# Script para executar SQL no Railway via CLI
# Execute: railway login (primeiro)
# Depois: railway run --service <service-name> psql $DATABASE_URL -f fix-status-em-andament.sql

echo "🔍 Executando SQL no Railway..."
railway run psql $DATABASE_URL -f fix-status-em-andament.sql

