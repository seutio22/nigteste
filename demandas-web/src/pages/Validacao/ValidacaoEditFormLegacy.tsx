import { Autocomplete, TextField } from '@mui/material'
import { Save as SaveIcon } from '@mui/icons-material'
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
import type { ValidacaoEditDraftReturn } from './useValidacaoEditDraft'

type ValidacaoEditFormLegacyProps = {
  validation: ValidationEntry
} & ValidacaoEditDraftReturn

export function ValidacaoEditFormLegacy({
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
}: ValidacaoEditFormLegacyProps) {
  return (
    <div className="space-y-6">
      {/* Analista e Status - analista somente leitura (definido na criação), como em Manutenção */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Analista responsável</label>
          <input
            type="text"
            value={analistaResponsavelNome}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
            placeholder="Definido na criação"
          />
          <p className="text-xs text-apoio-400 mt-1">
            ⚠️ O analista responsável é definido na criação e não pode ser alterado
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
          <select
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {validacaoChamadoStatusSelectOptions(draft.status).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data de Início *</label>
          <input
            type="date"
            value={
              draft.dataInicio
                ? typeof draft.dataInicio === 'string'
                  ? draft.dataInicio.split('T')[0]
                  : draft.dataInicio
                : ''
            }
            onChange={(e) => setDraft({ ...draft, dataInicio: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
          <input
            type="date"
            value={
              draft.dataFinal
                ? typeof draft.dataFinal === 'string'
                  ? draft.dataFinal.split('T')[0]
                  : draft.dataFinal
                : ''
            }
            onChange={(e) => setDraft({ ...draft, dataFinal: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Ticket e Solicitante */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nº Ticket</label>
          <input
            type="text"
            value={draft.ticket}
            onChange={(e) => setDraft({ ...draft, ticket: e.target.value || undefined })}
            placeholder="Número do ticket"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Solicitante</label>
          <select
            value={
              draft.solicitante != null && typeof draft.solicitante === 'object'
                ? (draft.solicitante as { id: string }).id
                : draft.solicitante || ''
            }
            onChange={(e) => setDraft({ ...draft, solicitante: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {md.solicitantes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tipo de Demanda */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Demanda *</label>
          <select
            value={draft.tipo || ''}
            onChange={(e) => setDraft({ ...draft, tipo: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione o tipo</option>
            <option value="Total">Total</option>
            <option value="SUB">SUB</option>
          </select>
        </div>
      </div>

      {/* Cliente, contrato, operadora e produto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
          <Autocomplete
            options={md.clientes}
            getOptionLabel={(option) => option?.nome || ''}
            isOptionEqualToValue={(option, value) => option.id === value?.id}
            value={md.clientes.find((c) => c.id === (clienteIdNormalized || '')) || null}
            onChange={(_, newValue) =>
              setDraft({
                ...draft,
                cliente: newValue?.id || undefined,
                clienteId: newValue?.id || undefined,
                contrato: undefined,
                contratoId: undefined,
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Digite para buscar..."
                variant="outlined"
                size="small"
                fullWidth
              />
            )}
            noOptionsText="Nenhum cliente encontrado"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Operadora</label>
          <select
            value={
              draft.operadora != null && typeof draft.operadora === 'object'
                ? (draft.operadora as { id: string }).id
                : draft.operadora || ''
            }
            onChange={(e) =>
              setDraft({
                ...draft,
                operadora: e.target.value || undefined,
                operadoraId: e.target.value || undefined,
                produto: undefined,
                produtoId: undefined,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione uma operadora</option>
            {md.operadoras.map((op) => (
              <option key={op.id} value={op.id}>
                {op.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contrato</label>
          <ContratoLocalAutocomplete
            valueId={
              typeof draft.contrato === 'string'
                ? draft.contrato
                : relationId(draft.contrato, validation.contratoId)
            }
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
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Produto</label>
          <select
            value={
              draft.produto != null && typeof draft.produto === 'object'
                ? (draft.produto as { id: string }).id
                : draft.produto || ''
            }
            onChange={(e) =>
              setDraft({
                ...draft,
                produto: e.target.value || undefined,
                produtoId: e.target.value || undefined,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione um produto</option>
            {produtosFiltrados.map((produto) => (
              <option key={produto.id} value={produto.id}>
                {produto.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vigência */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Vigência</label>
          <input
            type="date"
            value={
              draft.vigencia
                ? typeof draft.vigencia === 'string'
                  ? draft.vigencia.split('T')[0]
                  : draft.vigencia
                : ''
            }
            onChange={(e) => setDraft({ ...draft, vigencia: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Qtd de Retornos e Qualidade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Qtd de retornos</label>
          <input
            type="number"
            value={draft.qtdRetornos ?? ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                qtdRetornos: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            placeholder="0"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Qualidade</label>
          <select
            value={draft.qualidade}
            onChange={(e) => setDraft({ ...draft, qualidade: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione a qualidade</option>
            <option value="0">0 - RUIM - MAIS DE 3 RETORNOS; ITENS INCOMPLETOS, SEM RETORNO</option>
            <option value="1">1 - MEDIANO - NO MÁX 2 RETORNOS</option>
            <option value="2">2 - BOM - NO MÁX 1 RETORNO; TODOS OS ITENS COMPLETOS</option>
            <option value="3">3 - EXCELENTE - SEM NENHUMA CONSIDERAÇÃO</option>
          </select>
        </div>
      </div>

      {/* Estrutura EDGE, MOVE e Formalização */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
        <EstruturaMultiSelectPanel
          title="Estrutura EDGE"
          options={ESTRUTURA_EDGE_OPTIONS}
          value={Array.isArray(draft.estruturaEdge) ? draft.estruturaEdge : []}
          onChange={(next) => setDraft({ ...draft, estruturaEdge: next })}
        />
        <EstruturaMultiSelectPanel
          title="Estrutura MOVE"
          options={ESTRUTURA_MOVE_OPTIONS}
          value={Array.isArray(draft.estruturaMove) ? draft.estruturaMove : []}
          onChange={(next) => setDraft({ ...draft, estruturaMove: next })}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Formalização</label>
          <select
            value={draft.formalizacao}
            onChange={(e) => setDraft({ ...draft, formalizacao: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione o status</option>
            <option value="0">0 - FORMALIZAÇÃO COMPLETA</option>
            <option value="1">1 - FORMALIZAÇÃO PARCIAL</option>
            <option value="2">2 - SEM FORMALIZAÇÃO</option>
          </select>
        </div>
      </div>

      {/* Itens Pendentes e Concluídos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <div className="md:max-w-[220px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">Itens Pendentes</label>
          <input
            type="number"
            value={draft.itensPendentes ?? ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                itensPendentes: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            placeholder="0"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="md:max-w-[220px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">Itens Concluídos</label>
          <input
            type="number"
            value={draft.itensConcluidos ?? ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                itensConcluidos: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            placeholder="0"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Total */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Total *</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={totalCalculado}
          readOnly
          placeholder="Total"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
          style={{
            backgroundColor: '#f5f5f5',
            cursor: 'not-allowed',
            fontSize: '1.1rem',
            fontWeight: 'bold',
          }}
        />
        <p className="text-xs text-apoio-400 mt-1">
          Calculado automaticamente: EDGE ({edgeSelections} itens,{' '}
          {calcTotalFromEstrutura(draft.estruturaEdge)} pts) + MOVE ({moveSelections} itens,{' '}
          {calcTotalFromEstrutura(draft.estruturaMove)} pts) = {totalCalculado}
        </p>
      </div>

      {/* Descrição do Chamado */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Descrição do chamado</label>
        <textarea
          value={draft.descricao}
          onChange={(e) => setDraft({ ...draft, descricao: e.target.value })}
          placeholder="Descrição detalhada do chamado"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
        <textarea
          value={draft.observacoes}
          onChange={(e) => setDraft({ ...draft, observacoes: e.target.value })}
          placeholder="Observações gerais sobre a validação..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Botão de salvar */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <PrimaryActionButton
          disabled={changedKeys.length === 0}
          onClick={() => setConfirmOpen(true)}
          startIcon={<SaveIcon />}
        >
          Salvar alterações
        </PrimaryActionButton>
        {changedKeys.length > 0 && (
          <span className="text-sm text-gray-600">
            {changedKeys.length} alteração(ões) pendente(s)
          </span>
        )}
      </div>

      {/* Modal de confirmação */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmar alterações</h3>
            <p className="text-gray-600 mb-6">
              Aplicar {changedKeys.length} alteração(ões) nesta validação?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={applySave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Salvando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
