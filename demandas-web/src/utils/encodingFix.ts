/**
 * Utilitário para corrigir problemas de encoding UTF-8
 * Resolve acentos quebrados vindos do backend
 */

const MOJIBAKE_PATTERN = /Ã|Â|â€|�/
const VALID_UTF8_PATTERN = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/

function tryFixMojibake(text: string): string | null {
  if (!MOJIBAKE_PATTERN.test(text)) return null
  try {
    return decodeURIComponent(escape(text))
  } catch {
    return null
  }
}

export function fixEncoding(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return text || ''
  }

  if (VALID_UTF8_PATTERN.test(text)) {
    return text
  }

  const fixed = tryFixMojibake(text)
  if (fixed && fixed !== text && VALID_UTF8_PATTERN.test(fixed)) {
    return fixed
  }

  try {
    const latin1Bytes = new Uint8Array(text.length)
    for (let i = 0; i < text.length; i++) {
      latin1Bytes[i] = text.charCodeAt(i)
    }
    const fixed2 = new TextDecoder('utf-8').decode(latin1Bytes)
    if (fixed2 !== text && VALID_UTF8_PATTERN.test(fixed2)) {
      return fixed2
    }
  } catch {
    // texto já está legível ou não é latin1 mal interpretado
  }

  return text
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
