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
           
           if (fallbackUrl && onFallback) {
             // 1. 예약: 2.5초 뒤에 "앱 안 열렸나요?" 다이얼로그 띄우기
             const timer = setTimeout(() => {
               // 여전히 페이지가 보이고(visible), 포커스가 있다면 -> 앱이 안 열린 것으로 간주
               if (document.visibilityState === 'visible') {
                  onFallback(fallbackUrl);
               }
             }, 2500);

             // 2. 감시: 만약 그 사이에 앱으로 이동해서 페이지가 숨겨지면(hidden) -> 예약 취소!
             const checkVisibility = () => {
               if (document.visibilityState === 'hidden') {
                 clearTimeout(timer);
                 document.removeEventListener('visibilitychange', checkVisibility);
               }
             };

             document.addEventListener('visibilitychange', checkVisibility);
             
             // (선택) PageHide(탭 닫기/이동) 시에도 취소
             window.addEventListener('pagehide', () => clearTimeout(timer), { once: true });
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
