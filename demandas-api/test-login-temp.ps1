# Script PowerShell para testar login temporário
Write-Host "🧪 TESTANDO LOGIN TEMPORÁRIO" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow

$API_URL = "https://nigteste-production.up.railway.app"

Write-Host "`n🔐 1. TESTANDO /auth/login-temp" -ForegroundColor Cyan
Write-Host "--------------------------------" -ForegroundColor Cyan

try {
    $body = @{
        email = "admin@admin.com"
        password = "qualquer123"
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
    }

    Write-Host "📤 Enviando requisição..." -ForegroundColor Green
    
    $response = Invoke-RestMethod -Uri "$API_URL/auth/login-temp" -Method POST -Body $body -Headers $headers

    Write-Host "✅ LOGIN TEMPORÁRIO FUNCIONOU!" -ForegroundColor Green
    Write-Host "📋 Resposta:" -ForegroundColor White
    Write-Host "   - Mensagem: $($response.message)" -ForegroundColor White
    Write-Host "   - Token gerado: $(if($response.token) {'Sim'} else {'Não'})" -ForegroundColor White
    Write-Host "   - Usuário: $($response.user.name)" -ForegroundColor White
    Write-Host "   - Email: $($response.user.email)" -ForegroundColor White
    Write-Host "   - Role: $($response.user.role)" -ForegroundColor White
    Write-Host "   - Permissões: $(if($response.user.permissions) {'Sim'} else {'Não'})" -ForegroundColor White
    
    if ($response.token) {
        Write-Host "`n🎯 TOKEN JWT:" -ForegroundColor Yellow
        Write-Host $response.token.Substring(0, [Math]::Min(50, $response.token.Length)) -ForegroundColor Gray
    }
    
    Write-Host "`n🎉 TUDO FUNCIONANDO!" -ForegroundColor Green
    Write-Host "🚀 Você pode usar o login temporário agora!" -ForegroundColor Green

} catch {
    Write-Host "❌ ERRO NO LOGIN TEMPORÁRIO!" -ForegroundColor Red
    Write-Host "📋 Erro: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "📊 Status Code: $statusCode" -ForegroundColor Red
    }
}

Write-Host "`n🔍 2. TESTANDO HEALTHCHECK" -ForegroundColor Cyan
Write-Host "---------------------------" -ForegroundColor Cyan

try {
    $healthResponse = Invoke-RestMethod -Uri "$API_URL/health" -Method GET
    Write-Host "✅ Healthcheck OK: $($healthResponse | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "❌ Healthcheck falhou: $($_.Exception.Message)" -ForegroundColor Red
}
