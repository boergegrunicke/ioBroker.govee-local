export default [
	{
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
