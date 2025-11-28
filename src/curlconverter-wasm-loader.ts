export {}; // Ensure this is treated as a module

// Extend the global Window/Worker scope
declare global {
	interface Window {
		TREE_SITTER_WASM_URL: string;
		TREE_SITTER_BASH_WASM_URL: string;
	}
}

// Now we can assign safely without ts-ignore or expect-error
self.TREE_SITTER_WASM_URL = '/wasm/tree-sitter.wasm';
self.TREE_SITTER_BASH_WASM_URL = '/wasm/tree-sitter-bash.wasm';
