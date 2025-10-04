# Teste simples do login temporário
Write-Host "🧪 TESTANDO LOGIN TEMPORÁRIO" -ForegroundColor Yellow

$API_URL = "https://nigteste-production.up.railway.app"

Write-Host "`n🔐 Testando /auth/login-temp..." -ForegroundColor Cyan

try {
    $body = @{
        email = "admin@admin.com"
        password = "qualquer123"
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
    }

    $response = Invoke-RestMethod -Uri "$API_URL/auth/login-temp" -Method POST -Body $body -Headers $headers

    Write-Host "✅ LOGIN FUNCIONOU!" -ForegroundColor Green
    Write-Host "Usuário: $($response.user.name)" -ForegroundColor White
    Write-Host "Email: $($response.user.email)" -ForegroundColor White
    Write-Host "Token: $($response.token.Substring(0, 30))..." -ForegroundColor Gray

} catch {
    Write-Host "❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
}
