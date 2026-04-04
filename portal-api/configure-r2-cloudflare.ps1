# Configura R2 via Wrangler (bucket + CORS) após `npm run cf:login`.
# As chaves S3 (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) ainda são criadas no dashboard:
#   R2 → Manage R2 API Tokens → Create Account API token (Object Read & Write).
#
# Uso (na pasta portal-api):
#   .\configure-r2-cloudflare.ps1 -BucketName "portal-anexos"
#   .\configure-r2-cloudflare.ps1 -BucketName "portal-anexos" -Origins "http://localhost:5174","https://teu-front.vercel.app"
#
param(
  [Parameter(Mandatory = $true)]
  [string] $BucketName,
  [string[]] $Origins = @('http://localhost:5174')
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$wrangler = "npx"
$wranglerArgs = @("--yes", "wrangler")

function Invoke-Wrangler {
  param([string[]] $Args)
  & $wrangler $wranglerArgs @Args
  if ($LASTEXITCODE -ne 0) { throw "wrangler falhou: wrangler $($Args -join ' ')" }
}

Write-Host "R2: criar bucket '$BucketName' (ignora se já existir)…" -ForegroundColor Cyan
$createOut = & $wrangler $wranglerArgs @("r2", "bucket", "create", $BucketName) 2>&1
$createOut | Out-Host
if ($LASTEXITCODE -ne 0) {
  $msg = $createOut | Out-String
  if ($msg -match 'already exists|já existe|10006') {
    Write-Host "Bucket já existe — a continuar." -ForegroundColor Yellow
  } else {
    throw "Não foi possível criar o bucket. Corre npm run cf:login e tenta de novo."
  }
}

$corsObj = @{
  rules = @(
    @{
      allowed = @{
        origins        = @($Origins)
        methods        = @('GET', 'PUT', 'HEAD')
        headers        = @('*')
      }
    }
  )
}
$corsJson = $corsObj | ConvertTo-Json -Depth 6 -Compress:$false
$corsPath = Join-Path $env:TEMP "r2-cors-$BucketName.json"
[System.IO.File]::WriteAllText($corsPath, $corsJson, [System.Text.UTF8Encoding]::new($false))

Write-Host "R2: aplicar CORS ($corsPath)…" -ForegroundColor Cyan
Write-Host $corsJson -ForegroundColor Gray
Invoke-Wrangler @("r2", "bucket", "cors", "set", $BucketName, "--file", $corsPath)

Write-Host "R2: listar CORS do bucket…" -ForegroundColor Cyan
& $wrangler $wranglerArgs @("r2", "bucket", "cors", "list", $BucketName) 2>&1 | Out-Host

$accountHint = ""
try {
  $who = & $wrangler $wranglerArgs @("whoami") 2>&1 | Out-String
  if ($who -match '([a-f0-9]{32})') { $accountHint = $Matches[1] }
} catch { }

Write-Host ""
Write-Host "Próximo passo (obrigatório para a API Node):" -ForegroundColor Green
Write-Host "  1) Dashboard → R2 → Manage R2 API Tokens → Create (Object Read & Write no bucket ou conta)."
Write-Host "  2) Copia Access Key ID e Secret para o Railway e para portal-api\.env:"
Write-Host "     R2_ACCOUNT_ID=<Account ID no painel R2>"
if ($accountHint) {
  Write-Host "       (wrangler whoami sugeriu: $accountHint — confirma no dashboard)" -ForegroundColor DarkGray
}
Write-Host "     R2_ACCESS_KEY_ID=..."
Write-Host "     R2_SECRET_ACCESS_KEY=..."
Write-Host "     R2_BUCKET_NAME=$BucketName"
Write-Host ""
Write-Host "OK — bucket e CORS aplicados via CLI." -ForegroundColor Green
