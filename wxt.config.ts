import tailwindcss from '@tailwindcss/vite'
import ui from '@nuxt/ui/vite'
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: './src',
  modules: ['@wxt-dev/module-vue'],
  webExt: {
    disabled: true
  },
  manifest: {
    permissions: ['webNavigation', 'idle', 'alarms']
  },
  vite: () =>({
    plugins: [
      // oxlint-disable-next-line new-cap
      tailwindcss(),
      ui()
    ]
  })
});
 