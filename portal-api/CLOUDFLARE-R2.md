# Cloudflare R2 — vincular à API do portal

A API usa **R2** como armazenamento de anexos (API compatível com S3). Tens de criar **bucket**, **token S3** e **CORS**; depois copias as variáveis para o `.env` local e para o **Railway**.

## CLI oficial: Wrangler

A Cloudflare disponibiliza o **[Wrangler](https://developers.cloudflare.com/r2/get-started/cli/)** (já incluído em `devDependencies` em `portal-api`).

O **login tem de ser feito na tua máquina** (abre o browser para autorizar a Cloudflare). Não há como “fazer login por ti” remotamente.

| Comando | O que faz |
|--------|-----------|
| `npm run cf:login` | Abre o browser para autenticar a CLI na tua conta (`wrangler login`). |
| `npm run cf:whoami` | Confirma a conta com sessão ativa. |
| `npm run cf:r2:list` | Lista buckets R2. |
| `npm run cf:r2:create -- nome-do-bucket` | Cria um bucket (só letras minúsculas, números e hífens; 3–63 caracteres). |

Exemplo (a partir da **raiz do repositório Git**, pasta `nigteste` onde está o `.git`):

```powershell
cd nigteste\portal-api
npm run cf:login
npm run cf:r2:create -- portal-anexos
npm run cf:r2:list
```

Se o teu Cursor abre o nível **acima** (`C:\Users\Larissa\nigteste` com subpasta `nigteste\`), podes usar os mesmos comandos **na raiz desse nível** — existe um `package.json` que encaminha para `nigteste/portal-api`:

```powershell
cd C:\Users\Larissa\nigteste
npm run cf:login
npm run cf:r2:list
```

**Importante:** o Wrangler gere **buckets** e conta na Cloudflare. As credenciais **Access Key / Secret** que a API Node usa (`@aws-sdk/client-s3`) vêm de **R2 → Manage R2 API Tokens** no dashboard — a CLI não substitui esse passo para a nossa integração S3.

### Script `configure-r2-cloudflare.ps1` (bucket + CORS)

Depois de `npm run cf:login`, podes criar o bucket e aplicar CORS **só com CLI** (Wrangler):

```powershell
cd nigteste\portal-api
npm run cf:r2:setup -- -BucketName "portal-anexos"
```

Ou com mais origens (front em produção):

```powershell
.\configure-r2-cloudflare.ps1 -BucketName "portal-anexos" -Origins "http://localhost:5174","https://teu-app.vercel.app"
```

Da **raiz** do workspace (`C:\Users\Larissa\nigteste`):

```powershell
npm run cf:r2:setup -- -BucketName "portal-anexos"
```

**O que a CLI não substitui:** as chaves **S3** (`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`) para a API Node — a Cloudflare continua a pedir que cries **Manage R2 API Tokens** no dashboard (uma vez por conta ou rotação). Não há fluxo Wrangler estável que te devolva o Secret como a API da app precisa.

### Integração no portal (formulários)

Com R2 e variáveis configuradas na API, no **admin** podes adicionar campos do tipo **«Anexo (arquivo → Cloudflare R2)»** ao formulário do tipo de solicitação. O colaborador escolhe o ficheiro na **Nova solicitação**; o browser envia o ficheiro direto para o R2 e o caso guarda só a referência (`key` + nome). Na página do caso, aparece **Baixar** para obter link temporário.

## 1. Account ID

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → canto inferior esquerdo **R2 Object Storage** (ou menu **R2**).
2. No painel R2, à direita aparece **Account ID** — copia esse valor (32 caracteres hex).

## 2. Bucket

1. **R2** → **Create bucket** → nome (ex.: `portal-anexos`) → **Create bucket**.

## 3. Token de API (S3)

1. **R2** → **Overview** → **Manage R2 API Tokens** (ou **Account API Tokens**).
2. **Create API token** com permissão **Object Read & Write** no bucket que criaste (ou em toda a conta R2, conforme preferires).
3. Guarda **Access Key ID** e **Secret Access Key** (a secret só aparece uma vez).

## 4. CORS no bucket (obrigatório para upload no browser)

1. Abre o **bucket** → separador **Settings** → secção **CORS policy**.
2. Adiciona uma regra, por exemplo:

- **Allowed origins:** `http://localhost:5174` e a URL do teu front em produção (ex.: `https://teu-app.vercel.app`), uma por linha ou separadas conforme o editor.
- **Allowed methods:** `GET`, `PUT`, `HEAD`.
- **Allowed headers:** `*` (ou pelo menos `Content-Type`, `Authorization` se precisares).

Guarda / aplica.

## 5. Variáveis no projeto (local)

Na pasta `portal-api`, copia `.env.example` para `.env` (se ainda não existir) e define:

| Variável | Onde obter |
|----------|------------|
| `R2_ACCOUNT_ID` | Painel R2 (Account ID) |
| `R2_ACCESS_KEY_ID` | Token S3 |
| `R2_SECRET_ACCESS_KEY` | Token S3 |
| `R2_BUCKET_NAME` | Nome exato do bucket |
| `R2_MAX_FILE_MB` | Opcional (ex.: `25`) |

Ou corre o assistente:

```powershell
cd portal-api
.\configure-cloudflare-r2.ps1
```

## 6. Variáveis no Railway (produção)

No serviço **portal-colaborador-api** → **Variables**, adiciona as **mesmas** chaves e valores (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, opcionalmente `R2_MAX_FILE_MB`).

**Só as chaves secretas (CLI):** com Railway CLI logado, a partir de `portal-api`:

```powershell
.\configure-r2-railway.ps1 -AccessKeyId "SEU_ACCESS_KEY" -SecretAccessKey "SEU_SECRET"
```

**Tudo (interativo, .env + opcional Railway):**

```powershell
.\configure-cloudflare-r2.ps1 -Railway
```

(`R2_ACCOUNT_ID` e `R2_BUCKET_NAME` podem já estar no serviço; falta sobretudo `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY` vindas de **Manage R2 API Tokens**.)

## 7. Testar

Com a API a correr e utilizador autenticado:

`POST /uploads/presign` com JSON `{ "fileName": "teste.pdf", "contentType": "application/pdf" }` → deve devolver `uploadUrl` e `key`.

Não commits o ficheiro `.env` (já está no `.gitignore`).
