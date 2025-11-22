import './curlconverter-wasm-loader';
import '@/shared/config/monaco-init';

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './app/styles/index.css';

createRoot(document.getElementById('root')!).render(<App />);
