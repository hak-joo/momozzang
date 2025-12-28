import { Fragment, useMemo, type KeyboardEvent, type MouseEvent } from 'react';
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
import busImg from '@shared/assets/images/bus.png';
import type { MapProviderKey, MapProviderSpec } from './types';
import { PixelBadge } from '@shared/ui/PixelBadge';
import { useToast } from '@shared/ui/Toast';
import { Decoration } from '@shared/ui/Decoration/Decoration';

type TransportationType = 'busInfo' | 'carInfo' | 'metroInfo';

const transportationKeys: TransportationType[] = ['busInfo', 'carInfo', 'metroInfo'];
const transportationIcon: Record<TransportationType, { src: string; label: string }> = {
  busInfo: { src: busImg, label: '버스' },
  carInfo: { src: carImg, label: '자차' },
  metroInfo: { src: metroImg, label: '지하철' },
};

export function Direction() {
  const {
    weddingHallInfo: { latitude, longitude, hallName, hallDetail, address, tel },
    etcInfo,
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
        let cancelled = false;
        let timer: number;

        const cleanup = () => {
          window.clearTimeout(timer);
          window.removeEventListener('blur', cancelFallback);
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

        timer = window.setTimeout(() => {
          if (cancelled) return;
          cleanup();
          if (Date.now() - start < 1600) {
            openFallback(true);
          }
        }, 1200);

        window.addEventListener('blur', cancelFallback);
        window.addEventListener('pagehide', cancelFallback);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        window.location.href = scheme;
        window.setTimeout(() => cleanup(), 2000);
        return;
      } else {
        openFallback();
      }
    };

  return (
    <div className={styles.direction}>
      <div className={styles.mainTitle}>
        <PixelBadge text="Location" />
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
        {transportationKeys.map((type) => {
          const item = etcInfo[type];
          if (item == null || typeof item === 'boolean') return null;
          const icon = transportationIcon[type];

          return (
            <div className={styles.transportation} key={type}>
              <div className={styles.title}>
                <img width={24} src={icon.src} alt={icon.label} />
                <div>{icon.label}</div>
              </div>
              <div className={styles.description}>
                {item.info.map((line, index) => (
                  <div key={`${type}-info-${index}`} className={styles.info}>
                    <span className={styles.block} aria-hidden />
                    <span className={styles.descriptionText}>{line}</span>
                  </div>
                ))}
              </div>
              <div>
                {item.subInfo &&
                  item.subInfo.map((line, index) => (
                    <p
                      key={`${type}-sub-${index}`}
                      className={styles.subDescriptionText}
                    >{`- ${line}`}</p>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      <Decoration variant="sparkle" width={50} top={555} right={100} />
      <Decoration variant="sparkleCrossDashed" width={28} top={860} left={40} />
      <Decoration variant="sparkleCrossDashed" width={28} top={930} right={50} />
    </div>
  );
}
