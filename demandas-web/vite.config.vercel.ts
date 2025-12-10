import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
        // Force new hash generation - v0.6.3 (fix cache antigo e 404 login - force rebuild)
        entryFileNames: `assets/[name]-[hash]-v0636.js`,
        chunkFileNames: `assets/[name]-[hash]-v0636.js`,
        assetFileNames: (assetInfo) => {
          // Garantir que CSS e outros assets usem o mesmo padrão de hash
          // Arquivos da pasta public NÃO passam por aqui - são copiados diretamente
          const ext = assetInfo.name?.split('.').pop() || 'ext'
          if (ext === 'css') {
            return `assets/[name]-[hash]-v0636.css`
          }
          return `assets/[name]-[hash]-v0636.[ext]`
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
