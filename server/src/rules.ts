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

// Check if 5 tiles form a straight (consecutive numbers, any suits)
function isStraight(tiles: Tile[]): boolean {
  if (tiles.length !== 5) return false;
  const ranks = tiles.map(t => NUMBER_RANK[t.number]).sort((a, b) => a - b);
  // check consecutive
  for (let i = 1; i < 5; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  // all different numbers
  const nums = new Set(tiles.map(t => t.number));
  return nums.size === 5;
}

function isFlush(tiles: Tile[]): boolean {
  if (tiles.length !== 5) return false;
  const suit = tiles[0].suit;
  return tiles.every(t => t.suit === suit);
}

export function classifyHand(tiles: Tile[]): HandType | null {
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
    const sf = isStraight(tiles) && isFlush(tiles);
    if (sf) return 'straightflush';

    const numGroups = groupByNumber(tiles);
    const sizes = Object.values(numGroups).map(g => g.length).sort((a, b) => b - a);

    if (sizes[0] === 4) return 'fourkind';
    if (sizes[0] === 3 && sizes[1] === 2) return 'fullhouse';
    if (isFlush(tiles)) return 'flush';
    if (isStraight(tiles)) return 'straight';
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
export function comparePlays(a: Play, b: Play): number {
  const rankA = HAND_RANK[a.handType];
  const rankB = HAND_RANK[b.handType];

  // 5-card hands can beat other 5-card types
  if (rankA >= 3 && rankB >= 3) {
    if (rankB !== rankA) return rankB - rankA;
    // same 5-card type
    return compare5CardSameType(a, b);
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

function compare5CardSameType(a: Play, b: Play): number {
  switch (a.handType) {
    case 'straight':
    case 'straightflush': {
      const ha = highestTile(a.tiles);
      const hb = highestTile(b.tiles);
      const numDiff = NUMBER_RANK[hb.number] - NUMBER_RANK[ha.number];
      if (numDiff !== 0) return numDiff;
      return SUIT_RANK[hb.suit] - SUIT_RANK[ha.suit];
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

export function canPlay(incoming: Play, table: Play | null): boolean {
  if (!table) return true;

  const handRank = HAND_RANK[incoming.handType];
  const tableRank = HAND_RANK[table.handType];

  // 5-card plays can be challenged by any higher-ranked 5-card play
  if (tableRank >= 3) {
    if (handRank < 3) return false;
    return comparePlays(table, incoming) > 0;
  }

  // 1-3 card plays must match count and type
  if (incoming.tiles.length !== table.tiles.length) return false;
  if (incoming.handType !== table.handType) return false;
  return comparePlays(table, incoming) > 0;
}

export function buildDeck(): Tile[] {
  const suits: Suit[] = ['cloud', 'star', 'moon', 'sun'];
  const numbers: TileNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const deck: Tile[] = [];
  for (const suit of suits) {
    for (const number of numbers) {
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
