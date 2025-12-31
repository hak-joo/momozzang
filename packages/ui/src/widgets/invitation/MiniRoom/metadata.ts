import type { RestrictedZone } from './lib/generateMiniMePositions';

export interface MiniRoomMetadata {
  id: string;
  label: string;
  imageSrc: string;
  restrictedZones: RestrictedZone[];
  frame: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  defaults: Array<{
    miniMeId: number;
    content: string;
    from?: string;
  }>;
}

export const MINI_ROOM_METADATA: MiniRoomMetadata[] = [
  {
    id: 'classic-garden',
    label: '클래식 가든',
    imageSrc: 'mini-room.png',
    restrictedZones: [
      { x1: 0, x2: 100, y1: 0, y2: 55 },
      { x1: 40, x2: 70, y1: 50, y2: 70 },
    ],
    frame: { minX: 10, maxX: 90, minY: 28, maxY: 92 },
    defaults: [
      { miniMeId: 1, content: '결혼 진심으로 축하해요💕', from: '모모짱' },
      { miniMeId: 2, content: '사랑 가득한 결혼생활 되길! 🩵', from: '모모짱' },
      { miniMeId: 4, content: '두 사람 행복하게 오래오래 살아! 💍', from: '모모짱' },
      { miniMeId: 5, content: '행복한 순간을 오래도록 간직하길!', from: '모모짱' },
      { miniMeId: 6, content: '소중한 인연, 영원히 이어져라!', from: '모모짱' },
      { miniMeId: 7, content: '늘 오늘처럼 빛나는 날만 가득하길!', from: '모모짱' },
    ],
  },
] as const;
