import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The backend allows exactly this origin in CORS, so keep the port fixed.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
})
