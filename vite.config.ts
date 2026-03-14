import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    plugins: ["import", "typescript", "unicorn", "vue"],
    categories: {
      correctness: "error",
      pedantic: "off",
      suspicious: "off",
      style: "off",
      perf: "warn",
    },
    env: {
      browser: true,
    },
    globals: {},
    settings: {},
    rules: {
      eqeqeq: "warn",
      "import/no-cycle": "error",
      "import/no-unassigned-import": "off",
      "unicorn/filename-case": "off",
      "sort-keys": "off",
      "new-cap": "off",
      "func-style": "off",
      "max-lines-per-function": [
        "off",
        {
          max: 70,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],
    },
    overrides: [
      {
        files: ["*.test.ts", "*.spec.ts"],
        rules: {
          "@typescript-eslint/no-explicit-any": "off",
          "max-lines-per-function": "off",
        },
      },
      {
        files: ["src/entrypoints/**/*.ts", "src/entrypoints/**/*.vue"],
        rules: {
          "import/no-unassigned-import": "off",
        },
      },
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
