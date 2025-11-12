import { Suspense } from 'react';
import { MiniRoomSkeleton } from './MiniRoomSkeleton';
import { MiniRoom } from './MiniRoom';

export default function MiniRoomMain() {
  return (
    <Suspense fallback={<MiniRoomSkeleton />}>
      <MiniRoom />
    </Suspense>
  );
}
