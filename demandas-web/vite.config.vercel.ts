import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-logo',
      closeBundle() {
        // Copiar logo - não crítico se falhar
        try {
          const logoPath = join(process.cwd(), 'public', 'dynamic-logo.png')
          const distPath = join(process.cwd(), 'dist', 'dynamic-logo.png')
          
          if (existsSync(logoPath)) {
            const distDir = dirname(distPath)
            if (!existsSync(distDir)) {
              mkdirSync(distDir, { recursive: true })
            }
            copyFileSync(logoPath, distPath)
            console.log('✅ Logo copiado para dist/')
          }
        } catch (error: any) {
          // Ignorar erro silenciosamente - o Vite já copia arquivos da pasta public automaticamente
          if (process.env.VERCEL) {
            // No Vercel, apenas logar se necessário
            console.log('ℹ️ Logo não copiado (será copiado automaticamente pelo Vite)')
          }
        }
        
        // Copiar _redirects - não crítico se falhar
        try {
          const redirectsPath = join(process.cwd(), 'public', '_redirects')
          const redirectsDistPath = join(process.cwd(), 'dist', '_redirects')
          
          if (existsSync(redirectsPath)) {
            const distDir = dirname(redirectsDistPath)
            if (!existsSync(distDir)) {
              mkdirSync(distDir, { recursive: true })
            }
            copyFileSync(redirectsPath, redirectsDistPath)
            console.log('✅ _redirects copiado para dist/')
          }
        } catch (error: any) {
          // Ignorar erro silenciosamente - o Vite já copia arquivos da pasta public automaticamente
          if (process.env.VERCEL) {
            console.log('ℹ️ _redirects não copiado (será copiado automaticamente pelo Vite)')
          }
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
        // Force new hash generation - v0.7.0 (fix cache antigo e 404 login - force rebuild)
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
