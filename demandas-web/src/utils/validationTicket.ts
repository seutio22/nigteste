/** Gera sufixo de ticket para duplicar validação sem várias idas à API. */
export function generateUniqueValidationTicket(
  originalTicket: string | undefined,
  takenTickets: Iterable<string | null | undefined>
): string | undefined {
  if (!originalTicket || originalTicket.trim() === '') return undefined

  const taken = new Set(
    [...takenTickets]
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim())
  )

  const ticketMatch = originalTicket.match(/^(.+)-(\d{1,3})$/)
  const baseTicket = ticketMatch ? ticketMatch[1] : originalTicket
  const startSuffix = ticketMatch ? parseInt(ticketMatch[2], 10) + 1 : 1

  for (let suffix = startSuffix; suffix < startSuffix + 200; suffix++) {
    const candidate = `${baseTicket}-${suffix}`
    if (!taken.has(candidate)) return candidate
  }

  return `${baseTicket}-${Date.now().toString().slice(-4)}`
}
