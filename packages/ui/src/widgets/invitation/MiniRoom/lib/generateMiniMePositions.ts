export interface RestrictedZone {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

export interface Position {
  x: number;
  y: number;
}

const MIN_DISTANCE = 12; // percent points
const MAX_ATTEMPTS_FACTOR = 25;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const createSeededRandom = (seed: number) => {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const isInZone = (pos: Position, zone: RestrictedZone) =>
  pos.x >= zone.x1 && pos.x <= zone.x2 && pos.y >= zone.y1 && pos.y <= zone.y2;

const isTooClose = (pos: Position, others: Position[]) =>
  others.some((existing) => {
    const dx = existing.x - pos.x;
    const dy = existing.y - pos.y;
    return Math.hypot(dx, dy) < MIN_DISTANCE;
  });

export interface GeneratePositionsOptions {
  count: number;
  seed?: number;
  restrictedZones?: RestrictedZone[];
  frame?: {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
  };
}

export function generateMiniMePositions({
  count,
  seed = Date.now(),
  restrictedZones = [],
  frame = {
    minX: 10,
    maxX: 90,
    minY: 28,
    maxY: 92,
  },
}: GeneratePositionsOptions): Position[] {
  const rng = createSeededRandom(seed);
  const positions: Position[] = [];
  const { minX = 0, maxX = 100, minY = 0, maxY = 100 } = frame;
  const attemptsLimit = Math.max(count * MAX_ATTEMPTS_FACTOR, 100);
  let attempts = 0;

  while (positions.length < count && attempts < attemptsLimit) {
    attempts += 1;
    const candidate: Position = {
      x: clamp(minX + rng() * (maxX - minX), minX, maxX),
      y: clamp(minY + rng() * (maxY - minY), minY, maxY),
    };

    if (restrictedZones.some((zone) => isInZone(candidate, zone))) continue;
    if (isTooClose(candidate, positions)) continue;

    positions.push(candidate);
  }

  // fallback: spread evenly if RNG couldn't find enough safe spots
  if (positions.length < count) {
    const remaining = count - positions.length;
    for (let i = 0; i < remaining; i += 1) {
      const fallback: Position = {
        x: minX + ((maxX - minX) / Math.max(1, remaining)) * (i + 0.5),
        y: clamp(minY + (i % 2 === 0 ? 20 : 35), minY, maxY),
      };
      if (restrictedZones.some((zone) => isInZone(fallback, zone))) continue;
      positions.push(fallback);
    }
  }

  return positions.slice(0, count);
}
