import { defineConfig } from "unocss";
import { presetIcons } from "@unocss/preset-icons";
import { presetWind4 } from "@unocss/preset-wind4";

export default defineConfig({
  presets: [
    presetWind4(),
    presetIcons(),
  ],
});
