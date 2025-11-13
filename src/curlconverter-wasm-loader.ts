// Force curlconverter to use my wasm files

// @ts-expect-error internal override
self.TREE_SITTER_WASM_URL = '/wasm/tree-sitter.wasm';

// @ts-expect-error internal override
self.TREE_SITTER_BASH_WASM_URL = '/wasm/tree-sitter-bash.wasm';
