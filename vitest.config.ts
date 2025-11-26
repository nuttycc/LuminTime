import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    // 设置为 'node' 环境，因为你的函数是纯 JS 逻辑，不需要浏览器环境
    environment: "node",

    // 全局注入 test、expect、describe 等 API，无需 import
    globals: true,

    // 测试文件匹配规则
    include: ["tests/**/*.{test,spec}.{ts,js}"],

    // 清理和恢复 mock
    clearMocks: true,
    restoreMocks: true,
  },
});
