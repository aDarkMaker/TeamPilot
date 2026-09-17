import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';

export default defineConfig(
	{
		ignores: ['node_modules/', 'dist/', 'out/', 'coverage/', '.astro/', '*.config.js', '*.config.mjs', '.prettierrc.cjs', 'bun.lock'],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	prettierConfig,
	{
		// Only the rules used via inline eslint-disable comments are needed here.
		files: ['**/*.ts', '**/*.tsx'],
		plugins: { 'react-hooks': reactHooks },
		rules: {
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn',
		},
	},
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
		files: ['script/**/*.mjs', '*.config.js', 'eslint.config.mjs'],
		languageOptions: {
			globals: {
				Bun: 'readonly',
				process: 'readonly',
				console: 'readonly',
				URL: 'readonly',
				fetch: 'readonly',
			},
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
	}
);
