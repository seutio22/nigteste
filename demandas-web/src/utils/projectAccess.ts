/**
 * Projeto «vinculado» ao utilizador: dono, gestor, membro formal ou lista `team`.
 * Alinha com a lista da API (flags isOwner / isManager / isMember).
 */
export function parseProjectTeamIds(team: unknown): string[] {
  if (Array.isArray(team)) return team.map((x) => String(x))
  if (typeof team === 'string') {
    try {
      const o = JSON.parse(team)
      return Array.isArray(o) ? o.map((x: unknown) => String(x)) : []
    } catch {
      return []
    }
  }
  return []
}

export function isProjectLinkedToUser(
  project: {
    ownerId?: string | null
    managerId?: string | null
    manager?: string
    team?: unknown
    isOwner?: boolean
    isManager?: boolean
    isMember?: boolean
  },
  userId: string | undefined | null
): boolean {
  if (!userId) return false
  if (project.ownerId === userId || project.managerId === userId) return true
  if (project.manager === userId) return true
  if (project.isOwner === true || project.isManager === true || project.isMember === true) return true
  const teamIds = parseProjectTeamIds(project.team)
  return teamIds.includes(userId)
}
