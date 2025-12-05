import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "./src",
  modules: ["@wxt-dev/module-vue"],
  webExt: {
    disabled: true,
  },
  manifest: {
    name: "Lumin Time",
    permissions: ["tabs", "storage", "webNavigation", "idle", "alarms"],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
