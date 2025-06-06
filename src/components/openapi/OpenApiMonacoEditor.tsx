import { useEffect } from 'react';
import { useMonaco } from '@monaco-editor/react';
import MonacoEditor from '@monaco-editor/react';
import githubDarkTheme from 'monaco-themes/themes/GitHub Dark.json';

interface OpenApiMonacoEditorProps {
	value: string;
	onChange: (val: string | undefined) => void;
	height?: string;
	width?: string;
}

const OpenApiMonacoEditor = ({ value, onChange, height = '60vh' }: OpenApiMonacoEditorProps) => {
	const monaco = useMonaco();

	useEffect(() => {
		if (monaco) {
			monaco.editor.defineTheme('github-dark', githubDarkTheme as any);
			monaco.editor.setTheme('github-dark');
		}
	}, [monaco]);

	return (
		<MonacoEditor
			height={height}
			language="json"
			value={value}
			onChange={onChange}
			theme="github-dark"
			options={{
				scrollBeyondLastLine: false,
				minimap: { enabled: false },
				autoIndent: 'full',
				formatOnPaste: true,
				formatOnType: true,
				wordWrap: 'on',
				lineNumbers: 'on',
				folding: true,
				automaticLayout: true,
				smoothScrolling: true,
				cursorSmoothCaretAnimation: 'on',
				bracketPairColorization: { enabled: true },
				guides: { highlightActiveBracketPair: true, bracketPairs: 'active' },
				tabSize: 4,
				detectIndentation: false,
			}}
		/>
	);
};

export default OpenApiMonacoEditor;
