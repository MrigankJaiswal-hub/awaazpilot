import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

const el = document.getElementById('root');
if (!el) {
  // helpful guard while debugging
  document.body.innerHTML = '<pre>Root element not found</pre>';
  throw new Error('Root element #root not found in index.html');
}

createRoot(el).render(<App />);
