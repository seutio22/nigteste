# Configurar Nexus no Railway (API do portal)

A API do portal precisa de **dois valores** para sincronizar os mesmos dados da página **Dados** do Nexus.

## O que você precisa preencher

| Variável | O que é | Exemplo / onde pegar |
|----------|---------|----------------------|
| **NEXUS_API_BASE_URL** | URL pública da **API demandas** (Nexus), a que o front Nexus chama | `https://nigteste-production.up.railway.app` — **sem** barra `/` no final. No Railway: projeto da API demandas → **Settings** → copie o domínio público ou use a URL que já funciona no browser para `/health`. |
| **NEXUS_API_TOKEN** | **JWT** (token Bearer) de um **usuário Nexus** que consiga fazer GET em `/clientes`, `/areas`, etc. | Faça login no Nexus (web), abra DevTools → **Application** / **Armazenamento** → **Local Storage** e copie o token de auth, **ou** use o token retornado pelo `POST /auth/login` da API demandas (mesmo `JWT_SECRET` do Nexus). O token **expira**; quando parar a sync, gere outro. |

Opcionais (já têm padrão no código):

| Variável | Uso |
|----------|-----|
| `NEXUS_SYNC_INTERVAL_MINUTES` | Minutos entre syncs automáticas (padrão **15**). `0` desliga só o agendador. |
| `NEXUS_SYNC_ON_STARTUP` | `true` = uma sync 15 s após subir o serviço. |

---

## Comando (PowerShell) — recomendado

1. Instale/login no CLI (uma vez):

   ```powershell
   npx @railway/cli login
   ```

2. Entre na pasta **`nigteste\portal-api`** (no Windows o clone costuma ser `...\nigteste\nigteste\portal-api` — **não** `...\nigteste\portal-api` na raiz errada):

   ```powershell
   cd nigteste\portal-api
   ```

   Se já estiver dentro de `...\nigteste\nigteste`:

   ```powershell
   cd portal-api
   ```

   Depois rode:

   ```powershell
   .\configure-nexus-railway.ps1 `
     -BaseUrl "COLE_AQUI_A_URL_DA_API_DEMANDAS_SEM_BARRA_FINAL" `
     -Token "COLE_AQUI_O_JWT_COMPLETO"
   ```

Substitua só as duas strings entre aspas.

---

## Comando manual (Railway CLI, sem script)

Com `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID` e `RAILWAY_SERVICE_ID` iguais ao `deploy-railway.ps1` (ou após `railway link` na pasta `portal-api`):

```powershell
$env:RAILWAY_PROJECT_ID = "af05d835-bea3-4b3a-a2b0-dcecec4e1121"
$env:RAILWAY_ENVIRONMENT_ID = "d866c183-f35b-4294-aa56-51bf91b57bd3"
$env:RAILWAY_SERVICE_ID = "bb0654bb-1aaa-44ae-a139-f5213b85bd97"
cd portal-api

npx @railway/cli variable set "NEXUS_API_BASE_URL=https://SUA-API-DEMANDAS.up.railway.app" -s $env:RAILWAY_SERVICE_ID
```

Para o token (evita quebrar caracteres no PowerShell):

```powershell
"SEU_JWT_AQUI" | npx @railway/cli variable set NEXUS_API_TOKEN --stdin -s $env:RAILWAY_SERVICE_ID
```

---

## Pelo painel Railway (sem CLI)

1. Abra o projeto **amusing-flexibility** (ou o que hospeda **portal-colaborador-api**).
2. Serviço **portal-colaborador-api** → **Variables**.
3. Adicione:
   - `NEXUS_API_BASE_URL` = URL da API demandas (sem `/` no fim)
   - `NEXUS_API_TOKEN` = JWT completo
4. **Save** — o Railway redeploya o serviço.

---

## Conferir

No admin do portal → **Banco de dados Nexus** → **Sincronizar agora**. A tabela deve mostrar entidades com `rowCount` > 0 se a URL e o token estiverem corretos.
