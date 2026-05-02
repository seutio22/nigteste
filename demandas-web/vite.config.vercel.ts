import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react()
    // Removido plugin de cópia manual - o Vite já copia automaticamente arquivos da pasta public
    // quando copyPublicDir: true está configurado (linha 86)
  ],
  base: '/',
  publicDir: 'public', // Garantir que a pasta public seja copiada
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    cssCodeSplit: true,
    copyPublicDir: true, // Garantir que arquivos públicos sejam copiados
    rollupOptions: {
      output: {
        // Force new hash generation - v0.8.5 (alinha versão com package.json / UI)
        entryFileNames: `assets/[name]-[hash]-v0637.js`,
        chunkFileNames: `assets/[name]-[hash]-v0637.js`,
        assetFileNames: (assetInfo) => {
          // Garantir que CSS e outros assets usem o mesmo padrão de hash
          // Arquivos da pasta public NÃO passam por aqui - são copiados diretamente
          const ext = assetInfo.name?.split('.').pop() || 'ext'
          if (ext === 'css') {
            return `assets/[name]-[hash]-v0637.css`
          }
          return `assets/[name]-[hash]-v0637.[ext]`
        },
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom'],
          utils: ['zustand', 'framer-motion']
        }
      }
    }
  }
})
