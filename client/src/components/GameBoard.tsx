import type { Tile, GameStatePublic, Play, PlayerPublic } from '../game/types';
import { useIsMobile } from '../game/useIsMobile';
import TableArea from './TableArea';
import PlayerHand from './PlayerHand';
import OtherPlayer from './OtherPlayer';

interface Props {
  myId: string;
  myTiles: Tile[];
  gameState: GameStatePublic;
  onPlay: (tiles: Tile[]) => void;
  onPass: () => void;
  error: string | null;
}

export default function GameBoard({ myId, myTiles, gameState, onPlay, onPass, error }: Props) {
  const isMobile = useIsMobile();
  const myIndex = gameState.players.findIndex(p => p.id === myId);
  const myPlayer = gameState.players[myIndex];
  const isMyTurn = gameState.currentTurn === myIndex;
  const otherPlayers = gameState.players.filter(p => p.id !== myId);

  const lastPlayPlayer = gameState.lastPlayerId
    ? gameState.players.find(p => p.id === gameState.lastPlayerId)
    : null;

  return (
    <div style={styles.container}>
      {error && <div style={styles.error}>{error}</div>}

      {/* Round info */}
      <div style={styles.topBar}>
        <span style={styles.roundLabel}>라운드 {gameState.round}</span>
        <span style={styles.turnIndicator}>
          {isMyTurn ? '내 차례!' : `${gameState.players[gameState.currentTurn]?.name} 차례`}
        </span>
      </div>

      {/* Other players - horizontally scrollable row (handles up to 5 others) */}
      <div style={{ ...styles.othersTop, padding: isMobile ? '8px 10px' : '12px 16px' }}>
        {otherPlayers.map(p => (
          <OtherPlayer
            key={p.id}
            player={p}
            isCurrentTurn={gameState.players.indexOf(p) === gameState.currentTurn}
            position="top"
          />
        ))}
      </div>

      {/* Table center */}
      <div style={{ ...styles.center, padding: isMobile ? '0 10px' : '0 16px' }}>
        <TableArea
          lastPlay={gameState.lastPlay}
          lastPlayerName={lastPlayPlayer?.name ?? ''}
          log={gameState.log}
        />
      </div>

      {/* My hand */}
      {myPlayer && (
        <PlayerHand
          tiles={myTiles}
          isMyTurn={isMyTurn}
          lastPlay={gameState.lastPlay}
          onPlay={onPlay}
          onPass={onPass}
          myName={myPlayer.name}
          myScore={myPlayer.score}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', flexDirection: 'column',
    height: '100dvh', maxHeight: '100dvh', overflow: 'hidden',
    background: 'linear-gradient(160deg, #0f3460 0%, #1a1a2e 100%)',
  },
  error: {
    background: '#e74c3c', color: '#fff', padding: '8px 16px',
    fontSize: 13, textAlign: 'center', fontWeight: 600,
    animation: 'fadeOut 3s forwards',
  },
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 16px',
    background: 'rgba(0,0,0,0.3)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  roundLabel: { fontSize: 13, color: '#888' },
  turnIndicator: {
    fontSize: 14, fontWeight: 700,
    color: '#ffd700',
  },
  othersTop: {
    display: 'flex', gap: 10, justifyContent: 'flex-start',
    overflowX: 'auto', flexShrink: 0,
  },
  center: {
    flex: 1,
    display: 'flex', alignItems: 'center',
    overflow: 'hidden',
  },
};
