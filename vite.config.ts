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
	optimizeDeps: {},
}));
