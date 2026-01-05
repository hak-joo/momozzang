import { useCallback, type KeyboardEvent, type MouseEvent } from 'react';
import { isAndroid, isIOS } from '@shared/util/platform';
import type { MapProviderKey, MapProviderSpec } from './types';

type MapProviders = Record<MapProviderKey, MapProviderSpec> | null;

// iOS is slightly different; there's no native "intent" scheme. 
// We generally use Universal Links or custom schemes. Since these are custom schemes, 
// we fall back to the "timeout" approach, or use a specific library if available.
// For this snippet, we keep the existing "try scheme -> timeout -> fallback" logic for iOS,
// while using the cleaner "intent://" approach for Android.

export function useMapNavigation(
  mapProviders: MapProviders,
  options?: {
    isMock?: boolean;
    onFallback?: (fallbackUrl: string) => void;
  },
) {
  const { isMock = false, onFallback } = options ?? {};

  return useCallback(
    (providerKey: MapProviderKey) =>
      (e: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!mapProviders || typeof window === 'undefined' || isMock) return;

        const provider = mapProviders[providerKey];
        const isAndroidDevice = isAndroid();
        const isIOSDevice = isIOS();

        // 1) Android: Use the `intent://` scheme
        if (isAndroidDevice) {
          const { androidScheme, androidPackage, webFallback, androidStore } = provider;
          if (!androidScheme || !androidPackage) return;
          
          const schemeIndex = androidScheme.indexOf('://');
          if (schemeIndex === -1) return;
          
          const schemeName = androidScheme.substring(0, schemeIndex);
          const resourcePath = androidScheme.substring(schemeIndex + 3);

          const fallback = webFallback ?? androidStore ?? '';
          const fallbackParam = fallback ? `S.browser_fallback_url=${encodeURIComponent(fallback)};` : '';

          const intentUrl = `intent://${resourcePath}#Intent;scheme=${schemeName};package=${androidPackage};${fallbackParam}end;`;
          
          window.location.href = intentUrl;
          return;
        }

        // 2) iOS: Try Custom Scheme, then trigger onFallback if provided
        const scheme = provider.iosScheme;
        const fallbackUrl = provider.webFallback ?? provider.iosStore;

        if (isIOSDevice && scheme) {
           window.location.href = scheme;
           
           // If we have a fallback URL and a callback, notify the parent to show UI
           if (fallbackUrl && onFallback) {
             // We use a small delay so the user sees "Open in App?" dialog first.
             setTimeout(() => {
               onFallback(fallbackUrl);
             }, 500);
           }
           return;
        }

        // 3) PC / Others
        const desktopFallback = provider.webFallback;
        if (desktopFallback) {
          window.open(desktopFallback, '_blank', 'noopener,noreferrer');
        } else {
          if (provider.androidStore || provider.iosStore) {
             const store = provider.androidStore || provider.iosStore;
             window.open(store, '_blank', 'noopener,noreferrer');
          }
        }
      },
    [mapProviders, isMock, onFallback],
  );
}
