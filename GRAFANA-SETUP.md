# 📊 Grafana Dashboard - Sistema de Demandas

## 🚀 Configuração Rápida

### 1. Pré-requisitos
- Docker Desktop instalado
- PostgreSQL rodando na porta 5432

### 2. Iniciar o Grafana
```powershell
# Executar o script de inicialização
.\start-grafana.ps1
```

### 3. Acessar o Dashboard
- **URL**: http://localhost:3001
- **Login**: admin
- **Senha**: admin123

## 📈 Dashboards Incluídos

### Dashboard Principal - "Dashboard Demandas"
- **Gráfico de Linha**: Demandas por dia (últimos 30 dias)
- **Gráfico de Pizza**: Distribuição por status
- **Métricas**: 
  - Total de Demandas
  - Validações Pendentes
  - Reajustes Ativos
  - Contatos Mailling

## 🔧 Configuração da Fonte de Dados

O Grafana está configurado para conectar automaticamente com seu PostgreSQL:
- **Host**: host.docker.internal:5432
- **Database**: demandas
- **User**: postgres
- **Password**: postgres

## 📊 Funcionalidades Disponíveis

### 1. Visualizações Dinâmicas
- Gráficos de linha, barras, pizza
- Tabelas interativas
- Métricas em tempo real
- Filtros dinâmicos

### 2. Alertas
- Configuração de alertas por email
- Notificações em tempo real
- Thresholds personalizáveis

### 3. Dashboards Personalizados
- Criação de novos dashboards
- Drag-and-drop de componentes
- Templates reutilizáveis

## 🛠️ Comandos Úteis

### Iniciar Grafana
```powershell
.\start-grafana.ps1
```

### Parar Grafana
```powershell
.\stop-grafana.ps1
```

### Ver logs
```powershell
docker logs grafana-dashboard
```

### Reiniciar
```powershell
.\stop-grafana.ps1
.\start-grafana.ps1
```

## 📋 Próximos Passos

1. **Acesse**: http://localhost:3001
2. **Faça login** com admin/admin123
3. **Explore** o dashboard pré-configurado
4. **Crie** novos dashboards personalizados
5. **Configure** alertas conforme necessário

## 🔗 Integração com Sistema Existente

O Grafana está configurado para ler diretamente do seu banco PostgreSQL, então:
- ✅ Dados sempre atualizados
- ✅ Sem necessidade de sincronização
- ✅ Performance otimizada
- ✅ Queries SQL personalizadas

## 📚 Recursos Adicionais

- **Documentação**: https://grafana.com/docs/
- **Plugins**: https://grafana.com/grafana/plugins/
- **Comunidade**: https://community.grafana.com/

## 🆘 Troubleshooting

### Grafana não inicia
```powershell
# Verificar se Docker está rodando
docker --version

# Ver logs
docker logs grafana-dashboard
```

### Erro de conexão com PostgreSQL
- Verificar se PostgreSQL está rodando na porta 5432
- Verificar credenciais no arquivo `grafana/provisioning/datasources/postgres.yml`

### Dashboard não aparece
- Aguardar alguns segundos para carregar
- Verificar se a fonte de dados está configurada corretamente
