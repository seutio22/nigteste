/** Parsers compartilhados entre validação da base e indicadores do grupo elegível. */

import { formatCentsToBRL, parseBRLToCents } from './utils'

function normSexo(sexo: string | null | undefined): string {
  return String(sexo ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function excelSerialToIso(n: number): string | null {
  if (!Number.isFinite(n) || n < 1) return null
  const utc = (n - 25569) * 86400 * 1000
  const d = new Date(utc)
  if (Number.isNaN(d.getTime())) return null
  return dateToLocalIso(d)
}

/** Evita deslocamento de dia ao converter Date (Excel / API) para ISO. */
function dateToLocalIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isBirthYear(n: number): boolean {
  return Number.isInteger(n) && n >= 1900 && n <= 2035
}

function isExcelSerial(n: number): boolean {
  return Number.isFinite(n) && n >= 10_000
}

function isDirectAge(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 120
}

function idadeFromParts(year: number, month: number, day: number): number | null {
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) return null
  const birth = new Date(year, month - 1, day)
  if (Number.isNaN(birth.getTime())) return null
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) {
    return null
  }
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const md = today.getMonth() - birth.getMonth()
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age -= 1
  return age >= 0 && age < 130 ? age : null
}

function normalizeDateInput(raw: string): string {
  return raw.trim().replace(/\s+/g, '')
}

function normalizeYear(y: string): number {
  const digits = y.trim()
  if (digits.length === 4) return Number(digits)
  if (digits.length === 1) return normalizeYear(digits.padStart(2, '0'))
  if (digits.length === 2) {
    const n = Number(digits)
    const y2000 = 2000 + n
    const y1900 = 1900 + n
    const todayYear = new Date().getFullYear()
    const age2000 = todayYear - y2000
    const age1900 = todayYear - y1900
    const ok2000 = age2000 >= 0 && age2000 < 120
    const ok1900 = age1900 >= 0 && age1900 < 120
    if (ok2000 && ok1900) {
      // Padrão BR/Excel: 00–29 → 2000+, 30–99 → 1900+
      return n <= 29 ? y2000 : y1900
    }
    if (ok2000) return y2000
    if (ok1900) return y1900
    return n <= 29 ? y2000 : y1900
  }
  return Number(digits)
}

/** Resolve dd/mm vs mm/dd quando ambos segmentos são ≤ 12. */
function resolveAmbiguousSlashDate(
  p1: number,
  p2: number,
  year: number
): { day: number; month: number } | null {
  const candidates: { day: number; month: number }[] = []
  if (p1 >= 1 && p1 <= 31 && p2 >= 1 && p2 <= 12) candidates.push({ day: p1, month: p2 })
  if (p2 >= 1 && p2 <= 31 && p1 >= 1 && p1 <= 12) candidates.push({ day: p2, month: p1 })

  const seen = new Set<string>()
  const valid: { day: number; month: number; age: number }[] = []
  for (const c of candidates) {
    const key = `${c.day}-${c.month}`
    if (seen.has(key)) continue
    seen.add(key)
    const age = idadeFromParts(year, c.month, c.day)
    if (age != null) valid.push({ ...c, age })
  }
  if (!valid.length) return null
  if (valid.length === 1) return valid[0]

  // Preferir interpretação que resulta em idade menor (evita crianças em faixas altas por inversão US).
  valid.sort((a, b) => a.age - b.age)
  return valid[0]
}

function parseSlashOrDashDate(cleaned: string): { year: number; month: number; day: number } | null {
  const m = cleaned.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,4})$/)
  if (!m) return null

  const p1 = Number(m[1])
  const p2 = Number(m[2])
  const year = normalizeYear(m[3])

  let day: number
  let month: number

  if (p1 > 12) {
    day = p1
    month = p2
  } else if (p2 > 12) {
    month = p1
    day = p2
  } else {
    const resolved = resolveAmbiguousSlashDate(p1, p2, year)
    if (!resolved) return null
    day = resolved.day
    month = resolved.month
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year, month, day }
}

/**
 * Idade a partir de qualquer valor vindo da planilha ou da API.
 */
export function parseBeneficiarioIdadeFromValue(value: unknown): number | null {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return idadeFromParts(value.getFullYear(), value.getMonth() + 1, value.getDate())
  }
  if (typeof value === 'string' && /[T\s]/.test(value.trim())) {
    const d = new Date(value.trim())
    if (!Number.isNaN(d.getTime())) {
      return idadeFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate())
    }
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (isBirthYear(value)) return idadeFromParts(value, 7, 1)
    if (isDirectAge(value)) return value
    if (value > 1e12) {
      const d = new Date(value)
      if (!Number.isNaN(d.getTime())) {
        return idadeFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate())
      }
    }
    if (isExcelSerial(value)) {
      const iso = excelSerialToIso(value)
      if (iso) return parseBeneficiarioIdade(iso)
    }
  }
  const iso = parseBeneficiarioDataToIso(value)
  if (iso) {
    const idade = parseBeneficiarioIdade(iso)
    if (idade != null) return idade
  }
  return parseBeneficiarioIdade(String(value))
}

