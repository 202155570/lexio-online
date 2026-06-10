import type { RoundResult } from '../game/types';

interface Props {
  results: RoundResult[];
  round: number;
  onContinue: () => void;
}

const MEDALS = ['🥇', '🥈', '🥉', '4위', '5위', '6위'];

export default function RoundResultScreen({ results, round, onContinue }: Props) {
  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h2 style={styles.title}>라운드 {round} 결과</h2>

        <div style={styles.table}>
          <div style={styles.headerRow}>
            <span style={{ width: 40 }}>순위</span>
            <span style={{ flex: 1 }}>이름</span>
            <span style={{ width: 70, textAlign: 'right' }}>남은 패</span>
            <span style={{ width: 70, textAlign: 'right' }}>+점수</span>
            <span style={{ width: 70, textAlign: 'right' }}>누적</span>
          </div>
          {results.map((r) => (
            <div key={r.playerId} style={{
              ...styles.row,
              background: r.finishOrder === 1 ? 'rgba(255,215,0,0.08)' : 'transparent',
            }}>
              <span style={{ width: 40, fontSize: 18 }}>{MEDALS[r.finishOrder - 1] ?? r.finishOrder}</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{r.name}</span>
              <span style={{ width: 70, textAlign: 'right', color: '#aaa' }}>{r.tilesLeft}장</span>
              <span style={{
                width: 70, textAlign: 'right',
                color: r.pointsGained > 0 ? '#2ecc71' : '#888',
                fontWeight: 700,
              }}>
                +{r.pointsGained}
              </span>
              <span style={{ width: 70, textAlign: 'right', color: '#f1c40f', fontWeight: 700 }}>
                {r.totalScore}
              </span>
            </div>
          ))}
        </div>

        <button onClick={onContinue} style={styles.btn}>
          다음 라운드 준비
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  card: {
    background: '#16213e', borderRadius: 16, padding: '32px 40px',
    minWidth: 400, boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  title: {
    fontSize: 24, fontWeight: 800, color: '#f1c40f',
    textAlign: 'center', marginBottom: 24,
  },
  table: { marginBottom: 24 },
  headerRow: {
    display: 'flex', gap: 8, padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 4,
  },
  row: {
    display: 'flex', gap: 8, padding: '10px 8px',
    borderRadius: 8, alignItems: 'center', fontSize: 14,
  },
  btn: {
    width: '100%', padding: '12px 0', borderRadius: 8,
    background: '#3498db', color: '#fff', border: 'none',
    fontSize: 16, fontWeight: 700, cursor: 'pointer',
  },
};
