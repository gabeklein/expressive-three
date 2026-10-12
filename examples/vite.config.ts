import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import hot from '@expressive/dom/vite';

export default defineConfig({
  plugins: [hot()],
  esbuild: { jsx: 'automatic', jsxImportSource: '@expressive/dom' },
  resolve: {
    alias: { '@expressive/three': fileURLToPath(new URL('../src/index.ts', import.meta.url)) }
  }
});
