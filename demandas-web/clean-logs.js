const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/Projetos/Detail.tsx');

// Ler o arquivo
let content = fs.readFileSync(filePath, 'utf8');

// Remover linhas que contêm console.log com emojis de debug
const debugPatterns = [
  /^\s*console\.(log|error|warn|info|debug)\([^)]*🔍[^)]*\);\s*$/gm,
  /^\s*console\.(log|error|warn|info|debug)\([^)]*✅[^)]*\);\s*$/gm,
  /^\s*console\.(log|error|warn|info|debug)\([^)]*❌[^)]*\);\s*$/gm,
  /^\s*console\.(log|error|warn|info|debug)\([^)]*⚠️[^)]*\);\s*$/gm,
  /^\s*console\.(log|error|warn|info|debug)\([^)]*💾[^)]*\);\s*$/gm,
  /^\s*console\.(log|error|warn|info|debug)\([^)]*📊[^)]*\);\s*$/gm,
  /^\s*console\.(log|error|warn|info|debug)\([^)]*🔄[^)]*\);\s*$/gm,
  /^\s*console\.(log|error|warn|info|debug)\([^)]*🎯[^)]*\);\s*$/gm,
  /^\s*console\.(log|error|warn|info|debug)\([^)]*📝[^)]*\);\s*$/gm,
  /^\s*console\.(log|error|warn|info|debug)\([^)]*🧹[^)]*\);\s*$/gm,
  /^\s*console\.(log|error|warn|info|debug)\([^)]*🚀[^)]*\);\s*$/gm,
  /^\s*console\.(log|error|warn|info|debug)\([^)]*💡[^)]*\);\s*$/gm,
  /^\s*console\.(log|error|warn|info|debug)\([^)]*🚨[^)]*\);\s*$/gm
];

// Aplicar cada padrão
debugPatterns.forEach(pattern => {
  content = content.replace(pattern, '');
});

// Remover linhas vazias extras
content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

// Escrever o arquivo de volta
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Logs de debug removidos com sucesso!');
