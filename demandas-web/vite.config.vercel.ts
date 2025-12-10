import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Force new hash generation - v0.6.3 (fix cache antigo e 404 login - force rebuild)
        entryFileNames: `assets/[name]-[hash]-v0635.js`,
        chunkFileNames: `assets/[name]-[hash]-v0635.js`,
        assetFileNames: (assetInfo) => {
          // Garantir que CSS e outros assets usem o mesmo padrão de hash
          const ext = assetInfo.name?.split('.').pop() || 'ext'
          if (ext === 'css') {
            return `assets/[name]-[hash]-v0635.css`
          }
          return `assets/[name]-[hash]-v0635.[ext]`
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
