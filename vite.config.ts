import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The site is served from https://<user>.github.io/vancobiz-club-app/
export default defineConfig({
  base: '/vancobiz-club-app/',
  plugins: [react()],
})
