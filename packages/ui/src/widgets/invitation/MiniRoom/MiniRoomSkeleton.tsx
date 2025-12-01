import miniRoomBackground from '@shared/assets/images/mini-room.png';
import groomBrideMini from '@shared/assets/images/groom-bride.png';
import { PixelBadge } from '@shared/ui/PixelBadge';

import styles from './MiniRoom.module.css';

interface MainMiniMe {
  src: string;
  width?: number;
  position: {
    x: number;
    y: number;
  };
  alt?: string;
}

const DEFAULT_SPECIAL_MINI: MainMiniMe = {
  src: groomBrideMini,
  width: 61,
  position: { x: 50, y: 41 },
  alt: '신랑 신부 미니미',
};

export function MiniRoomSkeleton() {
  return (
    <div className={styles.wrapper}>
      <PixelBadge text="Mini Room" />

      <div className={styles.stage}>
        <img
          src={miniRoomBackground}
          alt="미니룸 배경"
          className={styles.stageImage}
          draggable={false}
        />
        {DEFAULT_SPECIAL_MINI && (
          <img
            src={DEFAULT_SPECIAL_MINI.src}
            alt={DEFAULT_SPECIAL_MINI.alt ?? '신랑신부'}
            className={styles.specialMini}
            style={{
              left: `${DEFAULT_SPECIAL_MINI.position.x}%`,
              top: `${DEFAULT_SPECIAL_MINI.position.y}%`,
              width: DEFAULT_SPECIAL_MINI.width ?? 92,
            }}
            draggable={false}
          />
        )}
      </div>
    </div>
  );
}
