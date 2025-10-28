import UnoCSS from 'unocss/vite'
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: './src',
  modules: ['@wxt-dev/module-vue'],
  webExt: {
    disabled: true
  },
  vite: () =>({
    plugins: [
      // oxlint-disable-next-line new-cap
      UnoCSS()
    ]
  })
});
 