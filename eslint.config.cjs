const tsEslintPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  {
    // global ignores and shared settings
    ignores: [      
      "**/node_modules/**",      
      "**/dist/**/*",
      "**/coverage/**",
      "**/.tsbuildinfo",
      "**/packages/**",
    ],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": tsEslintPlugin,
    },
    rules: {
      // Shared recommended rule adjustments
      "no-console": "warn",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
];
