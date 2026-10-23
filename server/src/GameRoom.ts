import { randomUUID } from 'crypto';
import type {
  Tile, Player, GameState, Play,
  PlayerPublic, GameStatePublic, RoundResult,
} from './types.js';
import {
  buildDeck, shuffle, classifyHand, canPlay, twoMultiplier,
  PLAYER_CONFIG, MIN_PLAYERS, MAX_PLAYERS,
} from './rules.js';

export class GameRoom {
  id: string;
  private players: Player[] = [];
  private state: GameState;
  private startingChips = 100; // 방장이 게임 시작 전 설정 가능

  constructor(roomId: string) {
    this.id = roomId;
    this.state = this.emptyState(roomId);
  }

  // 방장 = 가장 먼저 입장한(남아있는) 플레이어
  get hostId(): string | null {
    return this.players[0]?.id ?? null;
  }

  getStartingChips(): number {
    return this.startingChips;
  }

  // 방장만, 그리고 첫 라운드 시작 전(round===0)에만 변경 가능
  setStartingChips(playerId: string, amount: number): boolean {
    if (playerId !== this.hostId) return false;
    if (this.state.round !== 0) return false;
    if (typeof amount !== 'number' || !Number.isFinite(amount)) return false;
    const clamped = Math.max(10, Math.min(9999, Math.floor(amount)));
    this.startingChips = clamped;
    // 아직 게임 전이므로 전원 칩을 새 값으로 맞춤
    this.players.forEach(p => { p.score = clamped; });
    this.log(`방장이 시작 칩을 ${clamped}점으로 설정했습니다.`);
    return true;
  }

  private emptyState(roomId: string): GameState {
    return {
      roomId,
      phase: 'waiting',
      players: [],
      currentTurn: 0,
      lastPlay: null,
      lastPlayerId: null,
      tablePassCount: 0,
      round: 0,
      maxNumber: 15,
      log: [],
    };
  }

  addPlayer(name: string, token: string, socketId: string): Player | null {
    if (this.players.length >= MAX_PLAYERS) return null;
    if (this.state.phase === 'playing') return null;
    if (this.findByToken(token)) return null;

    const player: Player = {
      id: randomUUID(), token, socketId, connected: true,
      name, tiles: [], passed: false,
      score: this.startingChips, ready: false,
    };
    this.players.push(player);
    this.state.players = this.players;
    this.log(`${name} 님이 입장했습니다.`);
    return player;
  }

  findByToken(token: string): Player | undefined {
    return this.players.find(p => p.token === token);
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.find(p => p.id === playerId);
  }

  // 같은 토큰으로 돌아온 플레이어를 새 소켓에 다시 연결
  reconnect(token: string, socketId: string): Player | null {
    const p = this.findByToken(token);
    if (!p) return null;
    const wasDisconnected = !p.connected;
    p.socketId = socketId;
    p.connected = true;
    if (wasDisconnected) this.log(`${p.name} 님이 다시 접속했습니다.`);
    return p;
  }

  markDisconnected(playerId: string) {
    const p = this.getPlayer(playerId);
    if (!p) return;
    p.connected = false;
    this.log(`${p.name} 님의 연결이 끊겼습니다. 재접속을 기다립니다...`);
  }

  removePlayer(id: string) {
    this.players = this.players.filter(p => p.id !== id);
    this.state.players = this.players;
  }

  setReady(playerId: string, ready: boolean) {
    const p = this.getPlayer(playerId);
    if (p) p.ready = ready;
  }

  canStart(): boolean {
    const n = this.players.length;
    return n >= MIN_PLAYERS && n <= MAX_PLAYERS
      && this.state.phase === 'waiting'
      && this.players.every(p => p.ready && p.connected);
  }

  isPlaying(): boolean {
    return this.state.phase === 'playing';
  }

  startGame(): GameState {
    const count = this.players.length;
    // 인원별 공식 구성: 사용 숫자 범위와 인당 타일 수
    const cfg = PLAYER_CONFIG[count] ?? { maxNumber: 15, perPlayer: Math.floor(60 / count) };
    const deck = shuffle(buildDeck(cfg.maxNumber));
    const perPlayer = cfg.perPlayer;

    for (let i = 0; i < count; i++) {
      this.players[i].tiles = deck.slice(i * perPlayer, (i + 1) * perPlayer);
      this.players[i].passed = false;
      this.players[i].finishOrder = undefined;
    }

    // find player with cloud 3
    const firstIdx = this.players.findIndex(
      p => p.tiles.some(t => t.suit === 'cloud' && t.number === 3)
    );

    this.state.phase = 'playing';
    this.state.currentTurn = firstIdx >= 0 ? firstIdx : 0;
    this.state.lastPlay = null;
    this.state.lastPlayerId = null;
    this.state.tablePassCount = 0;
    this.state.maxNumber = cfg.maxNumber;
    this.state.round++;
    this.state.players = this.players;
    this.log(`게임 시작! (${count}인 · 숫자 1~${cfg.maxNumber} 사용 · 인당 ${perPlayer}장)`);
    this.log(`${this.players[this.state.currentTurn].name} 님이 선입니다.`);
    return this.state;
  }

