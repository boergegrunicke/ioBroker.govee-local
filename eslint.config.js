export default [
	{
		ignores: ['build/', '.prettierrc.js', '**/.eslintrc.js', 'dist/**', 'node_modules/**'], // Replace with your ignore patterns
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parser: '@typescript-eslint/parser',
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				ecmaFeatures: {
					jsx: true,
				},
				project: './tsconfig.json',
			},
		},
		plugins: {
			'@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
		},
		rules: {
			// Your ESLint rules here
		},
	},
];
1;
