// vite.config.js
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';

// Nếu manifest ở public/:
import manifest from './manifest.json' with { type: 'json' };

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    // không xóa dist mỗi lần (tùy thích)
    emptyOutDir: false,
    rollupOptions: {
      input: {
        // CRXJS sẽ tự đọc từ manifest; khai báo input thủ công chỉ khi bạn có pages khác
        'page-main': 'src/page-main/index.js'
      }
    }
  }
});
