import { useEffect, useRef, useState } from 'react';
import styles from './KakaoMap.module.css';
import { KAKAO_APP_KEY, loadKakaoMapScript } from './loadKakaoMap';

export interface KakaoMapProps {
  latitude: number;
  longitude: number;
  title: string;
}

/**
 * 선택된 좌표를 Kakao 지도에 핀(마커)으로 표시한다 (F5-c).
 * - 검색 SDK와 동일 provider(Kakao)를 사용해 localhost 에서 Naver 401 회피.
 */
export function KakaoMap({ latitude, longitude, title }: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!KAKAO_APP_KEY) {
      setError('카카오 앱 키가 설정되지 않았어요.');
      return;
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError('좌표 정보가 없어 지도를 표시할 수 없어요.');
      return;
    }

    let cancelled = false;
    setError(null);

    loadKakaoMapScript(KAKAO_APP_KEY)
      .then(() => {
        if (cancelled) return;
        const kakao = window.kakao;
        if (!kakao?.maps || !mapRef.current) {
          setError('카카오 지도를 초기화하지 못했어요.');
          return;
        }
        const center = new kakao.maps.LatLng(latitude, longitude);
        const map = new kakao.maps.Map(mapRef.current, { center, level: 3 });
        new kakao.maps.Marker({ position: center, map, title });
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('지도를 불러오는 중 오류가 발생했어요.');
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, title]);

  return (
    <div className={styles.mapContainer}>
      {error ? (
        <div className={styles.fallback}>
          <strong>지도를 표시할 수 없어요.</strong>
          <span>{error}</span>
        </div>
      ) : (
        <div ref={mapRef} className={styles.mapCanvas} role="presentation" />
      )}
    </div>
  );
}
