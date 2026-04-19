import type { ConditionRule, FormSchemaDoc, FormFieldDef } from './formSchema'

/**
 * Injeções via desenvolvimento (auto-injected) por tipo.
 * Mantém o schema do admin, mas pode adicionar blocos/campos extras quando habilitado.
 */
export function injectFormBlocks(typeSlug: string | undefined, base: FormSchemaDoc): FormSchemaDoc {
  if (!base.enableInjectedBlocks) return base
  const slug = (typeSlug ?? '').trim()
  const fields = Array.isArray(base.fields) ? base.fields : []

  // Reordenação: anexo(s) sempre no final.
  const fileFields = fields.filter((f) => f?.type === 'file')
  const nonFileFields = fields.filter((f) => f?.type !== 'file')

  // Exemplo inicial: adiciona uma seção de instruções por tipo (customizável em código).
  let injected: FormFieldDef[] = []
  if (slug === 'criar-usuario' || slug === 'criar-usuarios') {
    injected = [
      {
        key: `inj_sec_${slug}`,
        type: 'section',
        label: 'Orientações',
        description: 'Preencha os dados de cada usuário. Se precisar adicionar mais, use “Adicionar linha” no grupo.',
      },
    ]
  } else {
    injected = [
      {
        key: `inj_sec_${slug || 'default'}`,
        type: 'section',
        label: 'Dica',
        description: 'Campos podem aparecer/ocultar conforme suas respostas.',
      },
    ]
  }

  const isCadastroUsuarioEdge =
    slug.includes('cadastro') && slug.includes('usuario') && slug.includes('edge')

  // Injeção do fluxo “Acesso para outra pessoa?” antes do anexo.
  const injectedQuestions: FormFieldDef[] = isCadastroUsuarioEdge
    ? [
        {
          key: 'acesso_para_outro',
          type: 'select',
          label: 'Requisitar acesso para outra pessoa?',
          required: true,
          selectListSource: 'manual',
          options: ['Sim', 'Não'],
        },
        {
          key: 'quantos_usuarios',
          type: 'number',
          label: 'Quantos usuários?',
          required: false,
          placeholder: 'Ex.: 3',
        },
      ]
    : []

  // Regras padrão (se ainda não existirem): mostrar/ocultar “quantos_usuarios”.
  const existingRules = Array.isArray(base.rules) ? (base.rules as ConditionRule[]) : []
  const hasInjectedRules = existingRules.some((r) => r?.id === 'inj_rule_show_quant')
  const injectedRules: ConditionRule[] =
    isCadastroUsuarioEdge && !hasInjectedRules
      ? [
          ...existingRules,
          {
            id: 'inj_rule_show_quant',
            when: { whenKey: 'acesso_para_outro', op: 'eq', value: 'Sim' },
            actions: [
              { targetKey: 'quantos_usuarios', setVisible: true, setRequired: true },
            ],
          },
          {
            id: 'inj_rule_hide_quant',
            when: { whenKey: 'acesso_para_outro', op: 'neq', value: 'Sim' },
            actions: [
              { targetKey: 'quantos_usuarios', setVisible: false, setRequired: false },
            ],
          },
        ]
      : existingRules

  // Se existir um grupo `grupo_1`, configura auto-criação de linhas via `quantos_usuarios`.
  const patchedNonFile = isCadastroUsuarioEdge
    ? nonFileFields.map((f) => {
        if ((f.repeatGroupKey ?? '').trim() !== 'grupo_1') return f
        return {
          ...f,
          repeatGroupSource: {
            countFromKey: 'quantos_usuarios',
            minRows: 1,
          },
        }
      })
    : nonFileFields

  // Garantir que as perguntas fiquem antes do anexo e sem duplicar se o admin já criou.
  const existingKeys = new Set(patchedNonFile.map((f) => f.key))
  const q = injectedQuestions.filter((f) => !existingKeys.has(f.key))

  return {
    ...base,
    rules: injectedRules,
    fields: [...injected, ...q, ...patchedNonFile, ...fileFields],
  }
}

