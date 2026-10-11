import { resolve } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

const { version } = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));

// Stable for identical product content, different for a same-version repack.
const buildHash=createHash('sha256');
function fingerprint(directory:string) {
  for(const entry of readdirSync(resolve(__dirname,directory),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    const file=directory+'/'+entry.name;
    if(entry.isDirectory())fingerprint(file);
    else if(!file.includes('.test.'))buildHash.update(file).update(readFileSync(resolve(__dirname,file)));
  }
}
for(const directory of ['src','designer','public'])fingerprint(directory);
buildHash.update(readFileSync(resolve(__dirname,'package-lock.json')));
const buildId=version+':'+buildHash.digest('hex').slice(0,20);

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    define: { __LOADERLY_VERSION__: JSON.stringify(version), __LOADERLY_BUILD__: JSON.stringify(buildId) },
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
