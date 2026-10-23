import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import type {
  ServerToClientEvents, ClientToServerEvents,
} from './types.js';
import { GameRoom } from './GameRoom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 게임 중 연결이 끊긴 플레이어를 기다리는 시간. 넘기면 라운드 무효.
const RECONNECT_GRACE_MS = Number(process.env.LEXIO_RECONNECT_GRACE_MS ?? 60_000);

const app = express();
app.use(cors({ origin: '*' }));
app.get('/health', (_req, res) => res.json({ ok: true }));

// In production, serve the built client (client/dist) from this same server.
// This makes the app a single deployable unit — the client connects to the
// same origin via socket.io, so no separate URL config is needed.
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log(`Serving client build from ${clientDist}`);
}

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
});

const rooms = new Map<string, GameRoom>();
const graceTimers = new Map<string, NodeJS.Timeout>(); // playerId → 재접속 대기 타이머

function getOrCreateRoom(roomId: string): GameRoom {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new GameRoom(roomId));
  }
  return rooms.get(roomId)!;
}

function lobbyData(room: GameRoom) {
  return {
    players: room.publicPlayers(),
    hostId: room.hostId,
    startingChips: room.getStartingChips(),
  };
}

function clearGrace(playerId: string) {
  const t = graceTimers.get(playerId);
  if (t) clearTimeout(t);
  graceTimers.delete(playerId);
}

// 플레이어를 방에서 내보낸다. 라운드 진행 중이면 그 라운드는 정산 없이 무효.
function removeFromRoom(room: GameRoom, playerId: string, reason: string) {
  clearGrace(playerId);
  const wasPlaying = room.isPlaying();
  if (wasPlaying) room.abortRound(reason);
  room.removePlayer(playerId);
  io.to(room.id).emit('playerLeft', playerId);

  if (room.playerCount() === 0) {
    rooms.delete(room.id);
    return;
  }
  if (wasPlaying) {
    io.to(room.id).emit('roundAborted', { ...lobbyData(room), reason });
  } else {
    // 남은 인원에게 방장 재지정/칩 상태 동기화
    io.to(room.id).emit('lobbyUpdate', lobbyData(room));
  }
}

