import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(() => ({
	server: {
		host: '::',
		port: 8080,
	},
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	assetsInclude: ['**/*.wasm'],
	build: {
		outDir: '../backend/public',
		target: 'es2022',
		rollupOptions: {
			output: {
				manualChunks: {
					monaco: ['monaco-editor', '@monaco-editor/react'],
				},
			},
		},
	},
	optimizeDeps: {
		// This tells Vite to pre-bundle these, which can sometimes help with CJS/ESM interop
		// and handling of assets within these dependencies.
		// The 'esbuildOptions.loader' for wasm might not be needed if 'assetsInclude'
		// and placing in 'public' works, as 'curlconverter' likely fetches them.
		// include: ['curlconverter', 'web-tree-sitter'], // Optional, try without first
	},
}));
