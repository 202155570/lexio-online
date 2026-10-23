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
  id: string;        // 공개 플레이어 id (재접속해도 유지)
  token: string;     // 재접속 인증용 비밀 토큰 (클라이언트만 보관, 공개 안 함)
  socketId: string;  // 현재 연결된 소켓
  connected: boolean;
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
  maxNumber: number;       // 이번 라운드 덱의 최대 숫자 (스트레이트 판정용)
  log: string[];
}

interface LobbyData {
  players: PlayerPublic[];
  hostId: string | null;
  startingChips: number;
}

// Socket events server → client
export interface ServerToClientEvents {
  roomJoined: (data: LobbyData & { roomId: string; playerId: string }) => void;
  rejoined: (data: LobbyData & { roomId: string; playerId: string; state: GameStatePublic; tiles: Tile[] }) => void;
  rejoinFailed: () => void;
  playerJoined: (player: PlayerPublic) => void;
  playerLeft: (playerId: string) => void;
  lobbyUpdate: (data: LobbyData) => void;
  gameStarted: (data: { tiles: Tile[]; state: GameStatePublic }) => void;
  gameStateUpdate: (state: GameStatePublic) => void;
  handUpdate: (tiles: Tile[]) => void;
  yourTurn: () => void;
  playMade: (data: { player: PlayerPublic; play: Play; newState: GameStatePublic }) => void;
  playerPassed: (data: { player: PlayerPublic; newState: GameStatePublic }) => void;
  roundEnded: (data: { results: RoundResult[]; newState: GameStatePublic }) => void;
  roundAborted: (data: LobbyData & { reason: string }) => void;
  gameEnded: (results: RoundResult[]) => void;
  error: (msg: string) => void;
}

// Socket events client → server
export interface ClientToServerEvents {
  joinRoom: (data: { roomId: string; playerName: string; token: string }) => void;
  rejoinRoom: (data: { roomId: string; token: string }) => void;
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
  connected: boolean;
}

export interface GameStatePublic {
  roomId: string;
  phase: GamePhase;
  players: PlayerPublic[];
  currentTurn: number;
  lastPlay: Play | null;
  lastPlayerId: string | null;
  round: number;
  maxNumber: number;
  log: string[];
}

export interface RoundResult {
  playerId: string;
  name: string;
  finishOrder: number;
  tilesLeft: number;
  effectiveTiles: number; // 점수 계산에 쓰인 유효 타일 수 (tilesLeft × multiplier)
  multiplier: number;     // 2 타일 배수: 2^(보유한 2 개수), 2가 없으면 1
  pointsGained: number;
  totalScore: number;
}
