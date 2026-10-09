import { createContext, useContext, type ReactNode } from 'react';
import type { Platform } from '../../platform/ports';
import { StoreContext } from '../../state/selectors';
import type { AppStore } from '../../state/store';

const PlatformContext = createContext<Platform | null>(null);

export function usePlatform(): Platform {
  const platform = useContext(PlatformContext);
  if (!platform) throw new Error('PlatformProvider missing');
  return platform;
}

export function Providers({
  platform,
  store,
  children,
}: {
  platform: Platform;
  store: AppStore;
  children: ReactNode;
}) {
  return (
    <PlatformContext.Provider value={platform}>
      <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
    </PlatformContext.Provider>
  );
}
