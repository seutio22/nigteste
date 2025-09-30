const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProjects() {
  try {
    console.log('🔍 Verificando todos os projetos...');
    
    const projects = await prisma.project.findMany({
      include: {
        timelines: true
      }
    });
    
    console.log(`\n📋 Total de projetos: ${projects.length}`);
    
    projects.forEach((project, index) => {
      console.log(`\n${index + 1}. ${project.name} (ID: ${project.id})`);
      console.log(`   Timelines: ${project.timelines.length}`);
      if (project.timelines.length > 0) {
        project.timelines.forEach((timeline, tIndex) => {
          console.log(`   Timeline ${tIndex + 1}: ${timeline.phases ? 'Com fases' : 'Sem fases'}`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProjects();
