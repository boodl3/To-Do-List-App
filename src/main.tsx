import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './ui/theme/tokens.css';
import './ui/theme/themes.css';
import './ui/theme/reactflow-overrides.css';
import { createPlatform } from './platform';
import { boot } from './state/boot';
import { createAppStore } from './state/store';
import { App } from './ui/app/App';
import { Providers } from './ui/app/PlatformProvider';

const platform = createPlatform();
const store = createAppStore(platform);
void boot(platform, store);

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Providers platform={platform} store={store}>
      <App />
    </Providers>
  </StrictMode>,
);
