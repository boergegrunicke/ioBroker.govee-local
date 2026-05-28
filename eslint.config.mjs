// ESLint 9+ Konfiguration für ioBroker-Adapter
import config from "@iobroker/eslint-config";

export default [
  ...config,
  {
    ignores: ["build/", "**/.eslintrc.js"],
  },
  {
    rules: {
      // Prettier formatiert JSDoc anders als diese Regel es erwartet
      "jsdoc/tag-lines": ["error", "any", { startLines: 1 }],
    },
  },
];
