import type { Operadora } from '../types/masterData'
import type { DadosTableUploadConfig } from '../components/DadosTableUploadBar'
import { normalizeCnpj, isCnpjShape } from './cnpjAlfanumerico'
import {
  onlyDigits,
  pickCell,
  readSpreadsheetRows,
  type SpreadsheetImportResult,
} from './dadosSpreadsheet'
import type { usePlacementStore, PlacementPlano } from '../store/placementStore'
import {
  resolveDiferencialItemKey,
} from '../pages/Placement/Fila/placementDiferenciaisCatalogo'

export type PlacementDadosTabKey =
  | 'filiais'
  | 'corretores'
  | 'analistas'
  | 'prospects'
  | 'condicoes'
  | 'planos'
  | 'diferenciais'
  | 'projetos'
  | 'pedido'
  | 'temperatura'
  | 'tipoContratacao'
  | 'modalidadeContrato'
  | 'prazoVigenciaContrato'

type PlacementStoreApi = Pick<
  ReturnType<typeof usePlacementStore.getState>,
  | 'addFilial'
  | 'addCorretorParceiro'
  | 'addAnalista'
  | 'addProspect'
  | 'addCondicao'
  | 'addPlano'
  | 'upsertDiferenciaisBatch'
  | 'syncPlanos'
  | 'planos'
  | 'addProjeto'
  | 'addPedido'
  | 'addTemperatura'
  | 'addTipoContratacao'
  | 'addModalidadeContrato'
  | 'addPrazoVigenciaContrato'
>

function resolveOperadoraId(nome: string, operadoras: Operadora[]): string {
  const n = nome.trim().toLowerCase()
  if (!n) return ''
  const exact = operadoras.find((o) => o.nome.trim().toLowerCase() === n)
  return exact?.id ?? ''
}

async function importNomeRows(
  rows: Record<string, unknown>[],
  add: (input: { nome: string }) => Promise<unknown>
): Promise<SpreadsheetImportResult> {
  let imported = 0
  const errors: string[] = []
  for (let i = 0; i < rows.length; i++) {
    const nome = pickCell(rows[i], ['Nome', 'nome'])
    if (!nome) {
      errors.push(`Linha ${i + 2}: nome obrigatório.`)
      continue
    }
    try {
      await add({ nome })
      imported++
    } catch (err: unknown) {
      errors.push(`Linha ${i + 2}: ${err instanceof Error ? err.message : 'erro ao salvar'}`)
    }
  }
  return { imported, errors }
}

function resolvePlacementPlanoId(
  operadoraId: string,
  categoria: string,
  plano: string,
  planos: PlacementPlano[]
): string {
  const pl = plano.trim().toLowerCase()
  const cat = categoria.trim().toLowerCase()
  if (!pl) return ''

  if (cat) {
    const exact = planos.find(
      (p) =>
        p.operadoraId === operadoraId &&
        p.categoria.trim().toLowerCase() === cat &&
        p.plano.trim().toLowerCase() === pl
    )
    if (exact) return exact.id
  }

  const matches = planos.filter(
    (p) => p.operadoraId === operadoraId && p.plano.trim().toLowerCase() === pl
  )
  return matches.length === 1 ? matches[0].id : matches.find((p) => !cat || p.categoria.trim().toLowerCase() === cat)?.id ?? ''
}