export function parseBeneficiarioIdade(dataNascimento: string | null | undefined): number | null {
  if (dataNascimento == null || dataNascimento === '') return null
  const raw = normalizeDateInput(String(dataNascimento))
  if (!raw) return null

  if (/^\d{1,3}$/.test(raw)) {
    const age = Number(raw)
    if (isDirectAge(age)) return age
  }

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw)
    if (Number.isFinite(serial)) {
      if (isBirthYear(serial)) return idadeFromParts(serial, 7, 1)
      if (isDirectAge(serial)) return serial
      if (isExcelSerial(serial)) {
        const iso = excelSerialToIso(serial)
        if (iso) return parseBeneficiarioIdade(iso)
      }
    }
  }

  const cleaned = raw.split(/[T\s]/)[0].trim()

  const yearOnly = cleaned.match(/^(\d{4})$/)
  if (yearOnly) {
    return idadeFromParts(Number(yearOnly[1]), 7, 1)
  }

  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    const year = Number(isoMatch[1])
    const month = Number(isoMatch[2])
    const day = Number(isoMatch[3])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return idadeFromParts(year, month, day)
    }
  }

  const slash = parseSlashOrDashDate(cleaned)
  if (slash) return idadeFromParts(slash.year, slash.month, slash.day)

  if (!/\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*\d{1,4}/.test(cleaned)) {
    const d = new Date(cleaned)
    if (!Number.isNaN(d.getTime())) {
      return idadeFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate())
    }
  }

  return null
}

/** Converte célula de data (planilha/API) para ISO `yyyy-mm-dd`. */
export function parseBeneficiarioDataToIso(value: unknown): string | null {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return dateToLocalIso(value)
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (isBirthYear(value)) return `${value}-07-01`
    if (isDirectAge(value)) return null
    if (value > 1e12) return dateToLocalIso(new Date(value))
    if (isExcelSerial(value)) return excelSerialToIso(value)
    return null
  }

  const raw = normalizeDateInput(String(value))
  if (!raw) return null

  if (/^\d{4}$/.test(raw)) {
    return `${raw}-07-01`
  }

  if (/^\d{1,3}$/.test(raw) && isDirectAge(Number(raw))) {
    return null
  }

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const n = Number(raw)
    if (Number.isFinite(n)) {
      if (isBirthYear(n)) return `${n}-07-01`
      if (isDirectAge(n)) return null
      if (isExcelSerial(n)) return excelSerialToIso(n)
    }
  }

  const cleaned = raw.split(/[T\s]/)[0].trim()

  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    const month = Number(isoMatch[2])
    const day = Number(isoMatch[3])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return cleaned
    }
  }

  const slash = parseSlashOrDashDate(cleaned)
  if (slash) {
    const mm = String(slash.month).padStart(2, '0')
    const dd = String(slash.day).padStart(2, '0')
    return `${slash.year}-${mm}-${dd}`
  }

  if (!/\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*\d{1,4}/.test(cleaned)) {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) {
      return dateToLocalIso(d)
    }
  }

  return null
}

export function parseBeneficiarioSexo(sexo: string | null | undefined): 'M' | 'F' | null {
  const s = normSexo(sexo)
  if (!s) return null
  if (s === 'm' || s === '1' || s.startsWith('masc') || s === 'homem' || s === 'h') return 'M'
  if (s === 'f' || s === '2' || s.startsWith('fem') || s === 'mulher') return 'F'
  return null
}

/** Normaliza valor de custo vindo da planilha (número Excel ou texto) para string pt-BR. */
export function normalizeSpreadsheetCustoCell(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  const s = String(raw).trim()
  return s || null
}

/** Converte célula de custo da planilha (texto ou número) para centavos. */
export function parseBeneficiarioCustoToCents(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    return Math.round(value * 100)
  }
  const raw = String(value).trim()
  if (!raw) return null
  return parseBRLToCents(raw)
}

/** Exibe custo da planilha formatado em R$; mantém texto bruto se não for parseável. */
export function formatBeneficiarioCustoDisplay(value: unknown): string {
  if (value == null || value === '') return '—'
  const raw = String(value).trim()
  if (!raw) return '—'
  const cents = parseBeneficiarioCustoToCents(value)
  if (cents == null) return raw
  return formatCentsToBRL(cents)
}
