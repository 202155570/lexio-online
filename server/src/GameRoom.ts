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

  constructor(roomId: string) {
    this.id = roomId;
    this.state = this.emptyState(roomId);
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
      score: 0, ready: false,
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

    // check if player finished
    if (player.tiles.length === 0) {
      const finishedCount = this.players.filter(p => p.finishOrder !== undefined).length;
      player.finishOrder = finishedCount + 1;
      this.log(`${player.name} 님이 ${player.finishOrder}등으로 완료!`);
    }

    // check if game should end (all but one finished, or all finished)
    const remaining = this.players.filter(p => p.tiles.length > 0);
    if (remaining.length <= 1) {
      if (remaining.length === 1) {
        const last = remaining[0];
        last.finishOrder = this.players.length;
        this.log(`${last.name} 님이 꼴등입니다.`);
      }
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
    const finishOrders = this.players.map((p, i) => ({
      ...p,
      finishOrder: p.finishOrder ?? this.players.length,
    }));

    // Sort by finish order
    const sorted = [...finishOrders].sort((a, b) => a.finishOrder - b.finishOrder);

    // Effective tile count (×2 if holding any "2" tile)
    const effectiveTiles = (p: Player) => {
      const hasTwo = p.tiles.some(t => t.number === 2);
      return hasTwo ? p.tiles.length * 2 : p.tiles.length;
    };

    const results: RoundResult[] = [];
    for (const player of this.players) {
      const myEff = effectiveTiles(player);
      let points = 0;
      for (const other of this.players) {
        if (other === player) continue;
        const otherOrder = other.finishOrder ?? this.players.length;
        const myOrder = player.finishOrder ?? this.players.length;
        if (otherOrder > myOrder) {
          points += effectiveTiles(other) - myEff;
        }
      }
      points = Math.max(0, points);
      player.score += points;

      results.push({
        playerId: player.id,
        name: player.name,
        finishOrder: player.finishOrder ?? this.players.length,
        tilesLeft: player.tiles.length,
        pointsGained: points,
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
