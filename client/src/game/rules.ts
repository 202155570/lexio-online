import type { Tile, Suit, TileNumber, HandType, Play } from './types';
import { NUMBER_RANK, SUIT_RANK } from './types';

export function tileRank(t: Tile): number {
  return NUMBER_RANK[t.number] * 4 + SUIT_RANK[t.suit];
}

// 숫자순 정렬 (같은 숫자면 문양으로) — 기본 서열 순서
export function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => tileRank(a) - tileRank(b));
}

// 문양순 정렬 (같은 문양끼리 모으고, 그 안에서 숫자순)
export function sortTilesBySuit(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    if (SUIT_RANK[a.suit] !== SUIT_RANK[b.suit]) {
      return SUIT_RANK[a.suit] - SUIT_RANK[b.suit];
    }
    return NUMBER_RANK[a.number] - NUMBER_RANK[b.number];
  });
}

function highestTile(tiles: Tile[]): Tile {
  return tiles.reduce((a, b) => tileRank(a) > tileRank(b) ? a : b);
}

function isStraight(tiles: Tile[]): boolean {
  if (tiles.length !== 5) return false;
  const nums = new Set(tiles.map(t => t.number));
  if (nums.size !== 5) return false;
  const ranks = tiles.map(t => NUMBER_RANK[t.number]).sort((a, b) => a - b);
  for (let i = 1; i < 5; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  return true;
}

function isFlush(tiles: Tile[]): boolean {
  if (tiles.length !== 5) return false;
  return tiles.every(t => t.suit === tiles[0].suit);
}

function groupByNumber(tiles: Tile[]): Record<number, Tile[]> {
  const g: Record<number, Tile[]> = {};
  for (const t of tiles) {
    if (!g[t.number]) g[t.number] = [];
    g[t.number].push(t);
  }
  return g;
}

export function classifyHand(tiles: Tile[]): HandType | null {
  const n = tiles.length;
  if (n === 1) return 'single';
  if (n === 2) return tiles[0].number === tiles[1].number ? 'pair' : null;
  if (n === 3) return tiles.every(t => t.number === tiles[0].number) ? 'triple' : null;
  if (n !== 5) return null;

  if (isStraight(tiles) && isFlush(tiles)) return 'straightflush';
  const sizes = Object.values(groupByNumber(tiles)).map(g => g.length).sort((a, b) => b - a);
  if (sizes[0] === 4) return 'fourkind';
  if (sizes[0] === 3 && sizes[1] === 2) return 'fullhouse';
  if (isFlush(tiles)) return 'flush';
  if (isStraight(tiles)) return 'straight';
  return null;
}

const HAND_RANK: Record<HandType, number> = {
  single: 0, pair: 1, triple: 2,
  straight: 3, flush: 4, fullhouse: 5, fourkind: 6, straightflush: 7,
};

export function canPlay(incoming: Play, table: Play | null): boolean {
  if (!table) return true;
  const hRank = HAND_RANK[incoming.handType];
  const tRank = HAND_RANK[table.handType];
  if (tRank >= 3) {
    if (hRank < 3) return false;
    return comparePlays(table, incoming) > 0;
  }
  if (incoming.tiles.length !== table.tiles.length) return false;
  if (incoming.handType !== table.handType) return false;
  return comparePlays(table, incoming) > 0;
}

export function comparePlays(a: Play, b: Play): number {
  const rA = HAND_RANK[a.handType];
  const rB = HAND_RANK[b.handType];
  if (rA >= 3 && rB >= 3 && rA !== rB) return rB - rA;

  switch (a.handType) {
    case 'single': return tileRank(highestTile(b.tiles)) - tileRank(highestTile(a.tiles));
    case 'pair':
    case 'triple': {
      const nd = NUMBER_RANK[b.tiles[0].number] - NUMBER_RANK[a.tiles[0].number];
      if (nd !== 0) return nd;
      return tileRank(highestTile(b.tiles)) - tileRank(highestTile(a.tiles));
    }
    case 'straight':
    case 'straightflush': {
      const ha = highestTile(a.tiles), hb = highestTile(b.tiles);
      const nd = NUMBER_RANK[hb.number] - NUMBER_RANK[ha.number];
      return nd !== 0 ? nd : SUIT_RANK[hb.suit] - SUIT_RANK[ha.suit];
    }
    case 'flush': {
      const ha = highestTile(a.tiles), hb = highestTile(b.tiles);
      const sd = SUIT_RANK[hb.suit] - SUIT_RANK[ha.suit];
      return sd !== 0 ? sd : tileRank(hb) - tileRank(ha);
    }
    case 'fullhouse': {
      const getTriple = (tiles: Tile[]) => {
        const g = groupByNumber(tiles);
        return Object.entries(g).find(([, v]) => v.length === 3)?.[0] ?? '0';
      };
      return NUMBER_RANK[Number(getTriple(b.tiles))] - NUMBER_RANK[Number(getTriple(a.tiles))];
    }
    case 'fourkind': {
      const getFour = (tiles: Tile[]) => {
        const g = groupByNumber(tiles);
        return Object.entries(g).find(([, v]) => v.length === 4)?.[0] ?? '0';
      };
      return NUMBER_RANK[Number(getFour(b.tiles))] - NUMBER_RANK[Number(getFour(a.tiles))];
    }
  }
  return 0;
}
