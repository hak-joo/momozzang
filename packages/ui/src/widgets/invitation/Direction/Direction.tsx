import { useMemo } from 'react';
import { useInvitation } from '@entities/WeddingInvitation/Context';
import styles from './Direction.module.css';
import { NaverMap } from '@shared/ui/NaverMap';
import { PhoneIcon } from '@shared/ui/Icon/Phone';
import { Button, IconButton } from '@shared/ui/Button';
import { ClipboardIcon } from '@shared/ui/Icon/ClipboardIcon';
import { createMapProviders } from './constants';

import carImg from '@shared/assets/images/car.png';
import metroImg from '@shared/assets/images/metro.png';
import busImg from '@shared/assets/images/bus.png';
import type { MapProviderKey, MapProviderSpec } from './types';
import { PixelBadge } from '@shared/ui/PixelBadge';
import { useToast } from '@shared/ui/Toast';
import { useMessageDialog } from '@shared/ui/MessageDialog';
import { Decoration } from '@shared/ui/Decoration/Decoration';
import { useMapNavigation } from './useMapNavigation';
import { useParams } from 'react-router-dom';
import { getThemeHue, PURPLE_HUE } from '@shared/styles/utils';
import { useImageHueShift } from '@shared/hooks/useImageHueShift';

type TransportationType = 'busInfo' | 'carInfo' | 'metroInfo';

const transportationKeys: TransportationType[] = ['busInfo', 'carInfo', 'metroInfo'];

export function Direction() {
  const { invitationId } = useParams();
  const isMock = !invitationId;
  const {
    weddingHallInfo: { latitude, longitude, hallName, address, tel },
    etcInfo,
    customization,
  } = useInvitation();

  const themeHue = getThemeHue(customization?.themeColor);

  const busIcon = useImageHueShift(busImg, themeHue, PURPLE_HUE, { strategy: 'relative' });
  const carIcon = useImageHueShift(carImg, themeHue, PURPLE_HUE, { strategy: 'relative' });
  const metroIcon = useImageHueShift(metroImg, themeHue, PURPLE_HUE, { strategy: 'relative' });

  const transportationIcon = useMemo(() => {
    return {
      busInfo: { src: busIcon, label: '버스' },
      carInfo: { src: carIcon, label: '자차' },
      metroInfo: { src: metroIcon, label: '지하철' },
    };
  }, [busIcon, carIcon, metroIcon]);

  const { info } = useToast();
  const confirm = useMessageDialog();

  const handleCopyAddress = () => {
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(address);
      info({ title: '주소가 복사되었습니다.' });
    }
  };

  const handleContact = () => {
    if (isMock) return;
    if (typeof window === 'undefined') return;
    window.location.href = `tel:${tel}`;
  };

  const handleFallback = async (fallbackUrl: string) => {
    const result = await confirm({
      title: '앱이 열리지 않았나요?',
      message: '앱이 설치되어 있지 않다면\n웹으로 연결해 드릴까요?',
      confirmText: '웹으로 연결',
      cancelText: '취소',
    });

    if (result) {
      window.open(fallbackUrl, '_blank');
    }
  };

  const mapProviders = useMemo<Record<MapProviderKey, MapProviderSpec> | null>(() => {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    return createMapProviders({ latitude, longitude, name: hallName ?? '웨딩홀' });
  }, [latitude, longitude, hallName]);

  const handleClickMapLink = useMapNavigation(mapProviders, {
    isMock,
    onFallback: handleFallback,
  });

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
                    <div key={`${type}-sub-${index}`} className={styles.subDescription}>
                      <span className={styles.subDescriptionBullet} aria-hidden>
                        -
                      </span>
                      <span className={styles.subDescriptionText}>
                        {line.replace(/^-\\s*/, '').replaceAll('\\n', '\n')}
                      </span>
                    </div>
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
