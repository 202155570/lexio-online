export type Suit = 'cloud' | 'star' | 'moon' | 'sun';
export type TileNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export interface Tile {
  suit: Suit;
  number: TileNumber;
  id: string; // e.g. "cloud_3"
}

export type HandType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'straight'
  | 'flush'
  | 'fullhouse'
  | 'fourkind'
  | 'straightflush';

export interface Play {
  tiles: Tile[];
  handType: HandType;
}

export type GamePhase = 'waiting' | 'playing' | 'finished';

export interface Player {
  id: string;
  name: string;
  tiles: Tile[];
  passed: boolean;
  finishOrder?: number;
  score: number;
  ready: boolean;
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: Player[];
  currentTurn: number;     // index into players
  lastPlay: Play | null;
  lastPlayerId: string | null;
  tablePassCount: number;
  round: number;
  log: string[];
}

// Socket events server → client
export interface ServerToClientEvents {
  roomJoined: (data: { roomId: string; playerId: string; players: PlayerPublic[]; hostId: string | null; startingChips: number }) => void;
  playerJoined: (player: PlayerPublic) => void;
  playerLeft: (playerId: string) => void;
  lobbyUpdate: (data: { players: PlayerPublic[]; hostId: string | null; startingChips: number }) => void;
  gameStarted: (data: { tiles: Tile[]; state: GameStatePublic }) => void;
  gameStateUpdate: (state: GameStatePublic) => void;
  yourTurn: () => void;
  playMade: (data: { player: PlayerPublic; play: Play; newState: GameStatePublic }) => void;
  playerPassed: (data: { player: PlayerPublic; newState: GameStatePublic }) => void;
  roundEnded: (data: { results: RoundResult[]; newState: GameStatePublic }) => void;
  gameEnded: (results: RoundResult[]) => void;
  error: (msg: string) => void;
}

// Socket events client → server
export interface ClientToServerEvents {
  joinRoom: (data: { roomId: string; playerName: string }) => void;
  setReady: (ready: boolean) => void;
  setStartingChips: (amount: number) => void;
  playTiles: (tiles: Tile[]) => void;
  pass: () => void;
  leaveRoom: () => void;
}

// Public player info (no full tile data for others)
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
  effectiveTiles: number; // 점수 계산에 쓰인 유효 타일 수 (2 보유 시 tilesLeft×2)
  doubled: boolean;       // 2 타일 보유로 ×2 적용 여부
  pointsGained: number;
  totalScore: number;
}
