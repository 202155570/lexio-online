import type { Play } from '../game/types';
import { HAND_LABEL } from '../game/types';
import TileCard from './TileCard';

interface Props {
  lastPlay: Play | null;
  lastPlayerName: string;
  log: string[];
}

export default function TableArea({ lastPlay, lastPlayerName, log }: Props) {
  return (
    <div style={styles.container}>
      <div style={styles.table}>
        {lastPlay ? (
          <div style={styles.playArea}>
            <div style={styles.handLabel}>
              {lastPlayerName} · {HAND_LABEL[lastPlay.handType]}
            </div>
            <div style={styles.tileRow}>
              {lastPlay.tiles.map(t => (
                <TileCard key={t.id} tile={t} small />
              ))}
            </div>
          </div>
        ) : (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🀱</div>
            <div style={styles.emptyText}>아무 패나 낼 수 있습니다</div>
          </div>
        )}
      </div>

      <div style={styles.logArea}>
        {[...log].reverse().slice(0, 8).map((entry, i) => (
          <div key={i} style={{ ...styles.logEntry, opacity: 1 - i * 0.1 }}>
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', gap: 16, alignItems: 'flex-start', flex: 1,
    minHeight: 180,
  },
  table: {
    flex: 1,
    background: 'rgba(0,80,40,0.3)',
    border: '2px solid rgba(0,180,80,0.3)',
    borderRadius: 16,
    minHeight: 160,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  playArea: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  handLabel: {
    fontSize: 13, color: '#aaffaa', fontWeight: 600,
    background: 'rgba(0,0,0,0.3)', padding: '4px 12px', borderRadius: 20,
  },
  tileRow: { display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 36, opacity: 0.3 },
  emptyText: { fontSize: 13, color: '#666' },
  logArea: {
    width: 200, flexShrink: 0,
    background: 'rgba(0,0,0,0.3)', borderRadius: 12,
    padding: 12, maxHeight: 200, overflow: 'hidden',
  },
  logEntry: {
    fontSize: 11, color: '#aaa', padding: '3px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
};
