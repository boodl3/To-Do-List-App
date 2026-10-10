import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const host = process.env.TAURI_DEV_HOST;

// Dev only: serve tests/fixtures/*.json at /fixtures/* so the fake platform can load `?fixture=name`.
function fixtures(): Plugin {
  return {
    name: 'focusboard-fixtures',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/fixtures/', (req, res, next) => {
        const name = (req.url ?? '').replace(/^\//, '').split('?')[0] ?? '';
        if (!/^[\w-]+\.json$/.test(name)) return next();
        readFile(resolve('tests/fixtures', name))
          .then((body) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(body);
          })
          .catch(() => next());
      });
    },
  };
}

export default defineConfig(() => ({
  plugins: [react(), fixtures()],
  // Tauri: keep Rust errors visible, fixed port, don't watch src-tauri.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
}));
