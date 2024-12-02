export default [
	{
		ignores: ['build/', '.prettierrc.js', '**/.eslintrc.js', 'dist/**', 'node_modules/**'], // Replace with your ignore patterns
		files: ['**/*.ts', '**/*.tsx'], // Specify the extensions to lint
		languageOptions: {
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		rules: {
			// Your ESLint rules here
		},
	},
];
1;
