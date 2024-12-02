import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';

export default [
	{
		ignores: ['build/', '.prettierrc.js', '**/.eslintrc.js', 'dist/**', 'node_modules/**'], // Replace with your ignore patterns
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				ecmaFeatures: {
					jsx: true,
				},
				project: './tsconfig.json', // Adjust this to match your tsconfig location
			},
		},
		plugins: {
			'@typescript-eslint': typescriptEslintPlugin,
		},
		rules: {
			// Add your rules here
		},
	},
];
