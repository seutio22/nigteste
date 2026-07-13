import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import CheckIcon from '@mui/icons-material/Check'
import { CotacaoFormFields, type CotacaoFormState } from './CotacaoFormFields'
import type { AberturaSectionKey } from './placementCotacaoFormScope'

type Props = {
  value: CotacaoFormState
  onChange: (next: CotacaoFormState) => void
  cotacaoId?: string | null
  title?: string
  disabled?: boolean
  onEditingChange?: (editing: boolean) => void
}

const ABERTURA_SECTIONS: { key: AberturaSectionKey; title: string; description: string }[] = [
  {
    key: 'prazos',
    title: 'Solicitação de Estudo',
    description:
      'Ticket, analista, datas, projeto, pedido/conta, temperatura e solicitante.',
  },
  {
    key: 'mapeamento',
    title: 'Mapeamento',
    description: 'Estipulante, filial e corretor parceiro.',
  },
  {
    key: 'detalhes_base',
    title: 'Condições Contratuais',
    description:
      'Contrato vigente, itens, comissões do contrato atual, planos (com coparticipação), upgrade/downgrade, reembolso atual, coberturas especiais e descrição.',
  },
  {
    key: 'cenario_estudo',
    title: 'Cenário de estudo — Solicitação Mercado',
    description: 'Sugestão de fornecedores (operadoras) a consultar no mercado.',
  },
  {
    key: 'subfaturas',
    title: 'Subfaturas',
    description: 'Empresas e CNPJs vinculados à cotação.',
  },
  {
    key: 'observacoes',
    title: 'Observações',
    description: 'Notas registradas na abertura do processo.',
  },
]

export function CotacaoDadosLancadosView({
  value,
  onChange,
  cotacaoId,
  title = 'Dados registrados na abertura do processo',
  disabled,
  onEditingChange,
}: Props) {
  const [editingSection, setEditingSection] = useState<AberturaSectionKey | null>(null)

  useEffect(() => {
    onEditingChange?.(editingSection != null)
  }, [editingSection, onEditingChange])

  function startEdit(key: AberturaSectionKey) {
    setEditingSection(key)
  }

  function finishEdit() {
    setEditingSection(null)
  }

  return (
    <Stack spacing={2}>
      <Alert severity="info" icon={false}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2">
          Todos os campos preenchidos no formulário de entrada. Use «Editar» em cada bloco para
          alterar; depois salve a cotação com o botão «Salvar alterações» no rodapé da página.
        </Typography>
      </Alert>

      {ABERTURA_SECTIONS.map((section) => {
        const isEditing = editingSection === section.key
        const sectionDisabled = disabled || (!isEditing && editingSection != null)

        return (
          <Card key={section.key} variant="outlined">
            <CardContent>
              <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                spacing={1}
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {section.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {section.description}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5} flexShrink={0}>
                  {isEditing ? (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<CheckIcon />}
                      onClick={finishEdit}
                      disabled={disabled}
                    >
                      Concluir
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditOutlinedIcon />}
                      onClick={() => startEdit(section.key)}
                      disabled={disabled || editingSection != null}
                    >
                      Editar
                    </Button>
                  )}
                </Stack>
              </Stack>

              <CotacaoFormFields
                value={value}
                onChange={onChange}
                disabled={sectionDisabled || !isEditing}
                cotacaoId={cotacaoId}
                formMode="edit"
                workflowStageKey="base_atual"
                formScope="dados_abertura"
                aberturaSectionsOnly={[section.key]}
                embedSections
              />
            </CardContent>
          </Card>
        )
      })}
    </Stack>
  )
}
