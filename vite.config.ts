import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // 本番はnginxの /weather/ 配下で配信するためビルド時だけbaseを付ける。
  // `vite`(開発サーバー)はそのままlocalhost:5173直下で使えるように/のまま。
  base: command === 'build' ? '/weather/' : '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
}));
