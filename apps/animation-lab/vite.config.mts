/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

const apiTarget = process.env.ANIMATION_LAB_API_TARGET ?? 'http://localhost:3000';
const apiProxy = {
  '/api': {
    target: apiTarget,
    changeOrigin: true,
  },
};

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/animation-lab',
  server: {
    port: 4300,
    host: 'localhost',
    strictPort: true,
    proxy: apiProxy,
  },
  preview: {
    port: 4300,
    host: 'localhost',
    strictPort: true,
    proxy: apiProxy,
  },
  plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  // Uncomment this if you are using workers.
  // worker: {
  //   plugins: () => [ nxViteTsPaths() ],
  // },
  build: {
    outDir: '../../dist/apps/animation-lab',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'animation-lab',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/animation-lab',
      provider: 'v8' as const,
    },
  },
}));
