import miniMeSpriteSheet from '@shared/assets/images/mini-me.png';

export const MINI_ME_BASE_WIDTH = 40;
export const MINI_ME_BASE_HEIGHT = 60;
export const MINI_ME_GAP = 10;
export const MINI_ME_COLUMNS = 4;
export const MINI_ME_ROWS = 9;
export const MINI_ME_COUNT = 33;
export const MINI_ME_SPRITE_SCALE = 2; // retina sprite (2x)

const ACTUAL_CELL_WIDTH = MINI_ME_BASE_WIDTH * MINI_ME_SPRITE_SCALE; // 80
const ACTUAL_CELL_HEIGHT = MINI_ME_BASE_HEIGHT * MINI_ME_SPRITE_SCALE; // 120
const ACTUAL_GAP = MINI_ME_GAP * MINI_ME_SPRITE_SCALE; // 20

export const MINI_ME_SPRITE_WIDTH =
  MINI_ME_COLUMNS * ACTUAL_CELL_WIDTH + (MINI_ME_COLUMNS - 1) * ACTUAL_GAP; // 380
export const MINI_ME_SPRITE_HEIGHT =
  MINI_ME_ROWS * ACTUAL_CELL_HEIGHT + (MINI_ME_ROWS - 1) * ACTUAL_GAP; // 1240

const STEP_X = ACTUAL_CELL_WIDTH + ACTUAL_GAP;
const STEP_Y = ACTUAL_CELL_HEIGHT + ACTUAL_GAP;

export const MINI_ME_IDS = Object.freeze(
  Array.from({ length: MINI_ME_COUNT }, (_, index) => index + 1),
);

const preloadedSprite = { status: false };

const primeSprite = () => {
  if (preloadedSprite.status) return;
  if (typeof window === 'undefined' || typeof Image === 'undefined') return;

  const img = new Image();
  img.decoding = 'async';
  img.loading = 'eager';
  img.src = miniMeSpriteSheet;
  preloadedSprite.status = true;
};

export interface MiniMeSpriteOffset {
  column: number;
  row: number;
  offsetX: number;
  offsetY: number;
}

export function getMiniMeSpriteOffset(id: number): MiniMeSpriteOffset {
  if (id < 1 || id > MINI_ME_COUNT) {
    throw new Error(`Mini-me index ${id} is out of range (1 ~ ${MINI_ME_COUNT}).`);
  }

  const zeroBased = id - 1;
  const column = zeroBased % MINI_ME_COLUMNS;
  const row = Math.floor(zeroBased / MINI_ME_COLUMNS);

  return {
    column,
    row,
    offsetX: column * STEP_X,
    offsetY: row * STEP_Y,
  };
}

export function getMiniMeSpriteSheet() {
  primeSprite();
  return miniMeSpriteSheet;
}

export function preloadMiniMes(indexes?: number[]) {
  void indexes;
  primeSprite();
}
