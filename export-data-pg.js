const { Client } = require('pg');

async function exportOldData() {
  console.log('📊 Iniciando exportação de dados do banco antigo...');
  
  try {
    // Conectar diretamente ao PostgreSQL
    const client = new Client({
      connectionString: 'postgresql://postgres:bmMmEyxMQtWnuUNpCHurVgavceYvAaeR@caboose.proxy.rlwy.net:14005/railway'
    });
    
    console.log('🔌 Tentando conectar ao banco antigo...');
    await client.connect();
    console.log('✅ Conectado ao banco antigo!');
    
    // Listar todas as tabelas
    console.log('📋 Listando tabelas...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows;
    console.log(`📊 Encontradas ${tables.length} tabelas:`);
    tables.forEach(table => console.log(`  - ${table.table_name}`));
    
    // Exportar dados de cada tabela
    const exportedData = {};
    let totalRecords = 0;
    
    for (const table of tables) {
      try {
        const tableName = table.table_name;
        console.log(`📤 Exportando tabela: ${tableName}`);
        
        const dataResult = await client.query(`SELECT * FROM "${tableName}"`);
        const data = dataResult.rows;
        const recordCount = data.length;
        
        exportedData[tableName] = data;
        totalRecords += recordCount;
        
        console.log(`  ✅ ${recordCount} registros exportados`);
        
      } catch (tableError) {
        console.log(`  ❌ Erro ao exportar ${table.table_name}: ${tableError.message}`);
        exportedData[table.table_name] = { error: tableError.message };
      }
    }
    
    await client.end();
    
    // Salvar dados em arquivo
    const fs = require('fs');
    const exportFile = `exported-data-${new Date().toISOString().split('T')[0]}.json`;
    
    fs.writeFileSync(exportFile, JSON.stringify({
      exportDate: new Date().toISOString(),
      totalTables: tables.length,
      totalRecords: totalRecords,
      tables: tables.map(t => t.table_name),
      data: exportedData
    }, null, 2));
    
    console.log('\n🎉 Exportação concluída!');
    console.log(`📊 Total de tabelas: ${tables.length}`);
    console.log(`📊 Total de registros: ${totalRecords}`);
    console.log(`💾 Dados salvos em: ${exportFile}`);
    
    return {
      success: true,
      totalTables: tables.length,
      totalRecords: totalRecords,
      file: exportFile
    };
    
  } catch (error) {
    console.error('❌ Erro na exportação:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Executar exportação
exportOldData()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Exportação bem-sucedida!');
      process.exit(0);
    } else {
      console.log('\n❌ Falha na exportação!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });
