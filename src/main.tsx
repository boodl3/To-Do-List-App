import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './ui/theme/tokens.css';
import './ui/theme/themes.css';
import './ui/theme/reactflow-overrides.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <div />
  </StrictMode>,
);
