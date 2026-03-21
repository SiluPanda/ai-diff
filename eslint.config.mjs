import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser: (await import("typescript-eslint")).default.parser,
      parserOptions: {
        project: false,
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "off",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "*.config.*", "*.mjs"],
  },
];
