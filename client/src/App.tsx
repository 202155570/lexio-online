import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  Tile, GameStatePublic, PlayerPublic, RoundResult,
} from './game/types';
import GameBoard from './components/GameBoard';
import Lobby from './components/Lobby';
import RoundResultScreen from './components/RoundResult';

type AppScreen = 'login' | 'lobby' | 'game';

const socket: Socket = io({ transports: ['websocket', 'polling'] });

// 재접속용 세션 (탭별 sessionStorage → 새로고침해도 유지, 탭끼리는 별개 플레이어)
// 저장소를 못 쓰는 환경이면 메모리 값으로 대체
const memSession: Record<string, string> = {};
function sessionGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return memSession[key] ?? null; }
}
function sessionSet(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    if (value === null) delete memSession[key];
    else memSession[key] = value;
  }
}
function playerToken(): string {
  let t = sessionGet('lexio.token');
  if (!t) {
    t = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionSet('lexio.token', t);
  }
  return t;
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [myId, setMyId] = useState('');
  const myIdRef = useRef('');
  myIdRef.current = myId;
  const [myName, setMyName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomInput, setRoomInput] = useState(() => sessionGet('lexio.room') ?? '');
  const [nameInput, setNameInput] = useState(() => sessionGet('lexio.name') ?? '');
  const [rejoining, setRejoining] = useState(() => sessionGet('lexio.room') !== null);
  const [connected, setConnected] = useState(socket.connected);
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
    // 저장된 방이 있으면 (새로고침·연결 복구 시) 같은 자리로 재접속 시도
    const tryRejoin = () => {
      const rid = sessionGet('lexio.room');
      if (rid) socket.emit('rejoinRoom', { roomId: rid, token: playerToken() });
    };
    const onConnect = () => { setConnected(true); tryRejoin(); };
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) tryRejoin();
    // 서버에 닿지 않으면 재접속 대기 화면 대신 로그인 화면을 보여준다
    const giveUp = setTimeout(() => setRejoining(false), 8000);

    return () => {
      clearTimeout(giveUp);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  useEffect(() => {
    socket.on('roomJoined', ({ roomId: rid, playerId, players: ps, hostId: hid, startingChips: chips }) => {
      sessionSet('lexio.room', rid);
      myIdRef.current = playerId; // 바로 뒤따르는 lobbyUpdate가 내 id를 알도록
      setMyId(playerId);
      setRoomId(rid);
      setPlayers(ps);
      setHostId(hid);
      setStartingChips(chips);
      setScreen('lobby');
    });

    socket.on('rejoined', ({ roomId: rid, playerId, players: ps, hostId: hid, startingChips: chips, state, tiles }) => {
      setRejoining(false);
      myIdRef.current = playerId;
      setMyId(playerId);
      setRoomId(rid);
      setPlayers(ps);
      setHostId(hid);
      setStartingChips(chips);
      if (state.phase === 'playing') {
        setMyTiles(tiles);
        setGameState(state);
        setRoundResults(null);
        setScreen('game');
      } else {
        setMyReady(ps.find((p: PlayerPublic) => p.id === playerId)?.ready ?? false);
        setRoundResults(null);
        setScreen('lobby');
      }
    });

    socket.on('rejoinFailed', () => {
      setRejoining(false);
      sessionSet('lexio.room', null);
      setScreen(prev => {
        if (prev !== 'login') showError('연결이 끊겨 방에서 나왔습니다. 다시 입장해주세요.');
        return 'login';
      });
    });

    socket.on('playerLeft', (id) => {
      setPlayers(prev => prev.filter(p => p.id !== id));
    });

    socket.on('lobbyUpdate', ({ players: ps, hostId: hid, startingChips: chips }) => {
      setPlayers(ps);
      setHostId(hid);
      setStartingChips(chips);
      setMyReady(ps.find((p: PlayerPublic) => p.id === myIdRef.current)?.ready ?? false);
    });

    socket.on('roundAborted', ({ players: ps, hostId: hid, startingChips: chips, reason }) => {
      setPlayers(ps);
      setHostId(hid);
      setStartingChips(chips);
      setMyReady(false);
      setMyTiles([]);
      setRoundResults(null);
      setScreen('lobby');
      showError(`${reason} 라운드가 무효 처리되었습니다.`);
    });

    socket.on('handUpdate', (tiles) => {
      setMyTiles(tiles);
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
      if (newState.lastPlayerId === myIdRef.current) {
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
      socket.off('rejoined');
      socket.off('rejoinFailed');
      socket.off('playerLeft');
      socket.off('lobbyUpdate');
      socket.off('roundAborted');
      socket.off('handUpdate');
      socket.off('gameStarted');
      socket.off('gameStateUpdate');
      socket.off('playMade');
      socket.off('playerPassed');
      socket.off('yourTurn');
      socket.off('roundEnded');
      socket.off('error');
    };
  }, [showError]);

  const handleJoin = () => {
    const name = nameInput.trim();
    const room = roomInput.trim().toUpperCase() || randomRoomCode();
    if (!name) { showError('이름을 입력해주세요.'); return; }
    setMyName(name);
    sessionSet('lexio.name', name);
    socket.emit('joinRoom', { roomId: room, playerName: name, token: playerToken() });
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

  const connectionBanner = !connected && screen !== 'login' && (
    <div style={bannerStyle}>연결이 끊겼습니다. 재접속 중...</div>
  );

  if (screen === 'login' && rejoining) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', color: '#888', fontSize: 15,
      }}>
        이전 방에 다시 접속하는 중...
      </div>
    );
  }

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
    return (
      <>
        {connectionBanner}
        {error && <div style={{ ...bannerStyle, background: '#e74c3c' }}>{error}</div>}
        <Lobby
          roomId={roomId}
          players={players}
          myId={myId}
          myReady={myReady}
          onReady={handleReady}
          hostId={hostId}
          startingChips={startingChips}
          onSetChips={handleSetChips}
        />
      </>
    );
  }

  if (screen === 'game' && gameState) {
    return (
      <>
        {connectionBanner}
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
            myId={myId}
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
          3~5명 플레이 · 포커 기반 클라이밍 게임
        </div>
      </div>
    </div>
  );
}

const bannerStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
  background: '#e67e22', color: '#fff', padding: '8px 16px',
  fontSize: 13, fontWeight: 600, textAlign: 'center',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, color: '#fff', fontSize: 15,
  outline: 'none',
};