export async function importPlacementSpreadsheet(
  tab: PlacementDadosTabKey,
  file: File,
  store: PlacementStoreApi,
  operadoras: Operadora[],
  planos: PlacementPlano[] = []
): Promise<SpreadsheetImportResult> {
  const rows = await readSpreadsheetRows(file)
  if (!rows.length) throw new Error('Nenhuma linha encontrada na planilha.')

  switch (tab) {
    case 'filiais': {
      let imported = 0
      const errors: string[] = []
      for (let i = 0; i < rows.length; i++) {
        const razaoSocial = pickCell(rows[i], ['Razão social', 'Razao social', 'razaoSocial'])
        const cnpj = normalizeCnpj(pickCell(rows[i], ['CNPJ', 'cnpj']))
        const statusRaw = pickCell(rows[i], ['Status', 'status'])
        const status = statusRaw.toLowerCase().startsWith('in') ? 'Inativo' : 'Ativo'
        if (!razaoSocial || !isCnpjShape(cnpj)) {
          errors.push(`Linha ${i + 2}: informe razão social e CNPJ (14 caracteres, numérico ou alfanumérico).`)
          continue
        }
        try {
          await store.addFilial({ razaoSocial, cnpj, status })
          imported++
        } catch (err: unknown) {
          errors.push(`Linha ${i + 2}: ${err instanceof Error ? err.message : 'erro ao salvar'}`)
        }
      }
      return { imported, errors }
    }

    case 'corretores':
      return importNomeRows(rows, store.addCorretorParceiro)

    case 'analistas': {
      let imported = 0
      const errors: string[] = []
      for (let i = 0; i < rows.length; i++) {
        const nome = pickCell(rows[i], ['Nome', 'nome'])
        const coordenadorAnalista = pickCell(rows[i], [
          'Coordenador analista',
          'Coordenador',
          'coordenadorAnalista',
        ])
        const gerenteAnalista = pickCell(rows[i], ['Gerente analista', 'Gerente', 'gerenteAnalista'])
        if (!nome || !coordenadorAnalista || !gerenteAnalista) {
          errors.push(`Linha ${i + 2}: nome, coordenador e gerente são obrigatórios.`)
          continue
        }
        try {
          await store.addAnalista({ nome, coordenadorAnalista, gerenteAnalista })
          imported++
        } catch (err: unknown) {
          errors.push(`Linha ${i + 2}: ${err instanceof Error ? err.message : 'erro ao salvar'}`)
        }
      }
      return { imported, errors }
    }

    case 'prospects': {
      let imported = 0
      const errors: string[] = []
      for (let i = 0; i < rows.length; i++) {
        const razaoSocial = pickCell(rows[i], ['Razão social', 'Razao social'])
        const cnpj = normalizeCnpj(pickCell(rows[i], ['CNPJ']))
        const grupoEconomico = pickCell(rows[i], ['Grupo econômico', 'Grupo economico']) || null
        const cnae = onlyDigits(pickCell(rows[i], ['CNAE', 'cnae']), 8)
        if (!razaoSocial || !isCnpjShape(cnpj)) {
          errors.push(`Linha ${i + 2}: razão social e CNPJ (14 caracteres, numérico ou alfanumérico) são obrigatórios.`)
          continue
        }
        try {
          await store.addProspect({ razaoSocial, cnpj, grupoEconomico, cnae })
          imported++
        } catch (err: unknown) {
          errors.push(`Linha ${i + 2}: ${err instanceof Error ? err.message : 'erro ao salvar'}`)
        }
      }
      return { imported, errors }
    }

    case 'condicoes': {
      let imported = 0
      const errors: string[] = []
      for (let i = 0; i < rows.length; i++) {
        const razaoSocial = pickCell(rows[i], ['Razão social', 'Razao social'])
        const cnpjRaw = pickCell(rows[i], ['CNPJ'])
        const cnpj = cnpjRaw ? normalizeCnpj(cnpjRaw) : null
        const grupoEconomico = pickCell(rows[i], ['Grupo econômico', 'Grupo economico']) || null
        const cnae = onlyDigits(pickCell(rows[i], ['CNAE']), 8)
        if (!razaoSocial || !cnae) {
          errors.push(`Linha ${i + 2}: razão social e CNAE são obrigatórios.`)
          continue
        }
        if (cnpj && !isCnpjShape(cnpj)) {
          errors.push(`Linha ${i + 2}: CNPJ deve ter 14 caracteres (numérico ou alfanumérico) ou ficar em branco.`)
          continue
        }
        try {
          await store.addCondicao({
            razaoSocial,
            cnpj: cnpj && isCnpjShape(cnpj) ? cnpj : null,
            grupoEconomico,
            cnae,
          })
          imported++
        } catch (err: unknown) {
          errors.push(`Linha ${i + 2}: ${err instanceof Error ? err.message : 'erro ao salvar'}`)
        }
      }
      return { imported, errors }
    }

    case 'planos': {
      let imported = 0
      const errors: string[] = []
      for (let i = 0; i < rows.length; i++) {
        const fornecedor = pickCell(rows[i], ['Fornecedor', 'Operadora', 'fornecedor'])
        const operadoraId = resolveOperadoraId(fornecedor, operadoras)
        const categoria = pickCell(rows[i], ['Categoria', 'categoria'])
        const plano = pickCell(rows[i], ['Plano', 'plano'])
        if (!operadoraId) {
          errors.push(
            `Linha ${i + 2}: fornecedor "${fornecedor || '—'}" não encontrado em Dados → NIG → Operadoras.`
          )
          continue
        }
        if (!categoria || !plano) {
          errors.push(`Linha ${i + 2}: categoria e plano são obrigatórios.`)
          continue
        }
        try {
          await store.addPlano({
            operadoraId,
            categoria,
            plano,
            reembolso: pickCell(rows[i], ['Reembolso']) || null,
            eventosReembolsaveis:
              pickCell(rows[i], ['Eventos reembolsáveis', 'Eventos reembolsaveis']) || null,
            acomodacao: pickCell(rows[i], ['Acomodação', 'Acomodacao']) || null,
            abrangencia: pickCell(rows[i], ['Abrangência', 'Abrangencia']) || null,
          })
          imported++
        } catch (err: unknown) {
          errors.push(`Linha ${i + 2}: ${err instanceof Error ? err.message : 'erro ao salvar'}`)
        }
      }
      return { imported, errors }
    }

    case 'diferenciais': {
      let imported = 0
      const errors: string[] = []
      const batchItems: Array<{
        operadoraId: string
        placementPlanoId: string
        itemKey: string
        texto: string
      }> = []

      for (let i = 0; i < rows.length; i++) {
        const fornecedor = pickCell(rows[i], ['Fornecedor', 'Operadora', 'fornecedor'])
        const operadoraId = resolveOperadoraId(fornecedor, operadoras)
        const categoria = pickCell(rows[i], ['Categoria', 'categoria'])
        const plano = pickCell(rows[i], ['Plano', 'plano'])
        const itemRaw = pickCell(rows[i], ['Item', 'Item diferencial', 'item', 'itemKey'])
        const texto = pickCell(rows[i], ['Descrição', 'Descricao', 'Texto', 'texto'])

        if (!operadoraId) {
          errors.push(
            `Linha ${i + 2}: fornecedor "${fornecedor || '—'}" não encontrado em Dados → NIG → Operadoras.`
          )
          continue
        }
        if (!plano) {
          errors.push(`Linha ${i + 2}: plano é obrigatório (cadastre antes em Dados → Planos).`)
          continue
        }

        const placementPlanoId = resolvePlacementPlanoId(operadoraId, categoria, plano, planos)
        if (!placementPlanoId) {
          errors.push(
            `Linha ${i + 2}: plano "${plano}"${categoria ? ` (${categoria})` : ''} não encontrado em Dados → Planos para ${fornecedor}.`
          )
          continue
        }

        const itemKey = resolveDiferencialItemKey(itemRaw)
        if (!itemKey) {
          errors.push(
            `Linha ${i + 2}: item "${itemRaw || '—'}" inválido. Use o rótulo (ex.: TELEMEDICINA) ou a chave (ex.: telemedicina).`
          )
          continue
        }
        if (!texto) {
          errors.push(`Linha ${i + 2}: descrição é obrigatória.`)
          continue
        }

        batchItems.push({ operadoraId, placementPlanoId, itemKey, texto })
      }

      if (batchItems.length) {
        try {
          const result = await store.upsertDiferenciaisBatch(batchItems)
          imported = result.synced
          if (result.skipped > 0) {
            errors.push(`${result.skipped} linha(s) ignorada(s) pela API (dados inválidos).`)
          }
        } catch (err: unknown) {
          errors.push(err instanceof Error ? err.message : 'Erro ao gravar diferenciais importados.')
        }
      }

      return { imported, errors }
    }

    case 'projetos':
      return importNomeRows(rows, store.addProjeto)
    case 'pedido':
      return importNomeRows(rows, store.addPedido)
    case 'temperatura':
      return importNomeRows(rows, store.addTemperatura)
    case 'tipoContratacao':
      return importNomeRows(rows, store.addTipoContratacao)
    case 'modalidadeContrato':
      return importNomeRows(rows, store.addModalidadeContrato)
    case 'prazoVigenciaContrato':
      return importNomeRows(rows, store.addPrazoVigenciaContrato)
    default:
      return { imported: 0, errors: ['Tabela sem importação configurada.'] }
  }
}

