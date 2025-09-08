import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        pagemain: resolve(__dirname, 'src/page-main/index.js'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'pagemain' ? 'page-main.js' : 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
})
