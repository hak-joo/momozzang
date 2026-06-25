/**
 * 네이버 지도 공용 스크립트 로더 + Geocoder 헬퍼
 *
 * - loadNaverMapScript: 지도 스크립트를 1회만 동적 로드 (geocoder 서브모듈 포함)
 * - geocodeAddress: 주소 문자열 → { latitude, longitude } 변환
 */

const NAVER_MAP_SCRIPT_BASE = 'https://oapi.map.naver.com/openapi/v3/maps.js';

// ── 전역 타입 확장 ──────────────────────────────────────────────────────────
declare global {
  interface Window {
    naver?: {
      maps?: {
        LatLng: new (lat: number, lng: number) => unknown;
        Map: new (element: HTMLElement, options: Record<string, unknown>) => unknown;
        Marker: new (options: Record<string, unknown>) => unknown;
        Service: {
          Status: { OK: string; ERROR: string };
          geocode: (
            options: { query: string },
            callback: (
              status: string,
              response: {
                v2: {
                  addresses: Array<{
                    x: string; // 경도(longitude)
                    y: string; // 위도(latitude)
                    roadAddress: string;
                    jibunAddress: string;
                  }>;
                  meta: { totalCount: number };
                };
              },
            ) => void,
          ) => void;
        };
      };
    };
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
        onclose?: (state: string) => void;
        width?: string | number;
        height?: string | number;
      }) => { open: () => void };
    };
  }
}

export interface DaumPostcodeData {
  roadAddress: string;
  jibunAddress: string;
  zonecode: string;
}

// ── 로더 내부 상태 ───────────────────────────────────────────────────────────
let scriptPromise: Promise<void> | null = null;
let loadedClientId: string | null = null;

/**
 * 네이버 지도 스크립트를 1회 동적 로드합니다.
 * geocoder 서브모듈이 항상 포함됩니다.
 */
export function loadNaverMapScript(clientId: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('window is undefined'));
  if (window.naver?.maps?.Service) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  // 이미 삽입된 스크립트 태그 감지
  const existingScript = Array.from(document.querySelectorAll<HTMLScriptElement>('script')).find(
    (script) => script.src.includes(NAVER_MAP_SCRIPT_BASE),
  );
  if (existingScript && loadedClientId === clientId) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('naver map load error')), {
        once: true,
      });
    });
    return scriptPromise;
  }

  const script = document.createElement('script');
  script.src = `${NAVER_MAP_SCRIPT_BASE}?ncpKeyId=${clientId}&submodules=geocoder`;
  script.async = true;
  script.defer = true;

  scriptPromise = new Promise<void>((resolve, reject) => {
    script.addEventListener('load', () => {
      loadedClientId = clientId;
      resolve();
    });
    script.addEventListener('error', () =>
      reject(new Error('Failed to load Naver Map script')),
    );
  });

  document.head.appendChild(script);
  return scriptPromise;
}

/**
 * 주소 문자열을 위도/경도로 변환합니다.
 * 네이버 NCP 콘솔에서 Maps SDK / Geocoding API가 활성화돼 있어야 합니다.
 *
 * @returns { latitude, longitude } 또는 null (주소 불일치·오류 시)
 */
export async function geocodeAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const clientId = import.meta.env['VITE_NAVER_MAP_CLIENT_ID'] as string | undefined;
  if (!clientId) return null;

  await loadNaverMapScript(clientId);

  const service = window.naver?.maps?.Service;
  if (!service) return null;

  return new Promise((resolve) => {
    service.geocode({ query: address }, (status, response) => {
      if (status === service.Status.ERROR) {
        resolve(null);
        return;
      }
      const addresses = response.v2.addresses;
      if (!addresses || addresses.length === 0) {
        resolve(null);
        return;
      }
      const first = addresses[0];
      const latitude = Number(first.y);
      const longitude = Number(first.x);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        resolve(null);
        return;
      }
      resolve({ latitude, longitude });
    });
  });
}
