import { useCallback, type KeyboardEvent, type MouseEvent } from 'react';
import { isAndroid, isIOS } from '@shared/util/platform';
import type { MapProviderKey, MapProviderSpec } from './types';

type MapProviders = Record<MapProviderKey, MapProviderSpec> | null;

// iOS is slightly different; there's no native "intent" scheme. 
// We generally use Universal Links or custom schemes. Since these are custom schemes, 
// we fall back to the "timeout" approach, or use a specific library if available.
// For this snippet, we keep the existing "try scheme -> timeout -> fallback" logic for iOS,
// while using the cleaner "intent://" approach for Android.

export function useMapNavigation(mapProviders: MapProviders, isMock = false) {
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

          // Remove the scheme prefix (e.g. "nmap://") to get the path/query
          // format: nmap://route/car?... -> route/car?...
          // But actually, we need to construct the intent properly.
          // Usually: intent://[HOST]/[PATH]?[QUERY]#Intent;scheme=[SCHEME];package=[PACKAGE];...
          
          // Let's parse the androidScheme to extract host/path/query
          // e.g. nmap://route/car?dlat=...
          // scheme: nmap
          // host+path+query: //route/car?dlat=...
          
          // A safer way is ensuring we replace the strictly known prefix.
          // Or we can just strip everything before `://`
          const schemeIndex = androidScheme.indexOf('://');
          if (schemeIndex === -1) return;
          
          const schemeName = androidScheme.substring(0, schemeIndex);
          const resourcePath = androidScheme.substring(schemeIndex + 3); // "route/car?dlat=..."

          // Fallback priority: Web URL -> Store URL
          const fallback = webFallback ?? androidStore ?? '';
          const fallbackParam = fallback ? `S.browser_fallback_url=${encodeURIComponent(fallback)};` : '';

          const intentUrl = `intent://${resourcePath}#Intent;scheme=${schemeName};package=${androidPackage};${fallbackParam}end;`;
          
          window.location.href = intentUrl;
          return;
        }

        // 2) iOS / Others: Use the custom scheme + timeout fallback approach
        const scheme = provider.iosScheme;
        const fallbackUrl = provider.webFallback ?? provider.iosStore; // Fallback to store if web undefined

        if (isIOSDevice && scheme) {
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
            // If the alert "Open in..." appears or app opens, blur happens.
            // On some iOS versions, we might want to cancel fallback if we blur quickly.
            blurCheck = window.setTimeout(() => {
              if (document.visibilityState === 'hidden') {
                cancelFallback();
              }
            }, 250);
          };
          
          const openFallback = (forceSelf = false) => {
            if (!fallbackUrl) return;
            if (forceSelf) {
             window.location.href = fallbackUrl;
            } else {
             window.location.href = fallbackUrl;
            }
          };

          timer = window.setTimeout(() => {
            if (cancelled) return;
            cleanup();
            if (Date.now() - start < 2000) {
              openFallback(true);
            }
          }, 1500);

          window.addEventListener('blur', handleBlur);
          window.addEventListener('pagehide', cancelFallback);
          document.addEventListener('visibilitychange', handleVisibilityChange);

          window.location.href = scheme;
          return;
        }

        // 3) PC or other non-mobile: Simply open the Web Fallback
        const desktopFallback = provider.webFallback;
        if (desktopFallback) {
          window.open(desktopFallback, '_blank', 'noopener,noreferrer');
        } else {
          // If no web fallback (e.g. TMap), maybe open store or do nothing?
          // Existing logic opened store if no web link.
          if (provider.androidStore || provider.iosStore) {
             const store = provider.androidStore || provider.iosStore;
             window.open(store, '_blank', 'noopener,noreferrer');
          }
        }
      },
    [mapProviders],
  );
}
