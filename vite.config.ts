import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'
  
  return {
    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
        imports: ['vue', 'pinia']
      }),
      Components({
        resolvers: [ElementPlusResolver()]
      }),
      ...(isLib ? [
        dts({
          include: ['src/**/*'],
          outDir: 'dist/types',
          staticImport: true,
          insertTypesEntry: true
        })
      ] : [])
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    build: isLib ? {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'YlySearchViewer',
        fileName: (format) => `yly-search-viewer.${format}.js`,
        formats: ['es', 'umd']
      },
      rollupOptions: {
        external: ['vue', 'element-plus'],
        output: {
          globals: {
            vue: 'Vue',
            'element-plus': 'ElementPlus'
          }
        }
      },
      cssCodeSplit: false
    } : {
      outDir: 'dist'
    }
  }
})