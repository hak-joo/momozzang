import { useMemo, type KeyboardEvent, type MouseEvent } from 'react';
import { useInvitation } from '@entities/WeddingInvitation/Context';
import styles from './Direction.module.css';
import { NaverMap } from '@shared/ui/NaverMap';
import { PhoneIcon } from '@shared/ui/Icon/Phone';
import { Button, IconButton } from '@shared/ui/Button';
import { ClipboardIcon } from '@shared/ui/Icon/ClipboardIcon';
import { isAndroid, isIOS } from '@shared/util/platform';
import { createMapProviders } from './constants';

import carImg from '@shared/assets/images/car.png';
import metroImg from '@shared/assets/images/metro.png';
import type { MapProviderKey, MapProviderSpec } from './types';
import { PixelBadge } from '@shared/ui/PixelBadge';
import { useToast } from '@shared/ui/Toast';

export function Direction() {
  const {
    weddingHallInfo: { latitude, longitude, hallName, hallDetail, address, tel },
  } = useInvitation();
  const { info } = useToast();
  const handleCopyAddress = () => {
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(address);
      info({ title: '주소가 복사되었습니다.', description: address });
    }
  };

  const handleContact = () => {
    if (typeof window === 'undefined') return;
    window.location.href = `tel:${tel}`;
  };

  const mapProviders = useMemo<Record<MapProviderKey, MapProviderSpec> | null>(() => {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    return createMapProviders({ latitude, longitude, name: hallName ?? '웨딩홀' });
  }, [latitude, longitude, hallName]);

  const handleClickMapLink =
    (providerKey: MapProviderKey) =>
    (e: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!mapProviders || typeof window === 'undefined') return;

      const provider = mapProviders[providerKey];
      const mobile = isIOS() || isAndroid();
      const scheme = isIOS() ? provider.iosScheme : provider.androidScheme;
      const storeLink = isIOS() ? provider.iosStore : provider.androidStore;
      const webLink = provider.webFallback;
      const fallbackUrl = webLink ?? mapProviders.naver?.webFallback ?? 'https://map.naver.com/v5/';
      const openStore = (forceSelf = false) => {
        if (!storeLink) return;
        if (mobile || forceSelf) {
          window.location.href = storeLink;
        } else {
          window.open(storeLink, '_blank', 'noopener,noreferrer');
        }
      };
      const openFallback = (forceSelf = false) => {
        if (fallbackUrl) {
          if (mobile || forceSelf) {
            window.location.href = fallbackUrl;
          } else {
            window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
          }
        } else {
          openStore(forceSelf);
        }
      };

      if (mobile && scheme) {
        const start = Date.now();
        const timer = window.setTimeout(() => {
          if (Date.now() - start < 1600) {
            openFallback(true);
          }
        }, 1200);

        window.location.href = scheme;
        window.setTimeout(() => window.clearTimeout(timer), 2000);
        return;
      } else {
        openFallback();
      }
    };

  return (
    <div className={styles.direction}>
      <div className={styles.title}>
        <PixelBadge text="LOCATION" />
      </div>

      <div className={styles.weddinghallInfo}>
        <div className={styles.hallName}>
          <span>{hallName}</span>
          <IconButton onClick={handleContact} icon={<PhoneIcon />} variant="plain" size="sm" />
        </div>
        <div className={styles.address}>
          <span>{address}</span>
          <IconButton
            onClick={handleCopyAddress}
            icon={<ClipboardIcon />}
            variant="plain"
            size="sm"
          />
        </div>
      </div>
      <NaverMap latitude={latitude} longitude={longitude} title={hallName ?? '웨딩홀'} />

      {mapProviders && (
        <div className={styles.linkButton}>
          {(Object.entries(mapProviders) as [MapProviderKey, MapProviderSpec][]).map(
            ([key, spec]) => (
              <Button key={key} onClick={handleClickMapLink(key)} size="sm">
                {spec.label}
              </Button>
            ),
          )}
        </div>
      )}

      <div className={styles.transportationList}>
        <div className={styles.transportation}>
          <div className={styles.title}>
            <img width={24} src={carImg} alt="Car" />
            <span>자차</span>
          </div>
          <div className={styles.description}>
            <p>한국도심공항터미널 주차장 이용</p>
            <p>네비게이션 검색어: ㅁㅁㅁ</p>
          </div>
        </div>
        <div className={styles.transportation}>
          <div className={styles.title}>
            <img width={24} src={metroImg} alt="Metro" />
            <span>지하철</span>
          </div>
          <div className={styles.description}>
            <p>삼성역 2호선 4번 출구 도보 5분</p>
            <p>봉은사역 7호선 1번 출구 도보 7분</p>
          </div>
        </div>
        <div className={styles.transportation}>
          <div className={styles.title}>
            <img width={24} src={carImg} alt="Car" />
            <span>자차</span>
          </div>
          <div className={styles.description}>
            <p>한국도심공항터미널 주차장 이용</p>
            <p>네비게이션 검색어: ㅁㅁㅁ</p>
          </div>
        </div>
      </div>
    </div>
  );
}
