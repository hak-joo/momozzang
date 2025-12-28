import { useCallback, type KeyboardEvent, type MouseEvent } from 'react';
import { isAndroid, isIOS } from '@shared/util/platform';
import type { MapProviderKey, MapProviderSpec } from './types';

type MapProviders = Record<MapProviderKey, MapProviderSpec> | null;

export function useMapNavigation(mapProviders: MapProviders) {
  return useCallback(
    (providerKey: MapProviderKey) =>
      (e: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!mapProviders || typeof window === 'undefined') return;

        const provider = mapProviders[providerKey];
        const mobile = isIOS() || isAndroid();
        const scheme = isIOS() ? provider.iosScheme : provider.androidScheme;
        const storeLink = isIOS() ? provider.iosStore : provider.androidStore;
        const webLink = provider.webFallback;
        const fallbackUrl =
          webLink ?? mapProviders.naver?.webFallback ?? 'https://map.naver.com/v5/';

        const openStore = (forceSelf = false) => {
          if (!storeLink) return;
          if (mobile || forceSelf) {
            window.location.href = storeLink;
          } else {
            window.open(storeLink, '_blank', 'noopener,noreferrer');
          }
        };

        const openFallback = (forceSelf = false) => {
          if (fallbackUrl) {
            if (mobile || forceSelf) {
              window.location.href = fallbackUrl;
            } else {
              window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
            }
          } else {
            openStore(forceSelf);
          }
        };

        if (mobile && scheme) {
          const start = Date.now();
          let cancelled = false;
          let timer: number;
          let blurCheck: number | undefined;

          const cleanup = () => {
            window.clearTimeout(timer);
            if (blurCheck) window.clearTimeout(blurCheck);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('pagehide', cancelFallback);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
          };

          const cancelFallback = () => {
            cancelled = true;
            cleanup();
          };

          const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
              cancelFallback();
            }
          };

          const handleBlur = () => {
            blurCheck = window.setTimeout(() => {
              if (document.visibilityState === 'hidden') {
                cancelFallback();
              }
            }, 250);
          };

          timer = window.setTimeout(() => {
            if (cancelled) return;
            cleanup();
            if (Date.now() - start < 1600) {
              openFallback(true);
            }
          }, 1200);

          window.addEventListener('blur', handleBlur);
          window.addEventListener('pagehide', cancelFallback);
          document.addEventListener('visibilitychange', handleVisibilityChange);

          window.location.href = scheme;
          window.setTimeout(() => cleanup(), 2000);
          return;
        } else {
          openFallback();
        }
      },
    [mapProviders],
  );
}
