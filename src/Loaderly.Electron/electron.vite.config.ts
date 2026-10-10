import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

const { version } = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    define: { __LOADERLY_VERSION__: JSON.stringify(version) },
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'index.cjs',
          format: 'cjs'
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname),
    build: {
      rollupOptions: {
        input: {index:resolve(__dirname, 'index.html'),visualizer:resolve(__dirname,'visualizer.html')},
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react/jsx-runtime'],
            'ui-icons': ['lucide-react']
          }
        }
      }
    },
    plugins: [react()]
  }
});
