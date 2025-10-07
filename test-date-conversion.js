// Teste de conversão de datas para verificar se está funcionando
function parseDate(value) {
  if (!value) return { isValid: true }

  const stringValue = String(value).trim()

  // 1. Números seriais do Excel (como 45904, 45905, 45898)
  if (/^\d{5,6}$/.test(stringValue)) {
    const serialNumber = parseInt(stringValue)
    if (serialNumber >= 1 && serialNumber <= 2958465) { // Range válido do Excel
      // Excel conta dias desde 1900-01-01 (mas tem bug do ano bissexto 1900)
      const excelEpoch = new Date(1900, 0, 1)
      const days = serialNumber - 2 // -2 para corrigir bug do Excel
      const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000)
      
      if (!isNaN(date.getTime())) {
        return { isValid: true, date }
      }
    }
  }

  // 2. Formatos de string comuns
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/,   // YYYY-MM-DD
    /^(\d{2})-(\d{2})-(\d{4})$/,   // DD-MM-YYYY
    /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // D/M/YYYY
  ]

  for (const format of formats) {
    const match = stringValue.match(format)
    if (match) {
      const [, part1, part2, part3] = match
      // Assumir DD/MM/YYYY para formatos brasileiros
      const date = new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1))
      if (!isNaN(date.getTime())) {
        return { isValid: true, date }
      }
    }
  }

  // 3. Tentar parse direto do JavaScript
  const directDate = new Date(value)
  if (!isNaN(directDate.getTime())) {
    return { isValid: true, date: directDate }
  }

  return { isValid: false }
}

// Testar os valores da planilha
const testValues = [
  45904, // dataInicio linha 1
  45905, // dataFinal linha 1  
  45898, // dataInicio linha 2
  45905, // dataFinal linha 2
  '15/01/2024', // formato brasileiro
  '2024-01-15', // formato ISO
  '01/01/2024', // formato com zeros
  'invalid-date' // inválido
]

console.log('🧪 TESTE DE CONVERSÃO DE DATAS')
console.log('================================')

testValues.forEach(value => {
  const result = parseDate(value)
  if (result.isValid && result.date) {
    console.log(`✅ ${value} → ${result.date.toISOString().split('T')[0]} (${result.date.toLocaleDateString('pt-BR')})`)
  } else {
    console.log(`❌ ${value} → INVÁLIDO`)
  }
})

console.log('\n📊 RESUMO DOS VALORES DA PLANILHA:')
console.log('45904 →', parseDate(45904).date?.toLocaleDateString('pt-BR'))
console.log('45905 →', parseDate(45905).date?.toLocaleDateString('pt-BR'))
console.log('45898 →', parseDate(45898).date?.toLocaleDateString('pt-BR'))
