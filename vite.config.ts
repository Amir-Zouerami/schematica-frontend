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
		chunkSizeWarningLimit: 1000,
		rollupOptions: {
			output: {
				manualChunks: {
					// Chunk Monaco separately so it caches efficiently
					monaco: ['monaco-editor', '@monaco-editor/react'],
					// Chunk Vendor libs
					vendor: ['react', 'react-dom', 'react-router-dom'],
				},
			},
		},
	},
});
