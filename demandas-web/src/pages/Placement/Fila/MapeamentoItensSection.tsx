import React from 'react'
import {
  Autocomplete,
  Button,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import type { Operadora, Produto } from '../../../types/masterData'
import type { PlacementPlano } from '../../../store/placementStore'
import {
  emptyMapeamentoItem,
  type MapeamentoItemForm,
} from './placementCotacaoDetalhes'
import { categoriasPorFornecedor } from './placementPlanos'

interface Props {
  itens: MapeamentoItemForm[]
  onChangeItens: (next: MapeamentoItemForm[]) => void
  produtos: Produto[]
  operadoras: Operadora[]
  planosCatalogo?: PlacementPlano[]
  /** Quando 'saude', exibe Categoria (catálogo Planos) em vez de Produto. */
  formularioTipo?: string
  disabled?: boolean
}

export function MapeamentoItensSection({
  itens,
  onChangeItens,
  produtos,
  operadoras,
  planosCatalogo = [],
  formularioTipo,
  disabled,
}: Props) {
  const usaCategoria = formularioTipo === 'saude'

  function patchItem(index: number, part: Partial<MapeamentoItemForm>) {
    onChangeItens(itens.map((it, i) => (i === index ? { ...it, ...part } : it)))
  }

  function removeRow(index: number) {
    if (itens.length <= 1) return
    onChangeItens(itens.filter((_, i) => i !== index))
  }

  function addRow() {
    onChangeItens([...itens, emptyMapeamentoItem()])
  }

  return (
    <Stack gap={2}>
      <Typography variant="body2" color="text.secondary">
        {usaCategoria ? (
          <>
            Cada linha associa uma <strong>categoria</strong> ao <strong>fornecedor atual</strong>{' '}
            (operadora). Selecione o fornecedor primeiro; as categorias vêm de Dados → Placement →
            Planos.
          </>
        ) : (
          <>
            Cada linha associa um <strong>produto</strong> ao <strong>fornecedor atual</strong>{' '}
            (operadora). Com dois ou mais produtos na cotação, informe o fornecedor de cada um.
          </>
        )}
      </Typography>

      {itens.map((item, idx) => {
        const produtoSel = produtos.find((p) => p.id === item.produtoId) ?? null
        const fornSel = operadoras.find((o) => o.id === item.fornecedorId) ?? null
        const categorias = categoriasPorFornecedor(planosCatalogo, item.fornecedorId)

        return (
          <Grid container spacing={2} key={item.id} alignItems="flex-start">
            <Grid item xs={12} md={5}>
              <Autocomplete
                options={operadoras}
                getOptionLabel={(o) => o.nome}
                value={fornSel}
                disabled={disabled}
                onChange={(_, opt) =>
                  patchItem(idx, {
                    fornecedorId: opt?.id ?? '',
                    categoria: '',
                  })
                }
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Fornecedor atual"
                    required
                    placeholder="Operadora / fornecedor"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={5}>
              {usaCategoria ? (
                <Autocomplete
                  options={categorias}
                  value={item.categoria || null}
                  disabled={disabled || !item.fornecedorId}
                  onChange={(_, opt) =>
                    patchItem(idx, {
                      categoria: opt ?? '',
                      produtoNome: opt ? 'Saúde' : '',
                      produtoId: opt ? 'saude' : '',
                    })
                  }
                  isOptionEqualToValue={(a, b) => a === b}
                  noOptionsText={
                    item.fornecedorId
                      ? 'Nenhuma categoria para este fornecedor. Cadastre em Dados → Placement → Planos.'
                      : 'Selecione o fornecedor primeiro'
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Categoria"
                      required
                      placeholder={
                        item.fornecedorId ? 'Selecione a categoria' : 'Selecione o fornecedor'
                      }
                    />
                  )}
                />
              ) : (
                <Autocomplete
                  options={produtos}
                  getOptionLabel={(o) => o.nome}
                  value={produtoSel}
                  disabled={disabled}
                  onChange={(_, opt) =>
                    patchItem(idx, {
                      produtoId: opt?.id ?? '',
                      produtoNome: opt?.nome ?? '',
                    })
                  }
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Produto"
                      required
                      placeholder={
                        produtos.length ? 'Selecione o produto' : 'Cadastre produtos em Dados → NIG'
                      }
                    />
                  )}
                />
              )}
            </Grid>
            <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center', pt: { md: 1 } }}>
              <IconButton
                aria-label="Remover linha"
                onClick={() => removeRow(idx)}
                disabled={disabled || itens.length <= 1}
                color="error"
              >
                <DeleteOutlineIcon />
              </IconButton>
            </Grid>
          </Grid>
        )
      })}

      <div>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={addRow}
          disabled={disabled}
        >
          {usaCategoria ? 'Adicionar categoria' : 'Adicionar produto'}
        </Button>
      </div>
    </Stack>
  )
}
