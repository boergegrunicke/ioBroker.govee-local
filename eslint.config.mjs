// ESLint 9+ Konfiguration für ioBroker-Adapter
import config, { reactConfig } from '@iobroker/eslint-config';

export default [
    ...config,
    // React rules only for the admin UI
    ...reactConfig.map(c => ({ ...c, files: ['admin/src/**/*.{ts,tsx}'] })),
    {
        ignores: ['build/', 'admin/build/', '**/.eslintrc.js'],
    },
    {
        rules: {
            // Prettier formatiert JSDoc anders als diese Regel es erwartet
            'jsdoc/tag-lines': ['error', 'any', { startLines: 1 }],
        },
    },
];
