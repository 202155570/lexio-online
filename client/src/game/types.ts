export type Suit = 'cloud' | 'star' | 'moon' | 'sun';
export type TileNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export interface Tile {
  suit: Suit;
  number: TileNumber;
  id: string;
}

export type HandType =
  | 'single' | 'pair' | 'triple'
  | 'straight' | 'flush' | 'fullhouse' | 'fourkind' | 'straightflush';

export interface Play {
  tiles: Tile[];
  handType: HandType;
}

export type GamePhase = 'waiting' | 'playing' | 'finished';

export interface PlayerPublic {
  id: string;
  name: string;
  tileCount: number;
  passed: boolean;
  finishOrder?: number;
  score: number;
  ready: boolean;
}

export interface GameStatePublic {
  roomId: string;
  phase: GamePhase;
  players: PlayerPublic[];
  currentTurn: number;
  lastPlay: Play | null;
  lastPlayerId: string | null;
  round: number;
  log: string[];
}

export interface RoundResult {
  playerId: string;
  name: string;
  finishOrder: number;
  tilesLeft: number;
  pointsGained: number;
  totalScore: number;
}

export const SUIT_LABEL: Record<Suit, string> = {
  cloud: '구름', star: '별', moon: '달', sun: '해',
};

export const HAND_LABEL: Record<HandType, string> = {
  single: '싱글', pair: '페어', triple: '트리플',
  straight: '스트레이트', flush: '플러시',
  fullhouse: '풀하우스', fourkind: '포카드+1',
  straightflush: '스트레이트 플러시',
};

export const NUMBER_RANK: Record<number, number> = {
  3: 0, 4: 1, 5: 2, 6: 3, 7: 4, 8: 5, 9: 6,
  10: 7, 11: 8, 12: 9, 13: 10, 14: 11, 15: 12,
  1: 13, 2: 14,
};

export const SUIT_RANK: Record<Suit, number> = {
  cloud: 0, star: 1, moon: 2, sun: 3,
};
