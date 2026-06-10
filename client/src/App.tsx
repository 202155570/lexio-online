import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  Tile, GameStatePublic, PlayerPublic, RoundResult,
} from './game/types';
import GameBoard from './components/GameBoard';
import Lobby from './components/Lobby';
import RoundResultScreen from './components/RoundResult';

type AppScreen = 'login' | 'lobby' | 'game';

const socket: Socket = io({ transports: ['websocket', 'polling'] });

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [myId, setMyId] = useState('');
  const [myName, setMyName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [players, setPlayers] = useState<PlayerPublic[]>([]);
  const [gameState, setGameState] = useState<GameStatePublic | null>(null);
  const [myTiles, setMyTiles] = useState<Tile[]>([]);
  const [myReady, setMyReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roundResults, setRoundResults] = useState<RoundResult[] | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [startingChips, setStartingChips] = useState(100);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  }, []);

  useEffect(() => {
    socket.on('roomJoined', ({ roomId: rid, playerId, players: ps, hostId: hid, startingChips: chips }) => {
      setMyId(playerId);
      setRoomId(rid);
      setPlayers(ps);
      setHostId(hid);
      setStartingChips(chips);
      setScreen('lobby');
    });

    socket.on('playerLeft', (id) => {
      setPlayers(prev => prev.filter(p => p.id !== id));
    });

    socket.on('lobbyUpdate', ({ players: ps, hostId: hid, startingChips: chips }) => {
      setPlayers(ps);
      setHostId(hid);
      setStartingChips(chips);
      setMyReady(ps.find((p: PlayerPublic) => p.id === socket.id)?.ready ?? false);
    });

    socket.on('gameStarted', ({ tiles, state }) => {
      setMyTiles(tiles);
      setGameState(state);
      setRoundResults(null);
      setScreen('game');
    });

    socket.on('gameStateUpdate', (state) => {
      setGameState(state);
    });

    socket.on('playMade', ({ play, newState }) => {
      setGameState(newState);
      // update my tiles if it was my play
      if (newState.lastPlayerId === myId) {
        setMyTiles(prev => prev.filter(t => !play.tiles.find((pt: Tile) => pt.id === t.id)));
      }
    });

    socket.on('playerPassed', ({ newState }) => {
      setGameState(newState);
    });

    socket.on('yourTurn', () => {
      // could play a sound here
    });

    socket.on('roundEnded', ({ results, newState }) => {
      setGameState(newState);
      setRoundResults(results);
    });

    socket.on('error', showError);

    return () => {
      socket.off('roomJoined');
      socket.off('playerLeft');
      socket.off('lobbyUpdate');
      socket.off('gameStarted');
      socket.off('gameStateUpdate');
      socket.off('playMade');
      socket.off('playerPassed');
      socket.off('yourTurn');
      socket.off('roundEnded');
      socket.off('error');
    };
  }, [myId, showError]);

  const handleJoin = () => {
    const name = nameInput.trim();
    const room = roomInput.trim().toUpperCase() || randomRoomCode();
    if (!name) { showError('이름을 입력해주세요.'); return; }
    setMyName(name);
    socket.emit('joinRoom', { roomId: room, playerName: name });
  };

  const handleReady = (ready: boolean) => {
    setMyReady(ready);
    socket.emit('setReady', ready);
  };

  const handleSetChips = (amount: number) => {
    socket.emit('setStartingChips', amount);
  };

  const handlePlay = (tiles: Tile[]) => {
    socket.emit('playTiles', tiles);
    // optimistically remove tiles
    setMyTiles(prev => prev.filter(t => !tiles.find(pt => pt.id === t.id)));
  };

  const handlePass = () => {
    socket.emit('pass');
  };

  const handleContinue = () => {
    setRoundResults(null);
    setMyReady(false);
    setMyTiles([]);
    setScreen('lobby');
    socket.emit('setReady', false);
  };

  if (screen === 'login') {
    return <LoginScreen
      nameInput={nameInput}
      roomInput={roomInput}
      onNameChange={setNameInput}
      onRoomChange={setRoomInput}
      onJoin={handleJoin}
      error={error}
    />;
  }

  if (screen === 'lobby') {
    return <Lobby
      roomId={roomId}
      players={players}
      myId={myId}
      myReady={myReady}
      onReady={handleReady}
      hostId={hostId}
      startingChips={startingChips}
      onSetChips={handleSetChips}
    />;
  }

  if (screen === 'game' && gameState) {
    return (
      <>
        <GameBoard
          myId={myId}
          myTiles={myTiles}
          gameState={gameState}
          onPlay={handlePlay}
          onPass={handlePass}
          error={error}
        />
        {roundResults && (
          <RoundResultScreen
            results={roundResults}
            round={gameState.round}
            onContinue={handleContinue}
          />
        )}
      </>
    );
  }

  return null;
}

function randomRoomCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

interface LoginProps {
  nameInput: string;
  roomInput: string;
  onNameChange: (v: string) => void;
  onRoomChange: (v: string) => void;
  onJoin: () => void;
  error: string | null;
}

function LoginScreen({ nameInput, roomInput, onNameChange, onRoomChange, onJoin, error }: LoginProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 20,
    }}>
      <div style={{
        background: '#16213e', borderRadius: 16, padding: '40px 48px',
        maxWidth: 400, width: '100%',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <h1 style={{
          fontSize: 40, fontWeight: 900, textAlign: 'center',
          marginBottom: 8, color: '#f1c40f',
          textShadow: '0 2px 20px rgba(241,196,15,0.4)',
        }}>
          렉시오
        </h1>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: 32, fontSize: 14 }}>
          온라인 멀티플레이어 클라이밍 게임
        </p>

        {error && (
          <div style={{
            background: 'rgba(231,76,60,0.2)', border: '1px solid #e74c3c',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            fontSize: 13, color: '#e74c3c',
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>
            닉네임
          </label>
          <input
            value={nameInput}
            onChange={e => onNameChange(e.target.value)}
            placeholder="닉네임을 입력하세요"
            onKeyDown={e => e.key === 'Enter' && onJoin()}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>
            방 코드 (비워두면 새 방 생성)
          </label>
          <input
            value={roomInput}
            onChange={e => onRoomChange(e.target.value.toUpperCase())}
            placeholder="XXXXX"
            onKeyDown={e => e.key === 'Enter' && onJoin()}
            style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: 4, textTransform: 'uppercase' }}
            maxLength={10}
          />
        </div>

        <button
          onClick={onJoin}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 8,
            background: '#f1c40f', color: '#000', border: 'none',
            fontSize: 16, fontWeight: 800, cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
        >
          입장하기
        </button>

        <div style={{ marginTop: 20, fontSize: 11, color: '#555', textAlign: 'center' }}>
          2~6명 플레이 · 포커 기반 클라이밍 게임
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, color: '#fff', fontSize: 15,
  outline: 'none',
};