  playTiles(playerId: string, tiles: Tile[]): { ok: boolean; error?: string; ended?: boolean } {
    if (this.state.phase !== 'playing') return { ok: false, error: '게임이 진행 중이 아닙니다.' };
    const playerIdx = this.players.findIndex(p => p.id === playerId);
    if (playerIdx < 0) return { ok: false, error: '플레이어를 찾을 수 없습니다.' };
    if (this.state.currentTurn !== playerIdx) return { ok: false, error: '당신의 턴이 아닙니다.' };

    const player = this.players[playerIdx];

    // 클라이언트가 보낸 값은 id만 믿고, 실제 숫자·문양은 서버가 가진 손패에서 가져온다
    if (!Array.isArray(tiles) || tiles.length === 0) {
      return { ok: false, error: '낼 타일을 선택하세요.' };
    }
    const ids = tiles.map(t => t?.id);
    if (ids.some(id => typeof id !== 'string')) {
      return { ok: false, error: '유효하지 않은 조합입니다.' };
    }
    if (new Set(ids).size !== ids.length) {
      return { ok: false, error: '같은 타일을 중복해서 낼 수 없습니다.' };
    }
    const owned = ids.map(id => player.tiles.find(pt => pt.id === id));
    if (owned.some(t => !t)) return { ok: false, error: '보유하지 않은 타일입니다.' };
    const playTiles = owned as Tile[];

    const handType = classifyHand(playTiles, this.state.maxNumber);
    if (!handType) return { ok: false, error: '유효하지 않은 조합입니다.' };

    const play: Play = { tiles: playTiles, handType };
    if (!canPlay(play, this.state.lastPlay, this.state.maxNumber)) {
      return { ok: false, error: '현재 조합보다 낮거나 패를 낼 수 없습니다.' };
    }

    // remove tiles from hand
    const playedIds = new Set(ids);
    player.tiles = player.tiles.filter(pt => !playedIds.has(pt.id));
    this.state.lastPlay = play;
    this.state.lastPlayerId = playerId;
    this.state.tablePassCount = 0;

    // reset others' passed state since last play was by this player
    this.players.forEach(p => { p.passed = false; });

    this.log(`${player.name}: ${handType} (${playTiles.length}장)`);

    // 렉시오 룰: 한 명이라도 패를 모두 내려놓는 순간 라운드 종료
    if (player.tiles.length === 0) {
      player.finishOrder = 1;
      this.log(`🎉 ${player.name} 님이 패를 모두 내려놨습니다! 라운드 종료`);
      this.state.phase = 'finished';
      return { ok: true, ended: true };
    }

    this.advanceTurn();
    return { ok: true };
  }

  pass(playerId: string): { ok: boolean; error?: string; newRound?: boolean } {
    if (this.state.phase !== 'playing') return { ok: false, error: '게임이 진행 중이 아닙니다.' };
    const playerIdx = this.players.findIndex(p => p.id === playerId);
    if (playerIdx < 0) return { ok: false, error: '플레이어를 찾을 수 없습니다.' };
    if (this.state.currentTurn !== playerIdx) return { ok: false, error: '당신의 턴이 아닙니다.' };
    if (!this.state.lastPlay) return { ok: false, error: '선은 패스할 수 없습니다. 아무 패나 내주세요.' };

    const player = this.players[playerIdx];
    player.passed = true;
    this.state.tablePassCount++;
    this.log(`${player.name}: 패스`);

    // Count active players (not finished)
    const activePlayers = this.players.filter(p => p.tiles.length > 0);
    // Count passes among active players (excluding last play maker)
    const otherActive = activePlayers.filter(p => p.id !== this.state.lastPlayerId);
    const allPassed = otherActive.every(p => p.passed);

    if (allPassed && this.state.lastPlayerId) {
      // New round - last play maker leads
      const newLeaderIdx = this.players.findIndex(p => p.id === this.state.lastPlayerId);
      this.players.forEach(p => { p.passed = false; });
      this.state.lastPlay = null;
      this.state.lastPlayerId = null;
      this.state.tablePassCount = 0;
      this.state.currentTurn = newLeaderIdx;
      this.log(`${this.players[newLeaderIdx].name} 님이 새로운 선이 됩니다.`);
      return { ok: true, newRound: true };
    }

    this.advanceTurn();
    return { ok: true };
  }

