import type { PlayerPublic } from '../game/types';

interface Props {
  player: PlayerPublic;
  isCurrentTurn: boolean;
  position: 'top' | 'left' | 'right';
}

const SUIT_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];

export default function OtherPlayer({ player, isCurrentTurn, position }: Props) {
  const faceDownTile = (key: number) => (
    <div key={key} style={{
      width: 36, height: 54, borderRadius: 4,
      background: 'linear-gradient(135deg, #2c3e50, #1a252f)',
      border: '1px solid rgba(255,255,255,0.15)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
      flexShrink: 0,
    }} />
  );

  const tileCount = player.tileCount;
  const showCount = Math.min(tileCount, 10);

  return (
    <div style={{
      display: 'flex',
      flexDirection: position === 'top' ? 'column' : 'row',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      borderRadius: 12,
      background: isCurrentTurn
        ? 'rgba(255, 215, 0, 0.12)'
        : 'rgba(255,255,255,0.04)',
      border: isCurrentTurn
        ? '1px solid rgba(255,215,0,0.4)'
        : '1px solid rgba(255,255,255,0.06)',
      transition: 'all 0.3s ease',
      minWidth: 120,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `linear-gradient(135deg, #2c3e50, #34495e)`,
          border: `2px solid ${isCurrentTurn ? '#ffd700' : 'rgba(255,255,255,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#fff',
        }}>
          {player.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ fontSize: 11, color: isCurrentTurn ? '#ffd700' : '#aaa', fontWeight: 600 }}>
          {player.name}
        </div>
        <div style={{ fontSize: 10, color: '#666' }}>
          {tileCount}장 · {player.score}점
        </div>
        {player.passed && (
          <div style={{ fontSize: 10, color: '#e74c3c', fontWeight: 600 }}>PASS</div>
        )}
        {player.finishOrder && (
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: player.finishOrder === 1 ? '#ffd700' : '#aaa',
          }}>
            {player.finishOrder}등 완료
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 2, maxWidth: 180,
        justifyContent: 'center',
      }}>
        {Array.from({ length: showCount }, (_, i) => faceDownTile(i))}
        {tileCount > 10 && (
          <div style={{
            width: 36, height: 54, borderRadius: 4,
            background: 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: '#888',
          }}>
            +{tileCount - 10}
          </div>
        )}
      </div>
    </div>
  );
}
