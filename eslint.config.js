// @ts-check

import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
	{
		ignores: ['dist', 'src/components/ui/**'],
	},

	{
		files: ['**/*.{ts,tsx}'],

		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: 2020,
				sourceType: 'module',
				ecmaFeatures: { jsx: true },
			},
			globals: globals.browser,
		},

		extends: [
			js.configs.recommended,
			...tseslint.configs.recommended,
			reactHooks.configs.recommended,
			eslintPluginPrettierRecommended,
		],

		plugins: {
			'@stylistic': stylistic,
			'react-refresh': reactRefresh,
		},

		rules: {
			'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

			'@typescript-eslint/no-explicit-any': 'off',

			'@stylistic/brace-style': ['error', 'stroustrup', { allowSingleLine: false }],

			'@stylistic/indent': 'off',

			'prettier/prettier': ['error', { endOfLine: 'auto' }],

			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
		},
	},
]);
