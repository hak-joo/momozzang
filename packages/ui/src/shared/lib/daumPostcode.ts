/**
 * 다음(카카오) 우편번호 팝업 로더
 *
 * - loadDaumPostcodeScript: 스크립트 1회 동적 로드 (API 키 불필요)
 * - openPostcodeSearch: 팝업 열기 → 선택 시 { address, zonecode } 반환, 닫으면 null
 */

const DAUM_POSTCODE_SCRIPT_URL =
  'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

let loadPromise: Promise<void> | null = null;

function loadDaumPostcodeScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('window is undefined'));
  if (window.daum?.Postcode) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const existingScript = Array.from(document.querySelectorAll<HTMLScriptElement>('script')).find(
    (script) => script.src.includes('postcode.v2.js'),
  );
  if (existingScript) {
    loadPromise = new Promise<void>((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('daum postcode load error')), {
        once: true,
      });
    });
    return loadPromise;
  }

  const script = document.createElement('script');
  script.src = DAUM_POSTCODE_SCRIPT_URL;
  script.async = true;

  loadPromise = new Promise<void>((resolve, reject) => {
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () =>
      reject(new Error('Failed to load Daum Postcode script')),
    );
  });

  document.head.appendChild(script);
  return loadPromise;
}

/**
 * 다음 우편번호 팝업을 엽니다.
 * 도로명주소 우선, 없으면 지번주소를 반환합니다.
 *
 * @returns { address, zonecode } 또는 null (팝업 강제 닫기 시)
 */
export async function openPostcodeSearch(): Promise<{ address: string; zonecode: string } | null> {
  await loadDaumPostcodeScript();

  if (!window.daum?.Postcode) return null;

  return new Promise((resolve) => {
    const postcodeWidget = new window.daum!.Postcode({
      oncomplete(data) {
        const address = data.roadAddress || data.jibunAddress;
        resolve({ address, zonecode: data.zonecode });
      },
      onclose(state) {
        if (state === 'FORCE_CLOSE') {
          resolve(null);
        }
      },
    });
    postcodeWidget.open();
  });
}
