#!/usr/bin/env node

/**
 * Script para corrigir problemas de timezone nas datas dos projetos
 * 
 * PROBLEMA: Datas salvas com timezone podem aparecer com dia diferente ao editar
 * SOLUÇÃO: Normalizar todas as datas para formato YYYY-MM-DD sem timezone
 * 
 * Uso: node fix-project-dates-timezone.js
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Função para corrigir uma data (remove problemas de timezone)
// FORÇA todas as datas para formato YYYY-MM-DD sem timezone
function fixDate(dateString) {
  if (!dateString || dateString === 'null' || dateString === '') return null
  
  try {
    // Se já está no formato YYYY-MM-DD, retorna diretamente
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    
    // Se tem hora (formato ISO), extrai apenas a parte da data ANTES do T
    // Isso evita problemas de timezone
    if (typeof dateString === 'string' && dateString.includes('T')) {
      const datePart = dateString.split('T')[0]
      // Validar se é uma data válida
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return datePart
      }
    }
    
    // Para outros formatos, usa Date mas extrai apenas a data local
    // IMPORTANTE: Usa getFullYear, getMonth, getDate que são métodos locais
    // e não fazem conversão de timezone
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null
    
    // Usa métodos locais para evitar conversão de timezone
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (error) {
    console.error('❌ Erro ao corrigir data:', dateString, error)
    return null
  }
}

// Função para corrigir datas em uma subtarefa
function fixSubtaskDates(subtask) {
  const fixed = { ...subtask }
  
  if (subtask.startDate) {
    const fixedDate = fixDate(subtask.startDate)
    if (fixedDate) {
      if (fixedDate !== subtask.startDate) {
        console.log(`  📅 Subtarefa ${subtask.id || subtask.title}: startDate ${subtask.startDate} -> ${fixedDate}`)
      }
      fixed.startDate = fixedDate
    } else {
      fixed.startDate = null
    }
  }
  
  if (subtask.dueDate) {
    const fixedDate = fixDate(subtask.dueDate)
    if (fixedDate) {
      if (fixedDate !== subtask.dueDate) {
        console.log(`  📅 Subtarefa ${subtask.id || subtask.title}: dueDate ${subtask.dueDate} -> ${fixedDate}`)
      }
      fixed.dueDate = fixedDate
    } else {
      fixed.dueDate = null
    }
  }
  
  if (subtask.actualEndDate) {
    const fixedDate = fixDate(subtask.actualEndDate)
    if (fixedDate) {
      if (fixedDate !== subtask.actualEndDate) {
        console.log(`  📅 Subtarefa ${subtask.id || subtask.title}: actualEndDate ${subtask.actualEndDate} -> ${fixedDate}`)
      }
      fixed.actualEndDate = fixedDate
    } else {
      fixed.actualEndDate = null
    }
  }
  
  return fixed
}

// Função para corrigir datas em uma tarefa
function fixTaskDates(task) {
  const fixed = { ...task }
  
  if (task.startDate) {
    const fixedDate = fixDate(task.startDate)
    if (fixedDate) {
      if (fixedDate !== task.startDate) {
        console.log(`  📅 Tarefa ${task.id || task.name}: startDate ${task.startDate} -> ${fixedDate}`)
      }
      fixed.startDate = fixedDate
    } else {
      fixed.startDate = null
    }
  }
  
  if (task.plannedEndDate) {
    const fixedDate = fixDate(task.plannedEndDate)
    if (fixedDate) {
      if (fixedDate !== task.plannedEndDate) {
        console.log(`  📅 Tarefa ${task.id || task.name}: plannedEndDate ${task.plannedEndDate} -> ${fixedDate}`)
      }
      fixed.plannedEndDate = fixedDate
    } else {
      fixed.plannedEndDate = null
    }
  }
  
  if (task.actualEndDate) {
    const fixedDate = fixDate(task.actualEndDate)
    if (fixedDate) {
      if (fixedDate !== task.actualEndDate) {
        console.log(`  📅 Tarefa ${task.id || task.name}: actualEndDate ${task.actualEndDate} -> ${fixedDate}`)
      }
      fixed.actualEndDate = fixedDate
    } else {
      fixed.actualEndDate = null
    }
  }
  
  // Corrigir subtarefas
  if (task.subtasks && Array.isArray(task.subtasks)) {
    fixed.subtasks = task.subtasks.map(fixSubtaskDates)
  }
  
  return fixed
}

// Função para corrigir datas em uma fase
function fixPhaseDates(phase) {
  const fixed = { ...phase }
  
  if (phase.startDate) {
    const fixedDate = fixDate(phase.startDate)
    if (fixedDate) {
      if (fixedDate !== phase.startDate) {
        console.log(`  📅 Fase ${phase.id || phase.name}: startDate ${phase.startDate} -> ${fixedDate}`)
      }
      fixed.startDate = fixedDate
    } else {
      fixed.startDate = null
    }
  }
  
  if (phase.endDate) {
    const fixedDate = fixDate(phase.endDate)
    if (fixedDate) {
      if (fixedDate !== phase.endDate) {
        console.log(`  📅 Fase ${phase.id || phase.name}: endDate ${phase.endDate} -> ${fixedDate}`)
      }
      fixed.endDate = fixedDate
    } else {
      fixed.endDate = null
    }
  }
  
  // Corrigir tarefas
  if (phase.tasks && Array.isArray(phase.tasks)) {
    fixed.tasks = phase.tasks.map(fixTaskDates)
  }
  
  return fixed
}

// Função principal
async function fixAllProjectDates() {
  console.log('🚀 Iniciando correção de datas dos projetos...')
  console.log('📅 Corrigindo problemas de timezone nas datas\n')
  
  try {
    // Buscar todos os projetos
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        timeline: true
      }
    })
    
    console.log(`📊 Encontrados ${projects.length} projetos para verificar\n`)
    
    let totalFixed = 0
    let projectsFixed = 0
    
    for (const project of projects) {
      if (!project.timeline) {
        console.log(`⏭️  Projeto ${project.name} (${project.id}): Sem timeline, pulando...`)
        continue
      }
      
      let timeline
      try {
        // Parsear timeline se for string
        if (typeof project.timeline === 'string') {
          timeline = JSON.parse(project.timeline)
        } else {
          timeline = project.timeline
        }
      } catch (error) {
        console.error(`❌ Erro ao parsear timeline do projeto ${project.name}:`, error)
        continue
      }
      
      if (!timeline || !timeline.phases || !Array.isArray(timeline.phases)) {
        console.log(`⏭️  Projeto ${project.name} (${project.id}): Timeline sem fases, pulando...`)
        continue
      }
      
      console.log(`\n🔍 Verificando projeto: ${project.name} (${project.id})`)
      
      let projectChanged = false
      let datesFixed = 0
      
      const fixedPhases = timeline.phases.map((phase) => {
        const originalPhase = JSON.stringify(phase)
        const fixedPhase = fixPhaseDates(phase)
        const fixedPhaseStr = JSON.stringify(fixedPhase)
        
        if (originalPhase !== fixedPhaseStr) {
          projectChanged = true
          // Contar quantas datas foram corrigidas
          const originalDates = JSON.stringify(phase).match(/"(startDate|endDate|dueDate|plannedEndDate|actualEndDate)":"[^"]*"/g) || []
          const fixedDates = fixedPhaseStr.match(/"(startDate|endDate|dueDate|plannedEndDate|actualEndDate)":"[^"]*"/g) || []
          datesFixed += originalDates.filter((d, i) => d !== fixedDates[i]).length
        }
        return fixedPhase
      })
      
      if (projectChanged) {
        const fixedTimeline = { ...timeline, phases: fixedPhases }
        
        // Salvar no banco
        await prisma.project.update({
          where: { id: project.id },
          data: {
            timeline: JSON.stringify(fixedTimeline)
          }
        })
        
        projectsFixed++
        totalFixed += datesFixed
        console.log(`✅ Projeto ${project.name}: ${datesFixed} data(s) corrigida(s) e salva(s)!`)
      } else {
        console.log(`✓ Projeto ${project.name}: Nenhuma data precisa de correção`)
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMO DA CORREÇÃO:')
    console.log(`   Total de projetos verificados: ${projects.length}`)
    console.log(`   Projetos corrigidos: ${projectsFixed}`)
    console.log(`   Total de correções: ${totalFixed}`)
    console.log('='.repeat(60))
    console.log('\n✅ Correção de datas concluída com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro ao corrigir datas:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
if (require.main === module) {
  fixAllProjectDates()
    .then(() => {
      console.log('\n🎉 Script executado com sucesso!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Erro ao executar script:', error)
      process.exit(1)
    })
}

module.exports = { fixAllProjectDates, fixDate, fixSubtaskDates, fixTaskDates, fixPhaseDates }

