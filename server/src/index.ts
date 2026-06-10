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

function getOrCreateRoom(roomId: string): GameRoom {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new GameRoom(roomId));
  }
  return rooms.get(roomId)!;
}

function publicPlayers(room: GameRoom) {
  return room.getPlayers().map(p => ({
    id: p.id, name: p.name, tileCount: p.tiles.length,
    passed: p.passed, finishOrder: p.finishOrder, score: p.score, ready: p.ready,
  }));
}

io.on('connection', (socket) => {
  let currentRoomId: string | null = null;
  let currentPlayerId = socket.id;

  socket.on('joinRoom', ({ roomId, playerName }) => {
    if (currentRoomId) {
      socket.leave(currentRoomId);
      const oldRoom = rooms.get(currentRoomId);
      if (oldRoom) oldRoom.removePlayer(currentPlayerId);
    }

    const room = getOrCreateRoom(roomId);
    const ok = room.addPlayer(socket.id, playerName);
    if (!ok) {
      socket.emit('error', '방에 입장할 수 없습니다. (만원이거나 게임 중)');
      return;
    }

    currentRoomId = roomId;
    socket.join(roomId);

    socket.emit('roomJoined', {
      roomId,
      playerId: socket.id,
      players: publicPlayers(room),
      hostId: room.hostId,
      startingChips: room.getStartingChips(),
    });

    // 입장/방장/칩 상태를 방 전체에 동기화
    io.to(roomId).emit('lobbyUpdate', {
      players: publicPlayers(room),
      hostId: room.hostId,
      startingChips: room.getStartingChips(),
    });
  });

  socket.on('setStartingChips', (amount) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    if (!room.setStartingChips(socket.id, amount)) return;
    io.to(currentRoomId).emit('lobbyUpdate', {
      players: publicPlayers(room),
      hostId: room.hostId,
      startingChips: room.getStartingChips(),
    });
  });

  socket.on('setReady', (ready) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    room.setReady(socket.id, ready);
    io.to(currentRoomId).emit('lobbyUpdate', {
      players: publicPlayers(room),
      hostId: room.hostId,
      startingChips: room.getStartingChips(),
    });

    if (room.canStart()) {
      const state = room.startGame();
      for (const player of room.getPlayers()) {
        const tiles = room.getPlayerTiles(player.id);
        io.to(player.id).emit('gameStarted', {
          tiles,
          state: room.getPublicState(),
        });
      }
      const currentPlayer = room.getPlayers()[state.currentTurn];
      io.to(currentPlayer.id).emit('yourTurn');
    }
  });

  socket.on('playTiles', (tiles) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const result = room.playTiles(socket.id, tiles);
    if (!result.ok) {
      socket.emit('error', result.error ?? '알 수 없는 오류');
      return;
    }

    const publicState = room.getPublicState();
    const playerPublic = room.getPlayers().map(p => ({
      id: p.id, name: p.name, tileCount: p.tiles.length,
      passed: p.passed, finishOrder: p.finishOrder, score: p.score, ready: p.ready,
    })).find(p => p.id === socket.id)!;

    const lastPlay = room.getState().lastPlay!;
    io.to(currentRoomId).emit('playMade', {
      player: playerPublic,
      play: lastPlay,
      newState: publicState,
    });

    if (result.ended) {
      const results = room.calculateResults();
      io.to(currentRoomId).emit('roundEnded', { results, newState: publicState });
      room.resetForNextRound();
      return;
    }

    // emit hand update to the player who just played
    socket.emit('gameStateUpdate', publicState);

    const nextPlayer = room.getPlayers()[room.getState().currentTurn];
    io.to(nextPlayer.id).emit('yourTurn');
  });

  socket.on('pass', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const result = room.pass(socket.id);
    if (!result.ok) {
      socket.emit('error', result.error ?? '알 수 없는 오류');
      return;
    }

    const playerPublic = room.getPlayers().map(p => ({
      id: p.id, name: p.name, tileCount: p.tiles.length,
      passed: p.passed, finishOrder: p.finishOrder, score: p.score, ready: p.ready,
    })).find(p => p.id === socket.id)!;

    const publicState = room.getPublicState();
    io.to(currentRoomId).emit('playerPassed', { player: playerPublic, newState: publicState });

    const nextPlayer = room.getPlayers()[room.getState().currentTurn];
    io.to(nextPlayer.id).emit('yourTurn');
  });

  const handleLeave = () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (room) {
      room.removePlayer(socket.id);
      socket.to(currentRoomId).emit('playerLeft', socket.id);
      if (room.playerCount() === 0) {
        rooms.delete(currentRoomId);
      } else {
        // 남은 인원에게 방장 재지정/칩 상태 동기화
        io.to(currentRoomId).emit('lobbyUpdate', {
          players: publicPlayers(room),
          hostId: room.hostId,
          startingChips: room.getStartingChips(),
        });
      }
    }
  };

  socket.on('leaveRoom', () => {
    handleLeave();
    if (currentRoomId) socket.leave(currentRoomId);
    currentRoomId = null;
  });

  socket.on('disconnect', handleLeave);
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`Lexio server running on http://localhost:${PORT}`);
});
