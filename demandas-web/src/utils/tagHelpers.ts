/** Converte texto do formulário (CSV) em lista de tags para o Kanban/API. */
export function tagsFromFormCsv(csv: string): string[] {
  return (csv ?? '').split(',').map((t) => t.trim()).filter(Boolean)
}
