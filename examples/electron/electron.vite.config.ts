import { defineConfig } from 'electron-vite'
import { resolve } from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@ridit/editor-services/node': resolve(
          __dirname,
          '../../packages/services/src/exports/node.ts'
        ),
        '@ridit/editor-services': resolve(__dirname, '../../packages/services/src/index.ts')
      }
    },
    build: {
      externalizeDeps: false,
      rollupOptions: {
        external: ['electron', /^node:/, 'utf-8-validate', 'bufferutil']
      }
    }
  },
  preload: {
    resolve: {
      alias: {
        '@ridit/editor-services/node': resolve(
          __dirname,
          '../../packages/services/src/exports/node.ts'
        ),
        '@ridit/editor-services/preload': resolve(
          __dirname,
          '../../packages/services/src/exports/preload.ts'
        ),
        '@ridit/editor-services': resolve(__dirname, '../../packages/services/src/index.ts')
      }
    },
    build: {
      externalizeDeps: false,
      rollupOptions: {
        external: ['electron', /^node:/]
      }
    }
  },
  renderer: {
    assetsInclude: ['**/*.ttf'],
    resolve: {
      alias: {
        '@ridit/editor-services/browser': resolve(
          __dirname,
          '../../packages/services/src/exports/browser.ts'
        ),
        '@ridit/editor-services/renderer': resolve(
          __dirname,
          '../../packages/services/src/exports/renderer.ts'
        ),
        '@ridit/editor-services/workbench': resolve(
          __dirname,
          '../../packages/services/src/exports/workbench.ts'
        ),
        '@ridit/editor-services': resolve(__dirname, '../../packages/services/src/index.ts'),
        '@ridit/editor-ui/static-css': resolve(__dirname, '../../packages/ui/src/static-css'),
        '@ridit/editor-ui': resolve(__dirname, '../../packages/ui/src/index.ts')
      }
    }
  }
})
