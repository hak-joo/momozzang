import type { GuestBook } from '../types';
import { DEFAULT_MINI_MESSAGES, MAX_MINI_ROOM_MINIS } from '../constants';

export function prepareMiniRoomEntries(entries: GuestBook[]): GuestBook[] {
  const sorted = [...entries].sort((a, b) => a.id - b.id);
  const latest = sorted.slice(-MAX_MINI_ROOM_MINIS).reverse();

  if (latest.length >= MAX_MINI_ROOM_MINIS) {
    return latest;
  }

  const fillers: GuestBook[] = [];
  const need = MAX_MINI_ROOM_MINIS - latest.length;

  for (let index = 0; index < need && index < DEFAULT_MINI_MESSAGES.length; index += 1) {
    fillers.push({
      id: -1000 - index,
      miniMeId: DEFAULT_MINI_MESSAGES[index].miniMeId,
      contents: DEFAULT_MINI_MESSAGES[index].contents,
    });
  }

  return [...latest, ...fillers];
}
