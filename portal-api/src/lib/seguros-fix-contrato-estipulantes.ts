/**
 * Corrige dados legados em que importações antigas criaram `PortalSeguroEstipulante` com
 * razão social `Contrato (…)` e apólices associadas ao estipulante errado.
 *
 * Regra: por **grupo económico** (chave normalizada), se existir **exactamente um**
 * estipulante cujo nome **não** é placeholder `Contrato (`, todas as apólices dos
 * placeholders desse grupo passam para esse estipulante; placeholders sem apólices são
 * apagados. Se já existir a mesma `numeroApolice` no destino, remove a linha duplicada
 * (mantém a que já estava no estipulante real).
 */
import { prisma } from './prisma.js'

const JUNK_RAZAO = /^\s*Contrato\s*\(/i

function normGrupoKey(s: string): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, '')
}

export type FixContratoEstipulantesResult = {
  dryRun: boolean
  gruposProcessados: number
  estipulantesRemovidos: number
  apolicesRealinhadas: number
  apolicesDuplicadasRemovidas: number
  gruposIgnorados: Array<{ grupoChave: string; grupoNome: string; motivo: string }>
  erros: string[]
}

export async function fixContratoPlaceholderEstipulantes(options?: {
  dryRun?: boolean
}): Promise<FixContratoEstipulantesResult> {
  const dryRun = options?.dryRun === true
  const result: FixContratoEstipulantesResult = {
    dryRun,
    gruposProcessados: 0,
    estipulantesRemovidos: 0,
    apolicesRealinhadas: 0,
    apolicesDuplicadasRemovidas: 0,
    gruposIgnorados: [],
    erros: [],
  }

  const todos = await prisma.portalSeguroEstipulante.findMany({
    select: {
      id: true,
      grupoEconomicoNome: true,
      razaoSocial: true,
      cnpj: true,
    },
  })

  const porGrupo = new Map<string, typeof todos>()
  for (const e of todos) {
    const k = normGrupoKey(e.grupoEconomicoNome)
    if (!k) continue
    const arr = porGrupo.get(k) ?? []
    arr.push(e)
    porGrupo.set(k, arr)
  }

  for (const [gk, membros] of porGrupo) {
    const junk = membros.filter((m) => JUNK_RAZAO.test(m.razaoSocial))
    if (junk.length === 0) continue

    const reais = membros.filter((m) => !JUNK_RAZAO.test(m.razaoSocial))
    if (reais.length === 0) {
      result.gruposIgnorados.push({
        grupoChave: gk,
        grupoNome: membros[0]?.grupoEconomicoNome ?? gk,
        motivo: 'Só existem estipulantes «Contrato (…)»; cadastre o estipulante real no portal antes.',
      })
      continue
    }
    if (reais.length > 1) {
      result.gruposIgnorados.push({
        grupoChave: gk,
        grupoNome: membros[0]?.grupoEconomicoNome ?? gk,
        motivo: `Há ${reais.length} estipulantes «reais» no grupo; não é possível escolher o destino automaticamente.`,
      })
      continue
    }

    const destino = reais[0]
    result.gruposProcessados++

    for (const j of junk) {
      try {
        if (dryRun) {
          const lista = await prisma.portalSeguroApolice.findMany({
            where: { estipulanteId: j.id },
            select: { id: true, numeroApolice: true },
          })
          for (const p of lista) {
            const dup = await prisma.portalSeguroApolice.findFirst({
              where: {
                estipulanteId: destino.id,
                numeroApolice: p.numeroApolice,
              },
            })
            if (dup) result.apolicesDuplicadasRemovidas++
            else result.apolicesRealinhadas++
          }
          result.estipulantesRemovidos++
          continue
        }

        await prisma.$transaction(async (tx) => {
          const policies = await tx.portalSeguroApolice.findMany({
            where: { estipulanteId: j.id },
            select: { id: true, numeroApolice: true },
          })

          for (const p of policies) {
            const dup = await tx.portalSeguroApolice.findFirst({
              where: {
                estipulanteId: destino.id,
                numeroApolice: p.numeroApolice,
              },
            })
            if (dup) {
              await tx.portalSeguroApolice.delete({ where: { id: p.id } })
              result.apolicesDuplicadasRemovidas++
            } else {
              await tx.portalSeguroApolice.update({
                where: { id: p.id },
                data: { estipulanteId: destino.id },
              })
              result.apolicesRealinhadas++
            }
          }

          const restantes = await tx.portalSeguroApolice.count({
            where: { estipulanteId: j.id },
          })
          if (restantes === 0) {
            await tx.portalSeguroEstipulante.delete({ where: { id: j.id } })
            result.estipulantesRemovidos++
          }
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        result.erros.push(`${j.razaoSocial.slice(0, 40)} (${j.id}): ${msg}`)
      }
    }
  }

  return result
}
