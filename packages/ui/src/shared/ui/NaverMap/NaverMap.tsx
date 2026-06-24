import { useEffect, useRef, useState } from 'react';
import styles from './NaverMap.module.css';
import { NAVER_MAP_CLIENT_ID, loadNaverMapScript } from './loadNaverMap';

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
    setError(null);

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
