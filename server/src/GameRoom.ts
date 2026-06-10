import type {
  Tile, Player, GameState, GamePhase, Play,
  PlayerPublic, GameStatePublic, RoundResult,
} from './types.js';
import {
  buildDeck, shuffle, classifyHand, canPlay, NUMBER_RANK,
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
      log: [],
    };
  }

  addPlayer(id: string, name: string): boolean {
    if (this.players.length >= 6) return false;
    if (this.state.phase === 'playing') return false;
    if (this.players.find(p => p.id === id)) return false;

    const player: Player = {
      id, name, tiles: [], passed: false,
      score: this.startingChips, ready: false,
    };
    this.players.push(player);
    this.state.players = this.players;
    this.log(`${name} 님이 입장했습니다.`);
    return true;
  }

  removePlayer(id: string) {
    this.players = this.players.filter(p => p.id !== id);
    this.state.players = this.players;
  }

  setReady(playerId: string, ready: boolean) {
    const p = this.players.find(p => p.id === playerId);
    if (p) p.ready = ready;
  }

  canStart(): boolean {
    return this.players.length >= 2
      && this.state.phase === 'waiting'
      && this.players.every(p => p.ready);
  }

  startGame(): GameState {
    const count = this.players.length;
    const deck = shuffle(buildDeck());

    // deal tiles evenly (drop remainder tiles for 6p edge case)
    const perPlayer = Math.floor(60 / count);
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
    this.state.round++;
    this.state.players = this.players;
    this.log('게임이 시작되었습니다!');
    this.log(`${this.players[this.state.currentTurn].name} 님이 선입니다.`);
    return this.state;
  }

  playTiles(playerId: string, tiles: Tile[]): { ok: boolean; error?: string; ended?: boolean } {
    const playerIdx = this.players.findIndex(p => p.id === playerId);
    if (playerIdx < 0) return { ok: false, error: '플레이어를 찾을 수 없습니다.' };
    if (this.state.currentTurn !== playerIdx) return { ok: false, error: '당신의 턴이 아닙니다.' };
    if (this.state.phase !== 'playing') return { ok: false, error: '게임이 진행 중이 아닙니다.' };

    const player = this.players[playerIdx];

    // validate tiles belong to player
    for (const t of tiles) {
      if (!player.tiles.find(pt => pt.id === t.id)) {
        return { ok: false, error: '보유하지 않은 타일입니다.' };
      }
    }

    const handType = classifyHand(tiles);
    if (!handType) return { ok: false, error: '유효하지 않은 조합입니다.' };

    const play: Play = { tiles, handType };
    if (!canPlay(play, this.state.lastPlay)) {
      return { ok: false, error: '현재 조합보다 낮거나 패를 낼 수 없습니다.' };
    }

    // remove tiles from hand
    player.tiles = player.tiles.filter(pt => !tiles.find(t => t.id === pt.id));
    this.state.lastPlay = play;
    this.state.lastPlayerId = playerId;
    this.state.tablePassCount = 0;

    // reset others' passed state since last play was by this player
    this.players.forEach(p => { p.passed = false; });

    this.log(`${player.name}: ${handType} (${tiles.length}장)`);

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
    const playerIdx = this.players.findIndex(p => p.id === playerId);
    if (playerIdx < 0) return { ok: false, error: '플레이어를 찾을 수 없습니다.' };
    if (this.state.currentTurn !== playerIdx) return { ok: false, error: '당신의 턴이 아닙니다.' };

    const player = this.players[playerIdx];
    player.passed = true;
    this.state.tablePassCount++;
    this.log(`${player.name}: 패스`);

    // Count active players (not finished)
    const activePlayers = this.players.filter(p => p.tiles.length > 0);
    // Count passes among active players (excluding last play maker)
    const lastPlayMakerIdx = this.players.findIndex(p => p.id === this.state.lastPlayerId);
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
    // 유효 타일 수: 2 타일을 보유하면 남은 타일 수를 ×2로 간주 (페널티)
    const effectiveTiles = (p: Player) => {
      const hasTwo = p.tiles.some(t => t.number === 2);
      return hasTwo ? p.tiles.length * 2 : p.tiles.length;
    };

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

  getPlayerTiles(playerId: string): Tile[] {
    return this.players.find(p => p.id === playerId)?.tiles ?? [];
  }

  getPublicState(): GameStatePublic {
    return {
      roomId: this.state.roomId,
      phase: this.state.phase,
      players: this.players.map(toPublic),
      currentTurn: this.state.currentTurn,
      lastPlay: this.state.lastPlay,
      lastPlayerId: this.state.lastPlayerId,
      round: this.state.round,
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
  };
}
