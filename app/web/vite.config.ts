import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // 同じ Wi-Fi のスマホからも開けるようにする
    proxy: { '/api': 'http://localhost:3001' },
  },
});
