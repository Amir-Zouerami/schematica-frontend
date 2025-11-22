import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Import workers using Vite's specific worker syntax
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

// Configure the Monaco Environment to use local workers (Offline mode)
self.MonacoEnvironment = {
	getWorker(_, label) {
		if (label === 'json') {
			return new jsonWorker();
		}
		return new editorWorker();
	},
};

// Tell the React wrapper to use the local monaco instance
loader.config({ monaco });

export default monaco;
