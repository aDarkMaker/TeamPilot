import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig(
	{
		ignores: ['node_modules/', 'dist/', 'out/', 'coverage/', '*.config.js', '.prettierrc.cjs', 'bun.lock'],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	prettierConfig,
	{
		files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
		languageOptions: {
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				ecmaFeatures: { jsx: true },
			},
			globals: {
				Bun: 'readonly',
				process: 'readonly',
				console: 'readonly',
			},
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					caughtErrors: 'all',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/no-explicit-any': 'warn',
			'no-console': 'off',
		},
	},
	{
		files: ['admin/**/*.js'],
		languageOptions: {
			globals: {
				window: 'readonly',
				document: 'readonly',
				fetch: 'readonly',
				sessionStorage: 'readonly',
				btoa: 'readonly',
				location: 'readonly',
				confirm: 'readonly',
				alert: 'readonly',
				prompt: 'readonly',
				browser: 'readonly',
				URL: 'readonly',
				crypto: 'readonly',
				FormData: 'readonly',
			},
		},
	},
);
