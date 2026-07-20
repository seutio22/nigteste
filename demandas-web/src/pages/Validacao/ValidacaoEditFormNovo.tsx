import React from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import { Save as SaveIcon } from '@mui/icons-material'
import { AsyncClienteAutocomplete } from '../../components/AsyncClienteAutocomplete'
import { ContratoLocalAutocomplete } from '../../components/ContratoLocalAutocomplete'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { relationId } from '../../utils/validationRelations'
import { ValidationEntry } from '../../types/validation'
import { validacaoChamadoStatusSelectOptions } from './validacaoStatusOptions'
import { EstruturaMultiSelectPanel } from './EstruturaMultiSelectPanel'
import {
  ESTRUTURA_EDGE_OPTIONS,
  ESTRUTURA_MOVE_OPTIONS,
  calcTotalFromEstrutura,
} from './validacaoEstruturaOptions'
import { ValidacaoFormCard, ValidacaoFormShell } from './validacaoFormUi'
import { ItensConcluidosPanel } from './ItensConcluidosPanel'
import {
  sumItensConcluidosDetalhe,
  type ItensConcluidosDetalhe,
} from './validacaoItensConcluidos'
import type { ValidacaoEditDraftReturn } from './useValidacaoEditDraft'

type Props = {
  validation: ValidationEntry
} & ValidacaoEditDraftReturn

function dateInputValue(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value.split('T')[0]
  return ''
}

