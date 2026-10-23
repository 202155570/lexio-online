import type { Tile, Suit, TileNumber, HandType, Play } from './types.js';

export const NUMBER_RANK: Record<number, number> = {
  3: 0, 4: 1, 5: 2, 6: 3, 7: 4, 8: 5, 9: 6,
  10: 7, 11: 8, 12: 9, 13: 10, 14: 11, 15: 12,
  1: 13, 2: 14,
};

export const SUIT_RANK: Record<Suit, number> = {
  cloud: 0, star: 1, moon: 2, sun: 3,
};

export function tileRank(t: Tile): number {
  return NUMBER_RANK[t.number] * 4 + SUIT_RANK[t.suit];
}

function sorted(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => tileRank(a) - tileRank(b));
}

function highestTile(tiles: Tile[]): Tile {
  return tiles.reduce((a, b) => tileRank(a) > tileRank(b) ? a : b);
}

// 스트레이트 순서열: 1,2,3,…,max,1,2 — 1·2는 맨 앞(1-2-3-4-5)이나 맨 뒤(…-max-1-2)에만 붙는다.
// 이 순서열의 연속 5칸이 유효 스트레이트이고, 시작 위치가 곧 서열이다(끝 숫자 기준, 클수록 강함).
// 예) max=9: 1-2-3-4-5(0) … 6-7-8-9-1(5), 7-8-9-1-2(6) / 8-9-1-2-3 은 불가
function straightSequence(maxNumber: number): number[] {
  const seq: number[] = [];
  for (let n = 1; n <= maxNumber; n++) seq.push(n);
  seq.push(1, 2);
  return seq;
}

// 스트레이트면 순서열 시작 위치(서열), 아니면 -1
export function straightIndex(tiles: Tile[], maxNumber: number = 15): number {
  if (tiles.length !== 5) return -1;
  const nums = new Set<number>(tiles.map(t => t.number));
  if (nums.size !== 5) return -1;
  const seq = straightSequence(maxNumber);
  for (let i = 0; i + 5 <= seq.length; i++) {
    if (seq.slice(i, i + 5).every(n => nums.has(n))) return i;
  }
  return -1;
}

// 스트레이트의 끝 숫자 타일 (동률 비교용)
function straightEndTile(tiles: Tile[], maxNumber: number): Tile {
  const end = straightSequence(maxNumber)[straightIndex(tiles, maxNumber) + 4];
  return tiles.find(t => t.number === end)!;
}

function isStraight(tiles: Tile[], maxNumber: number): boolean {
  return straightIndex(tiles, maxNumber) >= 0;
}

function isFlush(tiles: Tile[]): boolean {
  if (tiles.length !== 5) return false;
  const suit = tiles[0].suit;
  return tiles.every(t => t.suit === suit);
}

export function classifyHand(tiles: Tile[], maxNumber: number = 15): HandType | null {
  const n = tiles.length;
  if (n === 1) return 'single';

  if (n === 2) {
    if (tiles[0].number === tiles[1].number) return 'pair';
    return null;
  }

  if (n === 3) {
    if (tiles.every(t => t.number === tiles[0].number)) return 'triple';
    return null;
  }

  if (n === 5) {
    const sf = isStraight(tiles, maxNumber) && isFlush(tiles);
    if (sf) return 'straightflush';

    const numGroups = groupByNumber(tiles);
    const sizes = Object.values(numGroups).map(g => g.length).sort((a, b) => b - a);

    if (sizes[0] === 4) return 'fourkind';
    if (sizes[0] === 3 && sizes[1] === 2) return 'fullhouse';
    if (isFlush(tiles)) return 'flush';
    if (isStraight(tiles, maxNumber)) return 'straight';
    return null;
  }

  return null;
}

function groupByNumber(tiles: Tile[]): Record<number, Tile[]> {
  const groups: Record<number, Tile[]> = {};
  for (const t of tiles) {
    if (!groups[t.number]) groups[t.number] = [];
    groups[t.number].push(t);
  }
  return groups;
}

const HAND_RANK: Record<HandType, number> = {
  single: 0, pair: 1, triple: 2,
  straight: 3, flush: 4, fullhouse: 5, fourkind: 6, straightflush: 7,
};

