# 🔧 Railway travando em "Inicialização"

## Problema
O deploy fica preso na primeira etapa ("Initialization" / "Taking a snapshot of the code").

## Causas comuns

1. **Clone do GitHub lento** – Se o Railway está conectado ao GitHub, ele clona o repositório. Repos grandes ou problemas de rede podem travar.
2. **Root Directory incorreto** – Em monorepos, o Railway precisa saber onde está o backend.
3. **Deploys duplicados** – GitHub webhook + GitHub Actions podem disparar dois deploys ao mesmo tempo.

## Soluções aplicadas no código

- O workflow agora usa `railway up` para **enviar o código já buildado** diretamente, em vez de depender do clone do GitHub.
- Isso reduz a fase de inicialização e evita travamentos.

## O que verificar no Dashboard do Railway

1. **Acesse:** https://railway.app → seu projeto → serviço `demandas-api`

2. **Settings → Source:**
   - Se o Railway está conectado ao GitHub, verifique **Root Directory**
   - Deve estar: `demandas-api` (ou vazio se usar apenas deploy via CLI)

3. **Desconectar GitHub (opcional):**
   - Se os deploys forem feitos só pelo GitHub Actions, você pode desconectar a fonte GitHub do serviço
   - Assim evita deploys duplicados e o travamento na inicialização

4. **Settings → Build:**
   - Builder: Nixpacks
   - Build Command: `npm install && npx prisma generate && npm run build` (ou deixe vazio para usar railway.json)

5. **Settings → Deploy:**
   - Start Command: `node dist/server.js`

## Se ainda travar

1. **Tente novamente** – Às vezes é problema temporário da infraestrutura.
2. **Status do Railway:** https://status.railway.com
3. **Deploy manual:** No dashboard, clique em "Redeploy" para forçar um novo deploy.