export function ValidacaoEditFormNovo({
  validation,
  draft,
  setDraft,
  changedKeys,
  totalCalculado,
  edgeSelections,
  moveSelections,
  confirmOpen,
  setConfirmOpen,
  isSaving,
  applySave,
  clienteIdNormalized,
  contratosDoCliente,
  produtosFiltrados,
  analistaResponsavelNome,
  md,
}: Props) {
  const statusOptions = validacaoChamadoStatusSelectOptions(draft.status)

  return (
    <ValidacaoFormShell
      title="Editar validação"
      subtitle="Mesmo padrão do cadastro: identificação, cliente, estruturas EDGE/MOVE com quantidades e itens concluídos ramificados."
    >
      <ValidacaoFormCard title="Identificação">
        <Grid container spacing={2.25}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="Analista responsável"
              fullWidth
              value={typeof draft.analista === 'string' ? draft.analista : ''}
              InputProps={{ readOnly: true }}
              helperText="Definido na criação e não pode ser alterado"
              sx={{
                '& .MuiInputBase-input': { backgroundColor: '#f5f5f5', cursor: 'not-allowed' },
              }}
            >
              <MenuItem value={typeof draft.analista === 'string' ? draft.analista : ''}>
                {analistaResponsavelNome}
              </MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              type="date"
              label="Data de início"
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              value={dateInputValue(draft.dataInicio)}
              onChange={(e) => setDraft({ ...draft, dataInicio: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              type="date"
              label="Data de finalização"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dateInputValue(draft.dataFinal)}
              onChange={(e) => setDraft({ ...draft, dataFinal: e.target.value || undefined })}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              required
              label="Status"
              fullWidth
              value={draft.status ?? ''}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              {statusOptions.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Nº Ticket"
              fullWidth
              value={draft.ticket ?? ''}
              onChange={(e) => setDraft({ ...draft, ticket: e.target.value || undefined })}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Autocomplete
              options={md.solicitantes}
              getOptionLabel={(option) => option?.nome || ''}
              isOptionEqualToValue={(option, value) => option.id === value?.id}
              value={md.solicitantes.find((s) => s.id === draft.solicitante) || null}
              onChange={(_, newValue) =>
                setDraft({ ...draft, solicitante: newValue?.id || undefined })
              }
              renderInput={(params) => (
                <TextField {...params} label="Solicitante" fullWidth placeholder="Digite para buscar..." />
              )}
              noOptionsText="Nenhum solicitante encontrado"
            />
          </Grid>
        </Grid>
      </ValidacaoFormCard>

      <ValidacaoFormCard title="Cliente e contrato">
        <Grid container spacing={2.25}>
          <Grid item xs={12} sm={6} md={4}>
            <AsyncClienteAutocomplete
              valueId={clienteIdNormalized || ''}
              onChangeId={(nextId) => {
                setDraft({
                  ...draft,
                  cliente: nextId || undefined,
                  clienteId: nextId || undefined,
                  contrato: undefined,
                  contratoId: undefined,
                })
              }}
              label="Cliente"
              helperText="Digite para buscar um cliente"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <ContratoLocalAutocomplete
              valueId={typeof draft.contrato === 'string' ? draft.contrato : relationId(draft.contrato, validation.contratoId)}
              onChangeId={(id) =>
                setDraft({
                  ...draft,
                  contrato: id || undefined,
                  contratoId: id || undefined,
                })
              }
              contratos={contratosDoCliente}
              disabled={!clienteIdNormalized}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Autocomplete
              options={md.operadoras}
              getOptionLabel={(option) => option.nome || ''}
              isOptionEqualToValue={(option, value) => option.id === value?.id}
              value={md.operadoras.find((o) => o.id === draft.operadora) || null}
              onChange={(_, newValue) =>
                setDraft({
                  ...draft,
                  operadora: newValue?.id || undefined,
                  operadoraId: newValue?.id || undefined,
                  produto: undefined,
                  produtoId: undefined,
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="Operadora" fullWidth placeholder="Digite para buscar..." />
              )}
              noOptionsText="Nenhuma operadora encontrada"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="Produto"
              fullWidth
              value={typeof draft.produto === 'string' ? draft.produto : ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  produto: e.target.value || undefined,
                  produtoId: e.target.value || undefined,
                })
              }
            >
              <MenuItem value="">
                <em>Selecione um produto</em>
              </MenuItem>
              {produtosFiltrados.map((produto) => (
                <MenuItem key={produto.id} value={produto.id}>
                  {produto.nome}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              type="date"
              label="Vigência"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dateInputValue(draft.vigencia)}
              onChange={(e) => setDraft({ ...draft, vigencia: e.target.value || undefined })}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              required
              label="Tipo de demanda"
              fullWidth
              value={draft.tipo ?? ''}
              onChange={(e) => setDraft({ ...draft, tipo: e.target.value })}
            >
              <MenuItem value="">
                <em>Selecione o tipo</em>
              </MenuItem>
              <MenuItem value="Total">Total</MenuItem>
              <MenuItem value="SUB">SUB</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </ValidacaoFormCard>

      <ValidacaoFormCard title="Qualidade, estruturas e formalização">
        <Grid container spacing={2.25}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              type="number"
              label="Qtd de retornos"
              fullWidth
              inputProps={{ min: 0 }}
              value={draft.qtdRetornos ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  qtdRetornos: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="Qualidade"
              fullWidth
              value={draft.qualidade ?? ''}
              onChange={(e) => setDraft({ ...draft, qualidade: e.target.value || undefined })}
            >
              <MenuItem value="">
                <em>Selecione a qualidade</em>
              </MenuItem>
              <MenuItem value="0">0 - RUIM - MAIS DE 3 RETORNOS; ITENS INCOMPLETOS, SEM RETORNO</MenuItem>
              <MenuItem value="1">1 - MEDIANO - NO MÁX 2 RETORNOS</MenuItem>
              <MenuItem value="2">2 - BOM - NO MÁX 1 RETORNO; TODOS OS ITENS COMPLETOS</MenuItem>
              <MenuItem value="3">3 - EXCELENTE - SEM NENHUMA CONSIDERAÇÃO</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              type="number"
              label="Total"
              fullWidth
              value={totalCalculado}
              InputProps={{ readOnly: true }}
              helperText={`EDGE (${edgeSelections} itens, ${calcTotalFromEstrutura(draft.estruturaEdge)} pts) + MOVE (${moveSelections} itens, ${calcTotalFromEstrutura(draft.estruturaMove)} pts) = ${totalCalculado}`}
              sx={{
                '& .MuiInputBase-input': {
                  backgroundColor: '#f5f5f5',
                  cursor: 'not-allowed',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                },
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <EstruturaMultiSelectPanel
              title="Estrutura EDGE"
              options={ESTRUTURA_EDGE_OPTIONS}
              value={Array.isArray(draft.estruturaEdge) ? draft.estruturaEdge : []}
              onChange={(next) => setDraft({ ...draft, estruturaEdge: next })}
            />
          </Grid>
          <Grid item xs={12}>
            <EstruturaMultiSelectPanel
              title="Estrutura MOVE"
              options={ESTRUTURA_MOVE_OPTIONS}
              value={Array.isArray(draft.estruturaMove) ? draft.estruturaMove : []}
              onChange={(next) => setDraft({ ...draft, estruturaMove: next })}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="Formalização"
              fullWidth
              value={draft.formalizacao ?? ''}
              onChange={(e) => setDraft({ ...draft, formalizacao: e.target.value || undefined })}
            >
              <MenuItem value="">
                <em>Selecione o status</em>
              </MenuItem>
              <MenuItem value="0">0 - FORMALIZAÇÃO COMPLETA</MenuItem>
              <MenuItem value="1">1 - FORMALIZAÇÃO PARCIAL</MenuItem>
              <MenuItem value="2">2 - SEM FORMALIZAÇÃO</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              type="number"
              label="Itens pendentes"
              fullWidth
              inputProps={{ min: 0 }}
              placeholder="0"
              value={draft.itensPendentes ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  itensPendentes: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} md={8}>
            <ItensConcluidosPanel
              value={(draft.itensConcluidosDetalhe ?? {}) as ItensConcluidosDetalhe}
              onChange={(next) =>
                setDraft({
                  ...draft,
                  itensConcluidosDetalhe: next,
                  itensConcluidos: sumItensConcluidosDetalhe(next),
                })
              }
            />
          </Grid>
        </Grid>
      </ValidacaoFormCard>

      <ValidacaoFormCard title="Informações adicionais">
        <Grid container spacing={2.25}>
          <Grid item xs={12}>
            <TextField
              label="Descrição do chamado"
              fullWidth
              multiline
              minRows={2}
              value={draft.descricao ?? ''}
              onChange={(e) => setDraft({ ...draft, descricao: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Observações"
              fullWidth
              multiline
              minRows={2}
              value={draft.observacoes ?? ''}
              onChange={(e) => setDraft({ ...draft, observacoes: e.target.value || undefined })}
            />
          </Grid>
        </Grid>
      </ValidacaoFormCard>

      <Box mt={1} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <PrimaryActionButton
          disabled={changedKeys.length === 0}
          onClick={() => setConfirmOpen(true)}
          startIcon={<SaveIcon />}
        >
          Salvar alterações
        </PrimaryActionButton>
        {changedKeys.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            {changedKeys.length} alteração(ões) pendente(s)
          </Typography>
        )}
      </Box>

      {confirmOpen && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
        >
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 3, maxWidth: 420, mx: 2, width: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Confirmar alterações
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Aplicar {changedKeys.length} alteração(ões) nesta validação?
            </Typography>
            <Box display="flex" gap={1.5} justifyContent="flex-end">
              <Button onClick={() => setConfirmOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <PrimaryActionButton onClick={applySave} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Confirmar'}
              </PrimaryActionButton>
            </Box>
          </Box>
        </Box>
      )}
    </ValidacaoFormShell>
  )
}
