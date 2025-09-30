// Script para testar dados de clientes
console.log('🧪 TESTE: Verificando dados de clientes...')

// Simular dados de clientes
const clientesTeste = [
  {
    id: 'CLI-001',
    nome: 'Empresa A Ltda',
    grupoEconomico: 'Grupo A'
  },
  {
    id: 'CLI-002',
    nome: 'Empresa B SA',
    grupoEconomico: 'Grupo B'
  },
  {
    id: 'CLI-003',
    nome: 'Empresa C Ltda',
    grupoEconomico: 'Grupo C'
  }
]

console.log('📊 Dados de teste:', clientesTeste)

// Verificar estrutura
clientesTeste.forEach((cliente, index) => {
  console.log(`🔍 Cliente ${index + 1}:`, {
    id: cliente.id,
    nome: cliente.nome,
    grupoEconomico: cliente.grupoEconomico,
    hasGrupoEconomico: 'grupoEconomico' in cliente,
    grupoEconomicoType: typeof cliente.grupoEconomico,
    grupoEconomicoLength: cliente.grupoEconomico?.length
  })
})

// Verificar se todos têm grupoEconomico
const todosTemGrupoEconomico = clientesTeste.every(c => c.grupoEconomico)
console.log('✅ Todos têm grupoEconomico?', todosTemGrupoEconomico)

// Verificar se algum grupoEconomico está vazio
const algumGrupoVazio = clientesTeste.some(c => !c.grupoEconomico || c.grupoEconomico.trim() === '')
console.log('⚠️ Algum grupoEconomico está vazio?', algumGrupoVazio)

console.log('🎯 Teste concluído!')