  private advanceTurn() {
    const n = this.players.length;
    let next = (this.state.currentTurn + 1) % n;
    let safety = 0;
    // skip finished players
    while (this.players[next].tiles.length === 0 && safety < n) {
      next = (next + 1) % n;
      safety++;
    }
    this.state.currentTurn = next;
  }

  calculateResults(): RoundResult[] {
    // 유효 타일 수: 2 타일 한 장마다 남은 타일 수 ×2 (중첩 페널티)
    const effectiveTiles = (p: Player) => p.tiles.length * twoMultiplier(p.tiles);

    // 등수 매기기: 패가 적을수록 높은 등수 (완주자=0장이 1등).
    // 동률(남은 타일 수 같음)은 공동 순위로 처리.
    const sortedByTiles = [...this.players].sort((a, b) => a.tiles.length - b.tiles.length);
    const orderOf = new Map<string, number>();
    let rank = 0;
    sortedByTiles.forEach((p, i) => {
      if (i === 0 || p.tiles.length !== sortedByTiles[i - 1].tiles.length) {
        rank = i + 1; // 표준 경쟁 순위 (1,2,2,4 ...)
      }
      orderOf.set(p.id, rank);
      p.finishOrder = rank;
    });

    // 제로섬 정산: 각 플레이어는 다른 모든 플레이어와 유효 타일 수 차이를 칩으로 교환.
    //   내 순이익 = Σ(상대 유효타일 - 내 유효타일)
    // → 패가 적은 사람이 많은 사람에게서 칩을 가져오고, 합계는 항상 0 (칩 보존).
    const results: RoundResult[] = [];
    for (const player of this.players) {
      const myEff = effectiveTiles(player);
      let net = 0;
      for (const other of this.players) {
        if (other === player) continue;
        net += effectiveTiles(other) - myEff;
      }
      player.score += net;

      results.push({
        playerId: player.id,
        name: player.name,
        finishOrder: orderOf.get(player.id) ?? this.players.length,
        tilesLeft: player.tiles.length,
        effectiveTiles: myEff,
        multiplier: player.tiles.length > 0 ? twoMultiplier(player.tiles) : 1,
        pointsGained: net,
        totalScore: player.score,
      });
    }

    return results.sort((a, b) => a.finishOrder - b.finishOrder);
  }

  resetForNextRound() {
    this.players.forEach(p => {
      p.tiles = [];
      p.passed = false;
      p.finishOrder = undefined;
      p.ready = false;
    });
    this.state.phase = 'waiting';
    this.state.lastPlay = null;
    this.state.lastPlayerId = null;
    this.state.tablePassCount = 0;
  }

  // 진행 중인 라운드를 정산 없이 무효 처리하고 대기실로 되돌린다
  abortRound(reason: string) {
    this.log(`라운드 무효: ${reason}`);
    this.resetForNextRound();
  }

  getPlayerTiles(playerId: string): Tile[] {
    return this.getPlayer(playerId)?.tiles ?? [];
  }

  publicPlayers(): PlayerPublic[] {
    return this.players.map(toPublic);
  }

  getPublicState(): GameStatePublic {
    return {
      roomId: this.state.roomId,
      phase: this.state.phase,
      players: this.publicPlayers(),
      currentTurn: this.state.currentTurn,
      lastPlay: this.state.lastPlay,
      lastPlayerId: this.state.lastPlayerId,
      round: this.state.round,
      maxNumber: this.state.maxNumber,
      log: this.state.log.slice(-20),
    };
  }

  getPlayers(): Player[] { return this.players; }
  getState(): GameState { return this.state; }
  playerCount(): number { return this.players.length; }

  private log(msg: string) {
    this.state.log.push(msg);
    if (this.state.log.length > 100) this.state.log.shift();
  }
}

function toPublic(p: Player): PlayerPublic {
  return {
    id: p.id,
    name: p.name,
    tileCount: p.tiles.length,
    passed: p.passed,
    finishOrder: p.finishOrder,
    score: p.score,
    ready: p.ready,
    connected: p.connected,
  };
}
