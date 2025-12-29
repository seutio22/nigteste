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
        try {
          // Garantir que o logo seja copiado após o build
          const logoPath = join(process.cwd(), 'public', 'dynamic-logo.png')
          const distPath = join(process.cwd(), 'dist', 'dynamic-logo.png')
          
          // Verificar se o arquivo fonte existe E se é um arquivo (não diretório)
          if (existsSync(logoPath)) {
            try {
              // Garantir que o diretório dist existe
              const distDir = dirname(distPath)
              if (!existsSync(distDir)) {
                mkdirSync(distDir, { recursive: true })
              }
              
              // Tentar copiar apenas se o arquivo fonte realmente existir
              copyFileSync(logoPath, distPath)
              console.log('✅ Logo copiado para dist/')
            } catch (copyError: any) {
              // Se o erro for ENOENT, o arquivo não existe mesmo após existsSync retornar true
              // Isso pode acontecer em ambientes de build onde o arquivo é temporário
              if (copyError.code === 'ENOENT') {
                console.warn('⚠️ Logo não encontrado durante cópia (arquivo pode ter sido removido) - continuando build')
              } else {
                console.warn('⚠️ Erro ao copiar logo (não crítico):', copyError.message)
              }
            }
          } else {
            console.warn('⚠️ Logo não encontrado em public/dynamic-logo.png - continuando build sem logo')
          }
        } catch (error: any) {
          console.warn('⚠️ Erro ao processar logo (não crítico):', error?.message || error)
          // Não falhar o build se o logo não puder ser copiado
        }
        
        try {
          // Garantir que _redirects seja copiado também
          const redirectsPath = join(process.cwd(), 'public', '_redirects')
          const redirectsDistPath = join(process.cwd(), 'dist', '_redirects')
          
          if (existsSync(redirectsPath)) {
            try {
              // Garantir que o diretório dist existe
              const distDir = dirname(redirectsDistPath)
              if (!existsSync(distDir)) {
                mkdirSync(distDir, { recursive: true })
              }
              
              copyFileSync(redirectsPath, redirectsDistPath)
              console.log('✅ _redirects copiado para dist/')
            } catch (copyError: any) {
              if (copyError.code === 'ENOENT') {
                console.warn('⚠️ _redirects não encontrado durante cópia - continuando build')
              } else {
                console.warn('⚠️ Erro ao copiar _redirects (não crítico):', copyError.message)
              }
            }
          } else {
            console.warn('⚠️ _redirects não encontrado em public/_redirects')
          }
        } catch (error: any) {
          console.warn('⚠️ Erro ao processar _redirects (não crítico):', error?.message || error)
          // Não falhar o build se _redirects não puder ser copiado
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
