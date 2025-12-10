import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { copyFileSync, existsSync } from 'fs'
import { join } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-logo',
      closeBundle() {
        // Garantir que o logo seja copiado após o build
        const logoPath = join(process.cwd(), 'public', 'dynamic-logo.png')
        const distPath = join(process.cwd(), 'dist', 'dynamic-logo.png')
        if (existsSync(logoPath)) {
          // Sempre copiar, mesmo se já existir, para garantir que está atualizado
          copyFileSync(logoPath, distPath)
          console.log('✅ Logo copiado para dist/')
        } else {
          console.warn('⚠️ Logo não encontrado em public/dynamic-logo.png')
        }
        
        // Garantir que _redirects seja copiado também
        const redirectsPath = join(process.cwd(), 'public', '_redirects')
        const redirectsDistPath = join(process.cwd(), 'dist', '_redirects')
        if (existsSync(redirectsPath)) {
          copyFileSync(redirectsPath, redirectsDistPath)
          console.log('✅ _redirects copiado para dist/')
        } else {
          console.warn('⚠️ _redirects não encontrado em public/_redirects')
        }
      }
    }
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
