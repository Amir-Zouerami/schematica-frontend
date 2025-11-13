import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
	server: {
		host: '::',
		port: 8080,
	},

	plugins: [
		react({
			babel: {
				plugins: ['babel-plugin-react-compiler'],
			},
		}),
	],

	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},

	build: {
		outDir: '../schematica-api/public',
		target: 'es2022',
		rollupOptions: {
			output: {
				manualChunks: {
					monaco: ['monaco-editor', '@monaco-editor/react'],
				},
			},
		},
	},
});
