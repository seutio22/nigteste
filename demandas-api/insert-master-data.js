const API_BASE = 'http://localhost:3333'

async function insertMasterData() {
  console.log('🔧 Inserindo dados mestres válidos...')
  
  try {
    // 1. Inserir TipoServico
    console.log('\n1️⃣ Inserindo TipoServico...')
    const tipoServicoData = {
      nome: 'CAD',
      descricao: 'Serviço de CAD'
    }
    
    const tipoServicoResponse = await fetch(`${API_BASE}/tiposServico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tipoServicoData)
    })
    
    if (tipoServicoResponse.ok) {
      const tipoServico = await tipoServicoResponse.json()
      console.log('✅ TipoServico criado:', tipoServico)
    } else {
      const error = await tipoServicoResponse.text()
      console.log('❌ Erro ao criar TipoServico:', error)
    }
    
    // 2. Inserir TipoDemanda
    console.log('\n2️⃣ Inserindo TipoDemanda...')
    const tipoDemandaData = {
      nome: 'Implementação',
      descricao: 'Tipo de demanda para implementação'
    }
    
    const tipoDemandaResponse = await fetch(`${API_BASE}/tiposDemanda`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tipoDemandaData)
    })
    
    if (tipoDemandaResponse.ok) {
      const tipoDemanda = await tipoDemandaResponse.json()
      console.log('✅ TipoDemanda criado:', tipoDemanda)
    } else {
      const error = await tipoDemandaResponse.text()
      console.log('❌ Erro ao criar TipoDemanda:', error)
    }
    
    // 3. Inserir Area
    console.log('\n3️⃣ Inserindo Area...')
    const areaData = {
      nome: 'TI',
      descricao: 'Área de Tecnologia da Informação'
    }
    
    const areaResponse = await fetch(`${API_BASE}/areas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(areaData)
    })
    
    if (areaResponse.ok) {
      const area = await areaResponse.json()
      console.log('✅ Area criada:', area)
    } else {
      const error = await areaResponse.text()
      console.log('❌ Erro ao criar Area:', error)
    }
    
    // 4. Inserir Sistema
    console.log('\n4️⃣ Inserindo Sistema...')
    const sistemaData = {
      nome: 'Sistema Principal',
      descricao: 'Sistema principal da empresa'
    }
    
    const sistemaResponse = await fetch(`${API_BASE}/sistemas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sistemaData)
    })
    
    if (sistemaResponse.ok) {
      const sistema = await sistemaResponse.json()
      console.log('✅ Sistema criado:', sistema)
    } else {
      const error = await sistemaResponse.text()
      console.log('❌ Erro ao criar Sistema:', error)
    }
    
    console.log('\n✅ Dados mestres inseridos com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro ao inserir dados mestres:', error)
  }
}

insertMasterData()
