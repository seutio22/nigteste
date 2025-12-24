#!/usr/bin/env node

/**
 * Script para verificar formato das datas em um projeto específico
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkProjectDates(projectId) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        timeline: true
      }
    })
    
    if (!project) {
      console.log('❌ Projeto não encontrado')
      return
    }
    
    console.log(`\n📋 Projeto: ${project.name} (${project.id})\n`)
    
    let timeline
    if (typeof project.timeline === 'string') {
      timeline = JSON.parse(project.timeline)
    } else {
      timeline = project.timeline
    }
    
    if (!timeline || !timeline.phases) {
      console.log('⚠️ Timeline sem fases')
      return
    }
    
    timeline.phases.forEach((phase, phaseIdx) => {
      console.log(`\n📁 Fase ${phaseIdx + 1}: ${phase.name || phase.id}`)
      console.log(`   startDate: ${phase.startDate} (tipo: ${typeof phase.startDate})`)
      console.log(`   endDate: ${phase.endDate} (tipo: ${typeof phase.endDate})`)
      
      if (phase.tasks && Array.isArray(phase.tasks)) {
        phase.tasks.forEach((task, taskIdx) => {
          console.log(`\n   📝 Tarefa ${taskIdx + 1}: ${task.name || task.title || task.id}`)
          console.log(`      startDate: ${task.startDate} (tipo: ${typeof task.startDate})`)
          console.log(`      plannedEndDate: ${task.plannedEndDate} (tipo: ${typeof task.plannedEndDate})`)
          console.log(`      actualEndDate: ${task.actualEndDate} (tipo: ${typeof task.actualEndDate})`)
          
          if (task.subtasks && Array.isArray(task.subtasks)) {
            task.subtasks.forEach((subtask, subIdx) => {
              console.log(`\n      🔹 Subtarefa ${subIdx + 1}: ${subtask.title || subtask.name || subtask.id}`)
              console.log(`         startDate: ${subtask.startDate} (tipo: ${typeof subtask.startDate})`)
              console.log(`         dueDate: ${subtask.dueDate} (tipo: ${typeof subtask.dueDate})`)
              console.log(`         actualEndDate: ${subtask.actualEndDate} (tipo: ${typeof subtask.actualEndDate})`)
            })
          }
        })
      }
    })
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

const projectId = process.argv[2] || '209d3594-bd5a-42f0-ab30-a37f991cdbce'
checkProjectDates(projectId)


