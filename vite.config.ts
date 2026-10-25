import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs make the built bundle self-hosting: it runs from the
  // repository's dist folder directly (file:// previews and recordings) and
  // under any subdirectory, instead of only from a server root.
  base: './',
  build: {
    outDir: 'dist',
  },
})