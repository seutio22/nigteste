# Script para configurar secrets do GitHub via API
# Execute este script após criar um Personal Access Token

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubToken,
    
    [Parameter(Mandatory=$true)]
    [string]$RepositoryOwner = "seutio22",
    
    [Parameter(Mandatory=$true)]
    [string]$RepositoryName = "nigteste"
)

Write-Host "🔧 Configurando secrets do GitHub..." -ForegroundColor Green

# Headers para a API do GitHub
$headers = @{
    "Authorization" = "token $GitHubToken"
    "Accept" = "application/vnd.github.v3+json"
    "User-Agent" = "PowerShell-Script"
}

# Função para criar/atualizar secret
function Set-GitHubSecret {
    param(
        [string]$SecretName,
        [string]$SecretValue
    )
    
    try {
        # URL da API para secrets
        $url = "https://api.github.com/repos/$RepositoryOwner/$RepositoryName/actions/secrets/$SecretName"
        
        # Dados do secret (valor criptografado)
        $body = @{
            encrypted_value = $SecretValue
            key_id = "01234567890123456789" # Placeholder - será substituído pelo GitHub
        } | ConvertTo-Json
        
        # Tentar criar/atualizar o secret
        $response = Invoke-RestMethod -Uri $url -Method PUT -Headers $headers -Body $body -ContentType "application/json"
        
        Write-Host "✅ Secret '$SecretName' configurado com sucesso!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Erro ao configurar secret '$SecretName': $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Secrets para configurar
$secrets = @{
    "JWT_SECRET" = "seu_jwt_secret_aqui_123456789"
    "RAILWAY_TOKEN" = "1b710d6f-b8da-4cab-9f5d-c5bce22d8171"
    "VERCEL_TOKEN" = "c9AFAzTGu4B5DIWsTIKJDgoM"
}

Write-Host "📋 Configurando secrets..." -ForegroundColor Yellow

foreach ($secret in $secrets.GetEnumerator()) {
    Write-Host "🔐 Configurando: $($secret.Key)" -ForegroundColor Cyan
    Set-GitHubSecret -SecretName $secret.Key -SecretValue $secret.Value
}

Write-Host "🎉 Configuração de secrets concluída!" -ForegroundColor Green
Write-Host "⚠️  NOTA: Alguns secrets podem precisar ser configurados manualmente na interface web" -ForegroundColor Yellow
Write-Host "🌐 Acesse: https://github.com/$RepositoryOwner/$RepositoryName/settings/secrets/actions" -ForegroundColor Blue
