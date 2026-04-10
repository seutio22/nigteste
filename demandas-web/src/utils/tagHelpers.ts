/** Converte texto do formulário (CSV) em lista de tags para o Kanban/API. */
export function tagsFromFormCsv(csv: string): string[] {
  return (csv ?? '').split(',').map((t) => t.trim()).filter(Boolean)
}

/** A API do Kanban grava `tags` como string (ex.: CSV); não enviar array no JSON. */
export function tagsForApi(csv: string): string {
  return tagsFromFormCsv(csv).join(', ')
}
