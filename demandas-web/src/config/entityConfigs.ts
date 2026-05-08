import type { EntityConfigs } from '../types/dadosTypes'

export const ENTITY_CONFIGS: EntityConfigs = {
  clientes: {
    endpoint: '/clientes',
    fields: ['nome', 'grupoEconomico'],
    requiredFields: ['nome'],
    displayName: 'Cliente'
  },
  contratos: {
    endpoint: '/contratos',
    fields: ['codigo', 'grupoEconomico', 'clienteId', 'status'],
    requiredFields: ['codigo'],
    displayName: 'Contrato'
  },
  operadoras: {
    endpoint: '/operadoras',
    fields: ['nome'],
    requiredFields: ['nome'],
    displayName: 'Operadora'
  },
  produtos: {
    endpoint: '/produtos',
    fields: ['nome'],
    requiredFields: ['nome'],
    displayName: 'Produto'
  },
  sistemas: {
    endpoint: '/sistemas',
    fields: ['nome'],
    requiredFields: ['nome'],
    displayName: 'Sistema'
  },
  grupos: {
    endpoint: '/grupos',
    fields: ['nome'],
    requiredFields: ['nome'],
    displayName: 'Grupo'
  },
  analistas: {
    endpoint: '/analistas',
    fields: ['nome'],
    requiredFields: ['nome'],
    displayName: 'Analista'
  },
  areas: {
    endpoint: '/areas',
    fields: ['nome'],
    requiredFields: ['nome'],
    displayName: 'Área'
  },
  tipos: {
    endpoint: '/tiposDemanda',
    fields: ['nome', 'ativo'],
    requiredFields: ['nome'],
    displayName: 'Tipo de Demanda'
  },
  'tipos-cadastro': {
    endpoint: '/tiposCadastro',
    fields: ['nome', 'descricao'],
    requiredFields: ['nome'],
    displayName: 'Tipo de Cadastro'
  },
  servicos: {
    endpoint: '/tiposServico',
    fields: ['nome', 'descricao'],
    requiredFields: ['nome'],
    displayName: 'Tipo de Serviço'
  },
  solicitantes: {
    endpoint: '/solicitantes',
    fields: ['nome'],
    requiredFields: ['nome'],
    displayName: 'Solicitante'
  },
  relatorios: {
    endpoint: '/relatorios',
    fields: ['nome'],
    requiredFields: ['nome'],
    displayName: 'Relatório'
  },
  modelos: {
    endpoint: '/modelos',
    fields: ['nome'],
    requiredFields: ['nome'],
    displayName: 'Modelo'
  },
  padrao: {
    endpoint: '/padrao',
    fields: ['nome', 'tipoServicoId', 'ativo'],
    requiredFields: ['nome'],
    displayName: 'Demanda Padrão'
  },
  configuracoes: {
    endpoint: '/dados',
    fields: ['chave', 'valor', 'tipo', 'categoria', 'descricao'],
    requiredFields: ['chave', 'valor'],
    displayName: 'Configuração'
  },
  areasMailling: {
    endpoint: '/areas-mailling',
    fields: ['nome', 'descricao', 'ativo'],
    requiredFields: ['nome'],
    displayName: 'Área de Mailling'
  },
  cargosMailling: {
    endpoint: '/cargos-mailling',
    fields: ['nome', 'descricao', 'ativo'],
    requiredFields: ['nome'],
    displayName: 'Cargo de Mailling'
  },
  filiaisMailling: {
    endpoint: '/filiais-mailling',
    fields: ['nome', 'descricao', 'ativo'],
    requiredFields: ['nome'],
    displayName: 'Filial de Mailling'
  },
  categorias: {
    endpoint: '/categorias',
    fields: ['nome'],
    requiredFields: ['nome'],
    displayName: 'Categoria'
  },
  periodicidades: {
    endpoint: '/periodicidades',
    fields: ['nome'],
    requiredFields: ['nome'],
    displayName: 'Periodicidade'
  },
  status: {
    endpoint: '/status',
    fields: ['nome'],
    requiredFields: ['nome'],
    displayName: 'Status'
  }
}
