import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { DadosForm } from '../DadosForm'
import type { TabKey, FormData } from '../../types/dadosTypes'

// Mock do store
jest.mock('../../store/masterDataStore', () => ({
  useMasterDataStore: () => ({
    tiposServico: [
      { id: '1', nome: 'CAD' },
      { id: '2', nome: 'MAN' }
    ]
  })
}))

describe('DadosForm', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    activeTab: 'clientes' as TabKey,
    form: {} as FormData,
    onFormChange: jest.fn(),
    onSave: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('deve renderizar campos para clientes', () => {
    render(<DadosForm {...defaultProps} activeTab="clientes" />)
    
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('Grupo econômico')).toBeInTheDocument()
  })

  it('deve renderizar campos para contratos', () => {
    render(<DadosForm {...defaultProps} activeTab="contratos" />)
    
    expect(screen.getByLabelText('Grupo econômico')).toBeInTheDocument()
    expect(screen.getByLabelText('Código')).toBeInTheDocument()
  })

  it('deve renderizar campo nome para entidades simples', () => {
    const simpleEntities: TabKey[] = ['operadoras', 'produtos', 'sistemas', 'analistas', 'areas']
    
    simpleEntities.forEach(entity => {
      const { unmount } = render(<DadosForm {...defaultProps} activeTab={entity} />)
      expect(screen.getByLabelText('Nome')).toBeInTheDocument()
      unmount()
    })
  })

  it('deve renderizar campos para tipos com seleção de serviço', () => {
    render(<DadosForm {...defaultProps} activeTab="tipos" />)
    
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo de serviço')).toBeInTheDocument()
    expect(screen.getByText('CAD')).toBeInTheDocument()
    expect(screen.getByText('MAN')).toBeInTheDocument()
  })

  it('deve renderizar campos para configurações', () => {
    render(<DadosForm {...defaultProps} activeTab="configuracoes" />)
    
    expect(screen.getByLabelText('Chave')).toBeInTheDocument()
    expect(screen.getByLabelText('Valor')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo')).toBeInTheDocument()
    expect(screen.getByLabelText('Categoria')).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição')).toBeInTheDocument()
  })

  it('deve chamar onFormChange quando campo é alterado', () => {
    const onFormChange = jest.fn()
    render(<DadosForm {...defaultProps} onFormChange={onFormChange} />)
    
    const nomeField = screen.getByLabelText('Nome')
    fireEvent.change(nomeField, { target: { value: 'Teste' } })
    
    expect(onFormChange).toHaveBeenCalledWith({ nome: 'Teste' })
  })

  it('deve chamar onSave quando botão salvar é clicado', () => {
    const onSave = jest.fn()
    render(<DadosForm {...defaultProps} onSave={onSave} />)
    
    const saveButton = screen.getByText('Salvar')
    fireEvent.click(saveButton)
    
    expect(onSave).toHaveBeenCalled()
  })

  it('deve chamar onClose quando botão cancelar é clicado', () => {
    const onClose = jest.fn()
    render(<DadosForm {...defaultProps} onClose={onClose} />)
    
    const cancelButton = screen.getByText('Cancelar')
    fireEvent.click(cancelButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('deve mostrar "Salvar Alterações" quando editando', () => {
    render(<DadosForm {...defaultProps} form={{ id: '1' }} />)
    
    expect(screen.getByText('Salvar Alterações')).toBeInTheDocument()
  })

  it('deve mostrar "Salvar" quando criando novo', () => {
    render(<DadosForm {...defaultProps} form={{}} />)
    
    expect(screen.getByText('Salvar')).toBeInTheDocument()
  })
})
