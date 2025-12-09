import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "./src",
  modules: ["@wxt-dev/module-vue", "@wxt-dev/auto-icons"],
  webExt: {
    disabled: true,
  },
  manifest: {
    name: "Lumin Time",
    homepage_url: "https://github.com/nuttycc/LuminTime",
    permissions: ["tabs", "storage", "webNavigation", "idle", "alarms"],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
