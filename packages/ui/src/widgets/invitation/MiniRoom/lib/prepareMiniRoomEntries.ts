import type { GuestBook } from '../types';
import { DEFAULT_MINI_CHARACTERS, DEFAULT_MINI_MESSAGES, MAX_MINI_ROOM_MINIS } from '../constants';

const DEFAULT_FILLER_IDS = DEFAULT_MINI_CHARACTERS.map((item) => item.miniMeId);

export function prepareMiniRoomEntries(entries: GuestBook[]): GuestBook[] {
  const sorted = [...entries].sort((a, b) => a.id - b.id);
  const latest = sorted.slice(-MAX_MINI_ROOM_MINIS).reverse();

  if (latest.length >= MAX_MINI_ROOM_MINIS) {
    return latest;
  }

  const fillers: GuestBook[] = [];
  const need = MAX_MINI_ROOM_MINIS - latest.length;

  for (let index = 0; index < need; index += 1) {
    const template = DEFAULT_MINI_MESSAGES[index % DEFAULT_MINI_MESSAGES.length];
    const miniId = DEFAULT_FILLER_IDS[index % DEFAULT_FILLER_IDS.length] ?? template.miniMeId ?? 1;

    fillers.push({
      id: -1000 - index,
      miniMeId: miniId,
      content: template.content,
    });
  }

  return [...latest, ...fillers];
}
