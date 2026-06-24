/**
 * 카카오 지도 JS SDK 로더 + 장소(POI) 검색 헬퍼 (F5).
 *
 * - 스크립트는 `&libraries=services&autoload=false` 로 1회만 로드하고,
 *   로드 후 `kakao.maps.load(cb)` 로 초기화한다(NaverMap 로더의 단일 로드/Promise 캐시 패턴).
 * - `searchPlaces` 는 `kakao.maps.services.Places.keywordSearch` 를 Promise 로 감싼다.
 * - App key(`VITE_KAKAO_APP_KEY`) 미설정/모듈 미가용/무결과 시 명확한 에러로 거절한다
 *   (폼 저장은 막지 않음 — 호출부에서 수동 입력 폴백 유지).
 */

const KAKAO_MAP_SCRIPT_BASE = '//dapi.kakao.com/v2/maps/sdk.js';

export const KAKAO_APP_KEY = import.meta.env['VITE_KAKAO_APP_KEY'] as string | undefined;

type KakaoLatLng = { getLat: () => number; getLng: () => number };

type KakaoPlace = {
  place_name: string;
  road_address_name?: string;
  address_name?: string;
  x: string; // 경도(longitude)
  y: string; // 위도(latitude)
  phone?: string;
};

type KakaoPlacesService = {
  keywordSearch: (
    query: string,
    callback: (data: KakaoPlace[], status: string) => void,
  ) => void;
};

declare global {
  interface Window {
    kakao?: {
      maps?: {
        load: (callback: () => void) => void;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        Map: new (element: HTMLElement, options: Record<string, unknown>) => unknown;
        Marker: new (options: Record<string, unknown>) => unknown;
        services?: {
          Places: new () => KakaoPlacesService;
          Status: { OK: string; ZERO_RESULT: string; ERROR: string };
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

/**
 * Kakao Maps SDK 를 1회만 로드하고 `kakao.maps.load` 초기화까지 마친다.
 * services 모듈이 사용 가능한 상태(`window.kakao.maps.services`)가 되면 resolve.
 */
export function loadKakaoMapScript(appKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('window is undefined'));
  if (window.kakao?.maps?.services) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const init = () => {
      const kakao = window.kakao;
      if (!kakao?.maps?.load) {
        reject(new Error('Kakao Maps SDK 초기화에 실패했어요.'));
        return;
      }
      kakao.maps.load(() => resolve());
    };

    // 이미 같은 스크립트가 붙어 있으면 load 이벤트만 기다린다(중복 삽입 방지).
    const existingScript = Array.from(
      document.querySelectorAll<HTMLScriptElement>('script'),
    ).find((script) => script.src.includes(KAKAO_MAP_SCRIPT_BASE));
    if (existingScript) {
      if (window.kakao?.maps?.load) {
        init();
      } else {
        existingScript.addEventListener('load', init, { once: true });
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Failed to load Kakao Map script')),
          { once: true },
        );
      }
      return;
    }

    const script = document.createElement('script');
    // services 라이브러리(장소 검색)를 포함하고, autoload=false 로 수동 초기화한다.
    script.src = `${KAKAO_MAP_SCRIPT_BASE}?appkey=${appKey}&libraries=services&autoload=false`;
    script.async = true;
    script.addEventListener('load', init);
    script.addEventListener('error', () =>
      reject(new Error('Failed to load Kakao Map script')),
    );
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export interface PlaceResult {
  /** 장소명 (예: "경기교총웨딩하우스") */
  placeName: string;
  /** 도로명 주소 (없을 수 있음) */
  roadAddress: string;
  /** 지번 주소 */
  address: string;
  latitude: number; // y
  longitude: number; // x
  phone?: string;
}

/** 키 미설정/모듈 미가용/도메인 미등록 등 환경 문제로 검색이 불가능할 때. */
export class KakaoPlacesUnavailableError extends Error {}

/** 검색 결과가 없을 때. */
export class KakaoNoResultError extends Error {}

/**
 * 장소명(키워드)으로 후보 목록을 검색한다.
 * @throws KakaoPlacesUnavailableError 키/모듈 미설정 시
 * @throws KakaoNoResultError 무결과 시
 * @throws Error 네트워크/기타 오류 시
 */
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const keyword = query.trim();
  if (!keyword) {
    throw new Error('검색할 장소명을 입력해 주세요.');
  }
  if (!KAKAO_APP_KEY) {
    throw new KakaoPlacesUnavailableError('카카오 앱 키가 설정되지 않았어요.');
  }

  try {
    await loadKakaoMapScript(KAKAO_APP_KEY);
  } catch {
    throw new KakaoPlacesUnavailableError(
      '카카오 지도 SDK를 불러오지 못했어요. 도메인이 등록되지 않았을 수 있어요.',
    );
  }

  const services = window.kakao?.maps?.services;
  if (!services?.Places) {
    throw new KakaoPlacesUnavailableError('장소 검색(services) 모듈을 사용할 수 없어요.');
  }

  return new Promise<PlaceResult[]>((resolve, reject) => {
    const places = new services.Places();
    places.keywordSearch(keyword, (data, status) => {
      if (status === services.Status.OK) {
        resolve(
          data.map((place) => ({
            placeName: place.place_name,
            roadAddress: place.road_address_name ?? '',
            address: place.address_name ?? '',
            latitude: Number(place.y),
            longitude: Number(place.x),
            phone: place.phone || undefined,
          })),
        );
        return;
      }
      if (status === services.Status.ZERO_RESULT) {
        reject(new KakaoNoResultError('검색 결과가 없어요. 장소명을 다시 확인해 주세요.'));
        return;
      }
      reject(new Error('장소 검색 중 오류가 발생했어요.'));
    });
  });
}