function cleanText(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

io.on('connection', (socket) => {
  let current: { roomId: string; playerId: string } | null = null;

  const currentRoom = () => (current ? rooms.get(current.roomId) : undefined);

  // 재접속한 플레이어에게 방·게임 상태 전체를 다시 보내준다
  const sendRejoined = (room: GameRoom, playerId: string) => {
    clearGrace(playerId);
    current = { roomId: room.id, playerId };
    socket.join(room.id);
    socket.emit('rejoined', {
      roomId: room.id,
      playerId,
      ...lobbyData(room),
      state: room.getPublicState(),
      tiles: room.getPlayerTiles(playerId),
    });
    if (room.isPlaying()) {
      socket.to(room.id).emit('gameStateUpdate', room.getPublicState());
      if (room.getPlayers()[room.getState().currentTurn]?.id === playerId) socket.emit('yourTurn');
    } else {
      socket.to(room.id).emit('lobbyUpdate', lobbyData(room));
    }
  };

  socket.on('joinRoom', (data) => {
    const roomId = cleanText(data?.roomId, 10).toUpperCase();
    const playerName = cleanText(data?.playerName, 20);
    const token = cleanText(data?.token, 100);
    if (!roomId || !playerName || !token) {
      socket.emit('error', '방 코드와 닉네임을 확인해주세요.');
      return;
    }

    if (current) {
      const oldRoom = currentRoom();
      socket.leave(current.roomId);
      if (oldRoom) removeFromRoom(oldRoom, current.playerId, '플레이어가 다른 방으로 이동했습니다.');
      current = null;
    }

    const room = getOrCreateRoom(roomId);

    // 같은 토큰이 이미 이 방에 있으면 새 입장이 아니라 재접속
    const existing = room.reconnect(token, socket.id);
    if (existing) {
      sendRejoined(room, existing.id);
      return;
    }

    const player = room.addPlayer(playerName, token, socket.id);
    if (!player) {
      if (room.playerCount() === 0) rooms.delete(roomId);
      socket.emit('error', '방에 입장할 수 없습니다. (만원이거나 게임 중)');
      return;
    }

    current = { roomId, playerId: player.id };
    socket.join(roomId);

    socket.emit('roomJoined', { roomId, playerId: player.id, ...lobbyData(room) });

    // 입장/방장/칩 상태를 방 전체에 동기화
    io.to(roomId).emit('lobbyUpdate', lobbyData(room));
  });

  socket.on('rejoinRoom', (data) => {
    const roomId = cleanText(data?.roomId, 10).toUpperCase();
    const token = cleanText(data?.token, 100);
    const room = rooms.get(roomId);
    const player = room && token ? room.reconnect(token, socket.id) : null;
    if (!room || !player) {
      socket.emit('rejoinFailed');
      return;
    }
    if (current && current.playerId !== player.id) {
      const oldRoom = currentRoom();
      socket.leave(current.roomId);
      if (oldRoom) removeFromRoom(oldRoom, current.playerId, '플레이어가 다른 방으로 이동했습니다.');
    }
    sendRejoined(room, player.id);
  });

  socket.on('setStartingChips', (amount) => {
    const room = currentRoom();
    if (!current || !room) return;
    if (!room.setStartingChips(current.playerId, amount)) return;
    io.to(room.id).emit('lobbyUpdate', lobbyData(room));
  });

  socket.on('setReady', (ready) => {
    const room = currentRoom();
    if (!current || !room) return;

    room.setReady(current.playerId, ready === true);
    io.to(room.id).emit('lobbyUpdate', lobbyData(room));

    if (room.canStart()) {
      const state = room.startGame();
      for (const player of room.getPlayers()) {
        io.to(player.socketId).emit('gameStarted', {
          tiles: room.getPlayerTiles(player.id),
          state: room.getPublicState(),
        });
      }
      const currentPlayer = room.getPlayers()[state.currentTurn];
      io.to(currentPlayer.socketId).emit('yourTurn');
    }
  });

  socket.on('playTiles', (tiles) => {
    const room = currentRoom();
    if (!current || !room) return;
    const playerId = current.playerId;

    const result = room.playTiles(playerId, tiles);
    if (!result.ok) {
      socket.emit('error', result.error ?? '알 수 없는 오류');
      // 클라이언트가 미리 빼둔 패를 서버 기준 손패로 되돌린다
      socket.emit('handUpdate', room.getPlayerTiles(playerId));
      return;
    }

    const lastPlay = room.getState().lastPlay!;

    if (result.ended) {
      // 정산을 먼저 해서 방송하는 상태에 최종 점수·순위가 담기게 한다
      const results = room.calculateResults();
      const publicState = room.getPublicState();
      const playerPublic = publicState.players.find(p => p.id === playerId)!;
      io.to(room.id).emit('playMade', { player: playerPublic, play: lastPlay, newState: publicState });
      io.to(room.id).emit('roundEnded', { results, newState: publicState });
      room.resetForNextRound();
      return;
    }

    const publicState = room.getPublicState();
    const playerPublic = publicState.players.find(p => p.id === playerId)!;
    io.to(room.id).emit('playMade', { player: playerPublic, play: lastPlay, newState: publicState });

    const nextPlayer = room.getPlayers()[room.getState().currentTurn];
    io.to(nextPlayer.socketId).emit('yourTurn');
  });

  socket.on('pass', () => {
    const room = currentRoom();
    if (!current || !room) return;
    const playerId = current.playerId;

    const result = room.pass(playerId);
    if (!result.ok) {
      socket.emit('error', result.error ?? '알 수 없는 오류');
      return;
    }

    const publicState = room.getPublicState();
    const playerPublic = publicState.players.find(p => p.id === playerId)!;
    io.to(room.id).emit('playerPassed', { player: playerPublic, newState: publicState });

    const nextPlayer = room.getPlayers()[room.getState().currentTurn];
    io.to(nextPlayer.socketId).emit('yourTurn');
  });

  socket.on('leaveRoom', () => {
    const room = currentRoom();
    if (current && room) {
      const name = room.getPlayer(current.playerId)?.name ?? '플레이어';
      socket.leave(room.id);
      removeFromRoom(room, current.playerId, `${name} 님이 나갔습니다.`);
    }
    current = null;
  });

  socket.on('disconnect', () => {
    const room = currentRoom();
    if (!current || !room) return;
    const { playerId } = current;
    const player = room.getPlayer(playerId);
    // 이미 새 소켓으로 재접속했다면 옛 소켓의 끊김은 무시
    if (!player || player.socketId !== socket.id) return;

    if (!room.isPlaying()) {
      removeFromRoom(room, playerId, `${player.name} 님이 나갔습니다.`);
      return;
    }

    room.markDisconnected(playerId);
    io.to(room.id).emit('gameStateUpdate', room.getPublicState());

    clearGrace(playerId);
    graceTimers.set(playerId, setTimeout(() => {
      graceTimers.delete(playerId);
      const r = rooms.get(room.id);
      const p = r?.getPlayer(playerId);
      if (!r || !p || p.connected) return;
      const secs = Math.round(RECONNECT_GRACE_MS / 1000);
      removeFromRoom(r, playerId, `${p.name} 님이 ${secs}초 안에 돌아오지 않았습니다.`);
    }, RECONNECT_GRACE_MS));
  });
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`Lexio server running on http://localhost:${PORT}`);
});
