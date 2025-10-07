import type { SmartImporterConfig } from '../types/smartImporter'

export const smartImporterConfigs: { [key: string]: SmartImporterConfig } = {
  clientes: {
    entityType: 'Clientes',
    requiredFields: ['nome'],
    optionalFields: ['grupoEconomico'],
    duplicateCheckFields: ['nome'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      },
      {
        field: 'grupoEconomico',
        type: 'custom',
        message: 'Grupo econômico deve ser informado',
        validator: (value) => !value || value.trim().length > 0
      }
    ],
    referenceFields: []
  },

  contratos: {
    entityType: 'Contratos',
    requiredFields: ['codigo', 'grupoEconomico', 'status'],
    optionalFields: [],
    duplicateCheckFields: ['codigo'],
    validationRules: [
      {
        field: 'codigo',
        type: 'required',
        message: 'Código é obrigatório'
      },
      {
        field: 'grupoEconomico',
        type: 'required',
        message: 'Grupo econômico é obrigatório'
      },
      {
        field: 'status',
        type: 'status',
        message: 'Status deve ser Ativo ou Inativo'
      }
    ],
    referenceFields: []
  },

  operadoras: {
    entityType: 'Operadoras',
    requiredFields: ['nome'],
    optionalFields: [],
    duplicateCheckFields: ['nome'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      }
    ],
    referenceFields: []
  },

  produtos: {
    entityType: 'Produtos',
    requiredFields: ['nome'],
    optionalFields: [],
    duplicateCheckFields: ['nome'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      }
    ],
    referenceFields: []
  },

  sistemas: {
    entityType: 'Sistemas',
    requiredFields: ['nome'],
    optionalFields: [],
    duplicateCheckFields: ['nome'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      }
    ],
    referenceFields: []
  },

  analistas: {
    entityType: 'Analistas',
    requiredFields: ['nome', 'email'],
    optionalFields: [],
    duplicateCheckFields: ['email'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      },
      {
        field: 'email',
        type: 'email',
        message: 'Email deve ter formato válido'
      }
    ],
    referenceFields: []
  },

  areas: {
    entityType: 'Áreas',
    requiredFields: ['nome'],
    optionalFields: [],
    duplicateCheckFields: ['nome'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      }
    ],
    referenceFields: []
  },

  tipos: {
    entityType: 'Tipos de Demanda',
    requiredFields: ['nome'],
    optionalFields: ['descricao', 'ativo'],
    duplicateCheckFields: ['nome'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      },
      {
        field: 'ativo',
        type: 'custom',
        message: 'Ativo deve ser true ou false',
        validator: (value) => !value || value === true || value === false || value === 'true' || value === 'false'
      }
    ],
    referenceFields: []
  },

  'tipos-cadastro': {
    entityType: 'Tipos de Cadastro',
    requiredFields: ['nome'],
    optionalFields: ['descricao', 'ativo'],
    duplicateCheckFields: ['nome'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      },
      {
        field: 'ativo',
        type: 'custom',
        message: 'Ativo deve ser true ou false',
        validator: (value) => !value || value === true || value === false || value === 'true' || value === 'false'
      }
    ],
    referenceFields: []
  },

  servicos: {
    entityType: 'Serviços',
    requiredFields: ['nome'],
    optionalFields: ['descricao', 'ativo'],
    duplicateCheckFields: ['nome'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      },
      {
        field: 'ativo',
        type: 'custom',
        message: 'Ativo deve ser true ou false',
        validator: (value) => !value || value === true || value === false || value === 'true' || value === 'false'
      }
    ],
    referenceFields: []
  },

  padrao: {
    entityType: 'Padrão',
    requiredFields: ['nome'],
    optionalFields: ['descricao', 'ativo'],
    duplicateCheckFields: ['nome'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      },
      {
        field: 'ativo',
        type: 'custom',
        message: 'Ativo deve ser true ou false',
        validator: (value) => !value || value === true || value === false || value === 'true' || value === 'false'
      }
    ],
    referenceFields: []
  },

  solicitantes: {
    entityType: 'Solicitantes',
    requiredFields: ['nome'],
    optionalFields: [],
    duplicateCheckFields: ['nome'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      }
    ],
    referenceFields: []
  },

  relatorios: {
    entityType: 'Relatórios',
    requiredFields: ['nome'],
    optionalFields: ['descricao'],
    duplicateCheckFields: ['nome'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      }
    ],
    referenceFields: []
  },

  modelos: {
    entityType: 'Modelos',
    requiredFields: ['nome'],
    optionalFields: ['descricao'],
    duplicateCheckFields: ['nome'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      }
    ],
    referenceFields: []
  },

  areasMailling: {
    entityType: 'Áreas Mailling',
    requiredFields: ['nome'],
    optionalFields: ['descricao', 'ativo'],
    duplicateCheckFields: ['nome'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      },
      {
        field: 'ativo',
        type: 'custom',
        message: 'Ativo deve ser true ou false',
        validator: (value) => !value || value === true || value === false || value === 'true' || value === 'false'
      }
    ],
    referenceFields: []
  },

  cargosMailling: {
    entityType: 'Cargos Mailling',
    requiredFields: ['nome'],
    optionalFields: ['descricao', 'ativo'],
    duplicateCheckFields: ['nome'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      },
      {
        field: 'ativo',
        type: 'custom',
        message: 'Ativo deve ser true ou false',
        validator: (value) => !value || value === true || value === false || value === 'true' || value === 'false'
      }
    ],
    referenceFields: []
  },

  filiaisMailling: {
    entityType: 'Filiais Mailling',
    requiredFields: ['nome'],
    optionalFields: ['descricao', 'ativo'],
    duplicateCheckFields: ['nome'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      },
      {
        field: 'ativo',
        type: 'custom',
        message: 'Ativo deve ser true ou false',
        validator: (value) => !value || value === true || value === false || value === 'true' || value === 'false'
      }
    ],
    referenceFields: []
  },

  mailling: {
    entityType: 'Mailling',
    requiredFields: ['nome', 'email'],
    optionalFields: [
      'cargo', 'area', 'filial', 'superior', 'posicaoEmail',
      'informativos', 'cancelamento', 'alteracaoContratual',
      'alteracaoDadosCliente', 'alteracaoServicos', 'aniversarioClientes',
      'alteracaoRemuneracao', 'dexpara', 'curadoriaPortalRh',
      'documentacaoContratual'
    ],
    duplicateCheckFields: ['email'],
    validationRules: [
      {
        field: 'nome',
        type: 'required',
        message: 'Nome é obrigatório'
      },
      {
        field: 'email',
        type: 'email',
        message: 'Email deve ter formato válido'
      },
      {
        field: 'posicaoEmail',
        type: 'custom',
        message: 'Posição de email deve ser PARA, CÓPIA ou CÓPIA OCULTA',
        validator: (value) => !value || ['PARA', 'CÓPIA', 'CÓPIA OCULTA'].includes(value)
      }
    ],
    referenceFields: [
      {
        field: 'cargo',
        referenceType: 'cargosMailling',
        referenceStore: 'cargosMailling',
        displayField: 'nome',
        valueField: 'id'
      },
      {
        field: 'area',
        referenceType: 'areasMailling',
        referenceStore: 'areasMailling',
        displayField: 'nome',
        valueField: 'id'
      },
      {
        field: 'filial',
        referenceType: 'filiaisMailling',
        referenceStore: 'filiaisMailling',
        displayField: 'nome',
        valueField: 'id'
      }
    ]
  },

  demandas: {
    entityType: 'Demandas',
    requiredFields: ['status', 'tipoServico', 'tipo'],
    optionalFields: [
      'descricao', 'analista', 'dataInicio', 'dataFinal', 'ticket', 'solicitante', 
      'area', 'cliente', 'contrato', 'operadora', 'produto', 'sistema',
      'analiseQuantitativa', 'qtdRetornos', 'qualidade', 'qtdClientesVinculados', 
      'usuariosEmpresa', 'observacoes'
    ],
    duplicateCheckFields: ['ticket', 'tipoServico', 'tipo', 'dataInicio', 'sistema'],
    validationRules: [
      {
        field: 'status',
        type: 'required',
        message: 'Status é obrigatório'
      },
      {
        field: 'tipoServico',
        type: 'required',
        message: 'Tipo de serviço é obrigatório'
      },
      {
        field: 'tipo',
        type: 'required',
        message: 'Tipo de demanda é obrigatório'
      },
      {
        field: 'qualidade',
        type: 'custom',
        message: 'Qualidade deve ser: 0, 1, 2 ou 3',
        validator: (value) => !value || ['0', '1', '2', '3'].includes(String(value))
      },
      {
        field: 'analiseQuantitativa',
        type: 'number',
        message: 'Análise quantitativa deve ser um número positivo',
        options: { min: 0 }
      },
      {
        field: 'qtdRetornos',
        type: 'number',
        message: 'Quantidade de retornos deve ser um número positivo',
        options: { min: 0 }
      },
      {
        field: 'qtdClientesVinculados',
        type: 'number',
        message: 'Quantidade de clientes vinculados deve ser um número positivo',
        options: { min: 0 }
      },
      {
        field: 'usuariosEmpresa',
        type: 'number',
        message: 'Usuários da empresa deve ser um número positivo',
        options: { min: 0 }
      },
      {
        field: 'dataInicio',
        type: 'date',
        message: 'Data de início deve ser uma data válida'
      },
      {
        field: 'dataFinal',
        type: 'date',
        message: 'Data de finalização deve ser uma data válida'
      }
    ],
    referenceFields: [
      {
        field: 'tipoServico',
        referenceType: 'tiposServico',
        referenceStore: 'tiposServico',
        displayField: 'nome',
        valueField: 'id'
      },
      {
        field: 'tipo',
        referenceType: 'tiposDemanda',
        referenceStore: 'tiposDemanda',
        displayField: 'nome',
        valueField: 'id'
      },
      {
        field: 'analista',
        referenceType: 'analistas',
        referenceStore: 'analistas',
        displayField: 'nome',
        valueField: 'id'
      },
      {
        field: 'area',
        referenceType: 'areas',
        referenceStore: 'areas',
        displayField: 'nome',
        valueField: 'id'
      },
      {
        field: 'cliente',
        referenceType: 'clientes',
        referenceStore: 'clientes',
        displayField: 'nome',
        valueField: 'id'
      },
      {
        field: 'contrato',
        referenceType: 'contratos',
        referenceStore: 'contratos',
        displayField: 'codigo',
        valueField: 'id'
      },
      {
        field: 'operadora',
        referenceType: 'operadoras',
        referenceStore: 'operadoras',
        displayField: 'nome',
        valueField: 'id'
      },
      {
        field: 'produto',
        referenceType: 'produtos',
        referenceStore: 'produtos',
        displayField: 'nome',
        valueField: 'id'
      },
      {
        field: 'sistema',
        referenceType: 'sistemas',
        referenceStore: 'sistemas',
        displayField: 'nome',
        valueField: 'id'
      },
      {
        field: 'solicitante',
        referenceType: 'solicitantes',
        referenceStore: 'solicitantes',
        displayField: 'nome',
        valueField: 'id'
      }
    ]
  }
}