// Compare two plays of the same type (returns positive if b beats a)
export function comparePlays(a: Play, b: Play, maxNumber: number = 15): number {
  const rankA = HAND_RANK[a.handType];
  const rankB = HAND_RANK[b.handType];

  // 5-card hands can beat other 5-card types
  if (rankA >= 3 && rankB >= 3) {
    if (rankB !== rankA) return rankB - rankA;
    // same 5-card type
    return compare5CardSameType(a, b, maxNumber);
  }

  // 1-3 card must be same type
  if (a.handType !== b.handType) return 0; // invalid challenge

  switch (a.handType) {
    case 'single': return tileRank(highestTile(b.tiles)) - tileRank(highestTile(a.tiles));
    case 'pair': {
      const numDiff = NUMBER_RANK[b.tiles[0].number] - NUMBER_RANK[a.tiles[0].number];
      if (numDiff !== 0) return numDiff;
      return tileRank(highestTile(b.tiles)) - tileRank(highestTile(a.tiles));
    }
    case 'triple': {
      const numDiff = NUMBER_RANK[b.tiles[0].number] - NUMBER_RANK[a.tiles[0].number];
      if (numDiff !== 0) return numDiff;
      return tileRank(highestTile(b.tiles)) - tileRank(highestTile(a.tiles));
    }
    default: return 0;
  }
}

function compare5CardSameType(a: Play, b: Play, maxNumber: number): number {
  switch (a.handType) {
    case 'straight':
    case 'straightflush': {
      // 끝 숫자 기준 → 같으면 끝 타일의 문양
      const idxDiff = straightIndex(b.tiles, maxNumber) - straightIndex(a.tiles, maxNumber);
      if (idxDiff !== 0) return idxDiff;
      const ea = straightEndTile(a.tiles, maxNumber);
      const eb = straightEndTile(b.tiles, maxNumber);
      return SUIT_RANK[eb.suit] - SUIT_RANK[ea.suit];
    }
    case 'flush': {
      const ha = highestTile(a.tiles);
      const hb = highestTile(b.tiles);
      const suitDiff = SUIT_RANK[hb.suit] - SUIT_RANK[ha.suit];
      if (suitDiff !== 0) return suitDiff;
      return tileRank(hb) - tileRank(ha);
    }
    case 'fullhouse': {
      const tripleA = getTripleNumber(a.tiles);
      const tripleB = getTripleNumber(b.tiles);
      return NUMBER_RANK[tripleB] - NUMBER_RANK[tripleA];
    }
    case 'fourkind': {
      const fourA = getFourNumber(a.tiles);
      const fourB = getFourNumber(b.tiles);
      return NUMBER_RANK[fourB] - NUMBER_RANK[fourA];
    }
    default: return 0;
  }
}

function getTripleNumber(tiles: Tile[]): TileNumber {
  const groups = groupByNumber(tiles);
  for (const [num, group] of Object.entries(groups)) {
    if (group.length === 3) return Number(num) as TileNumber;
  }
  return tiles[0].number;
}

function getFourNumber(tiles: Tile[]): TileNumber {
  const groups = groupByNumber(tiles);
  for (const [num, group] of Object.entries(groups)) {
    if (group.length === 4) return Number(num) as TileNumber;
  }
  return tiles[0].number;
}

export function canPlay(incoming: Play, table: Play | null, maxNumber: number = 15): boolean {
  if (!table) return true;

  const handRank = HAND_RANK[incoming.handType];
  const tableRank = HAND_RANK[table.handType];

  // 5-card plays can be challenged by any higher-ranked 5-card play
  if (tableRank >= 3) {
    if (handRank < 3) return false;
    return comparePlays(table, incoming, maxNumber) > 0;
  }

  // 1-3 card plays must match count and type
  if (incoming.tiles.length !== table.tiles.length) return false;
  if (incoming.handType !== table.handType) return false;
  return comparePlays(table, incoming, maxNumber) > 0;
}

// 2 타일 페널티: 보유한 2 한 장마다 남은 타일 수 ×2 (중첩: 1장 ×2, 2장 ×4, 3장 ×8 …)
export function twoMultiplier(tiles: Tile[]): number {
  return 2 ** tiles.filter(t => t.number === 2).length;
}

// 렉시오 공식 인원별 구성: 사용 숫자(1~maxNumber) × 4문양, 인당 perPlayer장
//   3명: 1~9 (36장) 12장씩 / 4명: 1~13 (52장) 13장씩 / 5명: 1~15 (60장) 12장씩
export const PLAYER_CONFIG: Record<number, { maxNumber: number; perPlayer: number }> = {
  3: { maxNumber: 9, perPlayer: 12 },
  4: { maxNumber: 13, perPlayer: 13 },
  5: { maxNumber: 15, perPlayer: 12 },
};

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 5;

// 숫자 1~maxNumber 만 사용하는 덱 생성 (1,2는 항상 최고 서열로 포함됨)
export function buildDeck(maxNumber: number = 15): Tile[] {
  const suits: Suit[] = ['cloud', 'star', 'moon', 'sun'];
  const deck: Tile[] = [];
  for (const suit of suits) {
    for (let n = 1; n <= maxNumber; n++) {
      const number = n as TileNumber;
      deck.push({ suit, number, id: `${suit}_${number}` });
    }
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
