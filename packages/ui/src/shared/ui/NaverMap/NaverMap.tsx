import { useEffect, useRef, useState } from 'react';
import styles from './NaverMap.module.css';

const NAVER_MAP_SCRIPT_BASE = 'https://oapi.map.naver.com/openapi/v3/maps.js';
const NAVER_MAP_CLIENT_ID = import.meta.env['VITE_NAVER_MAP_CLIENT_ID'];

declare global {
  interface Window {
    naver?: {
      maps?: {
        LatLng: new (lat: number, lng: number) => any;
        Map: new (element: HTMLElement, options: Record<string, any>) => any;
        Marker: new (options: Record<string, any>) => any;
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;
let loadedClientId: string | null = null;

function loadNaverMapScript(clientId: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('window is undefined'));
  if (window.naver?.maps) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  const existingScript = Array.from(document.querySelectorAll<HTMLScriptElement>('script')).find(
    (script) => script.src.includes(NAVER_MAP_SCRIPT_BASE),
  );
  if (existingScript && loadedClientId === clientId) {
    scriptPromise = new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('naver map load error')), {
        once: true,
      });
    });
    return scriptPromise;
  }

  const script = document.createElement('script');
  script.src = `${NAVER_MAP_SCRIPT_BASE}?ncpKeyId=${clientId}`;
  script.async = true;
  script.defer = true;

  scriptPromise = new Promise<void>((resolve, reject) => {
    script.addEventListener('load', () => {
      loadedClientId = clientId;
      resolve();
    });
    script.addEventListener('error', () => reject(new Error('Failed to load Naver Map script')));
  });

  document.head.appendChild(script);
  return scriptPromise;
}

export interface NaverMapProps {
  latitude: number;
  longitude: number;
  title: string;
}

export function NaverMap({ latitude, longitude, title }: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!NAVER_MAP_CLIENT_ID) {
      setError('네이버 지도 Client ID가 설정되지 않았어요.');
      return;
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      setError('좌표 정보가 없어 지도를 표시할 수 없어요.');
      return;
    }

    let cancelled = false;

    loadNaverMapScript(NAVER_MAP_CLIENT_ID)
      .then(() => {
        if (cancelled) return;
        const { naver } = window;
        if (!naver?.maps || !mapRef.current) {
          setError('네이버 지도를 초기화하지 못했어요.');
          return;
        }

        const center = new naver.maps.LatLng(latitude, longitude);
        const map = new naver.maps.Map(mapRef.current, {
          center,
          zoom: 16,
          scrollWheel: false,
          disableDoubleClickZoom: true,
        });

        new naver.maps.Marker({
          position: center,
          map,
          title,
        });
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('지도를 불러오는 중 오류가 발생했어요.');
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  return (
    <div className={styles.mapContainer}>
      {error ? (
        <div className={styles.fallback}>
          <strong>지도를 표시할 수 없어요.</strong>
          <span>{error}</span>
        </div>
      ) : (
        <div id="map" ref={mapRef} className={styles.mapCanvas} role="presentation" />
      )}
    </div>
  );
}
