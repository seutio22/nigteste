const XLSX = require('xlsx')

// Dados de exemplo para contratos
const contratosData = [
  { id: 'CTR-001', codigo: 'CTR-001', grupoEconomico: 'Grupo A' },
  { id: 'CTR-002', codigo: 'CTR-002', grupoEconomico: 'Grupo B' },
  { id: 'CTR-003', codigo: 'CTR-003', grupoEconomico: 'Grupo A' },
  { id: 'CTR-004', codigo: 'CTR-004', grupoEconomico: 'Grupo C' },
  { id: 'CTR-005', codigo: 'CTR-005', grupoEconomico: 'Grupo B' }
]

// Dados de exemplo para clientes
const clientesData = [
  { id: 'CLI-001', nome: 'Empresa A Ltda', grupoEconomico: 'Grupo A' },
  { id: 'CLI-002', nome: 'Empresa B SA', grupoEconomico: 'Grupo B' },
  { id: 'CLI-003', nome: 'Empresa C Ltda', grupoEconomico: 'Grupo C' }
]

// Dados de exemplo para operadoras
const operadorasData = [
  { id: 'OP-001', nome: 'Operadora A' },
  { id: 'OP-002', nome: 'Operadora B' },
  { id: 'OP-003', nome: 'Operadora C' }
]

// Criar workbook
const workbook = XLSX.utils.book_new()

// Criar abas
const contratosSheet = XLSX.utils.json_to_sheet(contratosData)
const clientesSheet = XLSX.utils.json_to_sheet(clientesData)
const operadorasSheet = XLSX.utils.json_to_sheet(operadorasData)

// Adicionar abas ao workbook
XLSX.utils.book_append_sheet(workbook, contratosSheet, 'Contratos')
XLSX.utils.book_append_sheet(workbook, clientesSheet, 'Clientes')
XLSX.utils.book_append_sheet(workbook, operadorasSheet, 'Operadoras')

// Salvar arquivo
XLSX.writeFile(workbook, 'teste-upload-contratos.xlsx')

console.log('✅ Arquivo de teste criado: teste-upload-contratos.xlsx')
console.log('📊 Dados incluídos:')
console.log(`   - Contratos: ${contratosData.length}`)
console.log(`   - Clientes: ${clientesData.length}`)
console.log(`   - Operadoras: ${operadorasData.length}`)
console.log('')
console.log('🔍 Use este arquivo para testar o upload na página de Dados')
console.log('📋 Certifique-se de que a aba "Contratos" tem as colunas: id, codigo, grupoEconomico')
