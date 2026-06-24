/**
 * 네이버 지도 JS SDK 로더 + 지오코딩 헬퍼.
 *
 * - 스크립트는 `&submodules=geocoder` 를 포함해 1회만 로드한다(Direction 지도/주소 검색 공용).
 * - `geocodeAddress` 는 `naver.maps.Service.geocode` 를 Promise 로 감싼다.
 * - Client ID(`VITE_NAVER_MAP_CLIENT_ID`) 미설정 시 명확한 에러로 거절한다(폼 저장은 막지 않음).
 */

const NAVER_MAP_SCRIPT_BASE = 'https://oapi.map.naver.com/openapi/v3/maps.js';

export const NAVER_MAP_CLIENT_ID = import.meta.env['VITE_NAVER_MAP_CLIENT_ID'] as
  | string
  | undefined;

type NaverLatLng = { lat: () => number; lng: () => number };

type GeocodeAddress = {
  roadAddress?: string;
  jibunAddress?: string;
  x: string; // 경도(longitude)
  y: string; // 위도(latitude)
};

type GeocodeResponse = {
  v2?: {
    addresses?: GeocodeAddress[];
    meta?: { totalCount?: number };
  };
};

declare global {
  interface Window {
    naver?: {
      maps?: {
        LatLng: new (lat: number, lng: number) => NaverLatLng;
        Map: new (element: HTMLElement, options: Record<string, unknown>) => unknown;
        Marker: new (options: Record<string, unknown>) => unknown;
        Service?: {
          geocode: (
            options: { query: string },
            callback: (status: string, response: GeocodeResponse) => void,
          ) => void;
          Status: { OK: string; ERROR: string };
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;
let loadedClientId: string | null = null;

export function loadNaverMapScript(clientId: string): Promise<void> {
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
  // geocoder 서브모듈을 포함해 주소→좌표 변환을 지원한다.
  script.src = `${NAVER_MAP_SCRIPT_BASE}?ncpKeyId=${clientId}&submodules=geocoder`;
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

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  /** 도로명 주소 우선, 없으면 지번 주소. */
  address: string;
}

export class GeocoderUnavailableError extends Error {}

/**
 * 주소 문자열을 좌표로 변환한다.
 * @throws GeocoderUnavailableError 키/서브모듈 미설정 시
 * @throws Error 무결과/네트워크 오류 시
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult> {
  if (!NAVER_MAP_CLIENT_ID) {
    throw new GeocoderUnavailableError('네이버 지도 Client ID가 설정되지 않았어요.');
  }
  await loadNaverMapScript(NAVER_MAP_CLIENT_ID);

  const service = window.naver?.maps?.Service;
  if (!service?.geocode) {
    throw new GeocoderUnavailableError('주소 검색(geocoder) 모듈을 사용할 수 없어요.');
  }

  return new Promise<GeocodeResult>((resolve, reject) => {
    service.geocode({ query }, (status, response) => {
      if (status !== service.Status.OK) {
        reject(new Error('주소 검색 중 오류가 발생했어요.'));
        return;
      }
      const first = response.v2?.addresses?.[0];
      if (!first) {
        reject(new Error('검색 결과가 없어요. 주소를 다시 확인해 주세요.'));
        return;
      }
      resolve({
        latitude: Number(first.y),
        longitude: Number(first.x),
        address: first.roadAddress || first.jibunAddress || query,
      });
    });
  });
}