const PLACEMENT_TEMPLATE_META: Record<
  PlacementDadosTabKey,
  { label: string; filename: string; headers: readonly string[]; exampleRows: Record<string, unknown>[] }
> = {
  filiais: {
    label: 'Filiais',
    filename: 'placement-filiais-modelo.xlsx',
    headers: ['Razão social', 'CNPJ', 'Status'],
    exampleRows: [{ 'Razão social': 'Empresa Exemplo Ltda', CNPJ: '12345678000199', Status: 'Ativo' }],
  },
  corretores: {
    label: 'Corretor parceiro',
    filename: 'placement-corretores-modelo.xlsx',
    headers: ['Nome'],
    exampleRows: [{ Nome: 'Corretor Parceiro Exemplo' }],
  },
  analistas: {
    label: 'Analista',
    filename: 'placement-analistas-modelo.xlsx',
    headers: ['Nome', 'Coordenador analista', 'Gerente analista'],
    exampleRows: [
      {
        Nome: 'Analista Exemplo',
        'Coordenador analista': 'Coordenador A',
        'Gerente analista': 'Gerente B',
      },
    ],
  },
  prospects: {
    label: 'Prospect',
    filename: 'placement-prospects-modelo.xlsx',
    headers: ['Razão social', 'CNPJ', 'Grupo econômico', 'CNAE'],
    exampleRows: [
      {
        'Razão social': 'Prospect Exemplo SA',
        CNPJ: '98765432000100',
        'Grupo econômico': 'Grupo X',
        CNAE: '1234567',
      },
    ],
  },
  condicoes: {
    label: 'Condições',
    filename: 'placement-condicoes-modelo.xlsx',
    headers: ['Grupo econômico', 'Razão social', 'CNPJ', 'CNAE'],
    exampleRows: [
      {
        'Grupo econômico': 'Grupo Y',
        'Razão social': 'Cliente Exemplo Ltda',
        CNPJ: '11222333000144',
        CNAE: '7654321',
      },
    ],
  },
  planos: {
    label: 'Planos',
    filename: 'placement-planos-modelo.xlsx',
    headers: [
      'Fornecedor',
      'Categoria',
      'Plano',
      'Reembolso',
      'Eventos reembolsáveis',
      'Acomodação',
      'Abrangência',
    ],
    exampleRows: [
      {
        Fornecedor: 'Unimed',
        Categoria: 'Empresarial',
        Plano: 'Plano Ouro',
        Reembolso: 'Sim',
        'Eventos reembolsáveis': 'Consultas',
        Acomodação: 'Apartamento',
        Abrangência: 'Nacional',
      },
    ],
  },
  diferenciais: {
    label: 'Diferenciais',
    filename: 'placement-diferenciais-modelo.xlsx',
    headers: ['Fornecedor', 'Categoria', 'Plano', 'Item', 'Descrição'],
    exampleRows: [
      {
        Fornecedor: 'Amil',
        Categoria: 'Empresarial',
        Plano: 'S6500',
        Item: 'TELEMEDICINA',
        Descrição: 'Possui atendimento 24h',
      },
      {
        Fornecedor: 'Bradesco',
        Categoria: 'Premium',
        Plano: 'TN3',
        Item: 'retaguarda',
        Descrição: 'Retaguarda full back-up Einstein e Sírio-Libanês',
      },
    ],
  },
  projetos: {
    label: 'Projetos',
    filename: 'placement-projetos-modelo.xlsx',
    headers: ['Nome'],
    exampleRows: [{ Nome: 'Projeto Exemplo' }],
  },
  pedido: {
    label: 'Pedido/conta',
    filename: 'placement-pedido-modelo.xlsx',
    headers: ['Nome'],
    exampleRows: [{ Nome: 'Pedido tipo A' }],
  },
  temperatura: {
    label: 'Temperatura',
    filename: 'placement-temperatura-modelo.xlsx',
    headers: ['Nome'],
    exampleRows: [{ Nome: 'Quente' }],
  },
  tipoContratacao: {
    label: 'Tipo contratação',
    filename: 'placement-tipo-contratacao-modelo.xlsx',
    headers: ['Nome'],
    exampleRows: [{ Nome: 'Compulsório' }],
  },
  modalidadeContrato: {
    label: 'Modalidade contrato',
    filename: 'placement-modalidade-modelo.xlsx',
    headers: ['Nome'],
    exampleRows: [{ Nome: 'Pré-pagamento' }],
  },
  prazoVigenciaContrato: {
    label: 'Prazo vigência contrato',
    filename: 'placement-prazo-vigencia-modelo.xlsx',
    headers: ['Nome'],
    exampleRows: [{ Nome: '12 meses' }],
  },
}

export function getPlacementUploadConfig(
  tab: PlacementDadosTabKey,
  store: PlacementStoreApi,
  operadoras: Operadora[]
): DadosTableUploadConfig | null {
  const meta = PLACEMENT_TEMPLATE_META[tab]
  if (!meta) return null
  return {
    tableLabel: meta.label,
    filename: meta.filename,
    headers: meta.headers,
    exampleRows: meta.exampleRows,
    importFile: async (file) => {
      let planosCatalogo: PlacementPlano[] = []
      if (tab === 'diferenciais') {
        await store.syncPlanos(true)
        planosCatalogo = store.planos ?? []
      }
      return importPlacementSpreadsheet(tab, file, store, operadoras, planosCatalogo)
    },
  }
}
