/**
 * Utilitário para corrigir problemas de encoding UTF-8
 * Resolve acentos quebrados vindos do backend
 */

export function fixEncoding(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return text || ''
  }

  try {
    // Verificar se o texto já está correto
    if (text.includes('ção') || text.includes('ã') || text.includes('á') || text.includes('é') || text.includes('í') || text.includes('ó') || text.includes('ú')) {
      return text
    }

    // Tentar corrigir encoding usando decodeURIComponent + escape
    const fixed = decodeURIComponent(escape(text))
    
    // Verificar se a correção funcionou
    if (fixed !== text && (fixed.includes('ção') || fixed.includes('ã') || fixed.includes('á'))) {
      return fixed
    }

    // Se não funcionou, tentar outras abordagens
    try {
      // Tentar converter de latin1 para utf8
      const latin1Bytes = new Uint8Array(text.length)
      for (let i = 0; i < text.length; i++) {
        latin1Bytes[i] = text.charCodeAt(i)
      }
      const decoder = new TextDecoder('utf-8')
      const fixed2 = decoder.decode(latin1Bytes)
      
      if (fixed2 !== text && (fixed2.includes('ção') || fixed2.includes('ã'))) {
        return fixed2
      }
    } catch {
      // Ignorar erro e continuar
    }

    return text
  } catch (error) {
    console.warn('Erro ao corrigir encoding:', error)
    return text
  }
}

/**
 * Aplica correção de encoding em um objeto com propriedades de texto
 */
export function fixObjectEncoding<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  const fixed = { ...obj }
  
  for (const key in fixed) {
    if (typeof fixed[key] === 'string') {
      ;(fixed as Record<string, unknown>)[key] = fixEncoding(fixed[key] as string)
    } else if (Array.isArray(fixed[key])) {
      fixed[key] = fixed[key].map((item: any) => 
        typeof item === 'string' ? fixEncoding(item) : 
        typeof item === 'object' ? fixObjectEncoding(item) : 
        item
      )
    } else if (typeof fixed[key] === 'object' && fixed[key] !== null) {
      fixed[key] = fixObjectEncoding(fixed[key])
    }
  }
  
  return fixed
}
