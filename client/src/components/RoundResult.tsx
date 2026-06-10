import type { RoundResult } from '../game/types';
import { useIsMobile } from '../game/useIsMobile';

interface Props {
  results: RoundResult[];
  round: number;
  myId: string;
  onContinue: () => void;
}

const MEDALS = ['🥇', '🥈', '🥉', '4위', '5위', '6위'];

export default function RoundResultScreen({ results, round, myId, onContinue }: Props) {
  const isMobile = useIsMobile();
  const colW = isMobile ? 50 : 64;

  // 나 기준 칩 이동: 상대별 (상대 유효타일 - 내 유효타일) = 둘 사이 칩 흐름
  const me = results.find(r => r.playerId === myId);
  const flows = me
    ? results
        .filter(r => r.playerId !== myId)
        .map(r => ({
          name: r.name,
          amount: r.effectiveTiles - me.effectiveTiles, // +면 내가 받음, -면 내가 줌
        }))
        .filter(f => f.amount !== 0)
        .sort((a, b) => b.amount - a.amount)
    : [];

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.card, padding: isMobile ? '22px 16px' : '30px 36px' }}>
        <h2 style={styles.title}>라운드 {round} 결과</h2>

        <div style={styles.table}>
          <div style={styles.headerRow}>
            <span style={{ width: isMobile ? 30 : 38 }}>순위</span>
            <span style={{ flex: 1, minWidth: 0 }}>이름</span>
            <span style={{ width: colW + 12, textAlign: 'right' }}>남은 패</span>
            <span style={{ width: colW, textAlign: 'right' }}>±칩</span>
            <span style={{ width: colW, textAlign: 'right' }}>누적</span>
          </div>
          {results.map((r) => (
            <div key={r.playerId} style={{
              ...styles.row,
              background: r.playerId === myId
                ? 'rgba(52,152,219,0.14)'
                : r.finishOrder === 1 ? 'rgba(255,215,0,0.08)' : 'transparent',
            }}>
              <span style={{ width: isMobile ? 30 : 38, fontSize: 17 }}>{MEDALS[r.finishOrder - 1] ?? r.finishOrder}</span>
              <span style={{ flex: 1, minWidth: 0, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.name}{r.playerId === myId && <span style={styles.meTag}>나</span>}
              </span>
              {/* 남은 패 + ×2 배지 */}
              <span style={{ width: colW + 12, textAlign: 'right', color: '#aaa', whiteSpace: 'nowrap' }}>
                {r.tilesLeft}장
                {r.doubled && <span style={styles.x2}>×2</span>}
              </span>
              <span style={{
                width: colW, textAlign: 'right',
                color: r.pointsGained > 0 ? '#2ecc71' : r.pointsGained < 0 ? '#e74c3c' : '#888',
                fontWeight: 700,
              }}>
                {r.pointsGained > 0 ? '+' : ''}{r.pointsGained}
              </span>
              <span style={{ width: colW, textAlign: 'right', color: '#f1c40f', fontWeight: 700 }}>
                {r.totalScore}
              </span>
            </div>
          ))}
        </div>

        {/* 나 기준 칩 이동 시각화 */}
        {me && flows.length > 0 && (
          <div style={styles.flowPanel}>
            <div style={styles.flowTitle}>내 칩 이동</div>
            {flows.map((f, i) => {
              const incoming = f.amount > 0; // 내가 받음
              const amt = Math.abs(f.amount);
              return (
                <div key={i} style={styles.flowRow}>
                  {incoming ? (
                    <>
                      <span style={styles.party}>{f.name}</span>
                      <span style={{ ...styles.arrow, color: '#2ecc71' }}>
                        ──&nbsp;<b>+{amt}</b>&nbsp;▶
                      </span>
                      <span style={{ ...styles.party, ...styles.meParty }}>나</span>
                    </>
                  ) : (
                    <>
                      <span style={{ ...styles.party, ...styles.meParty }}>나</span>
                      <span style={{ ...styles.arrow, color: '#e74c3c' }}>
                        ──&nbsp;<b>{amt}</b>&nbsp;▶
                      </span>
                      <span style={styles.party}>{f.name}</span>
                    </>
                  )}
                </div>
              );
            })}
            <div style={styles.flowTotal}>
              합계{' '}
              <span style={{ color: me.pointsGained > 0 ? '#2ecc71' : me.pointsGained < 0 ? '#e74c3c' : '#888' }}>
                {me.pointsGained > 0 ? '+' : ''}{me.pointsGained}칩
              </span>
            </div>
          </div>
        )}

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
    padding: '16px 0', overflowY: 'auto',
  },
  card: {
    background: '#16213e', borderRadius: 16,
    width: '100%', maxWidth: 460, margin: '0 16px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  title: {
    fontSize: 23, fontWeight: 800, color: '#f1c40f',
    textAlign: 'center', marginBottom: 20,
  },
  table: { marginBottom: 16 },
  headerRow: {
    display: 'flex', gap: 6, padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    fontSize: 11, color: '#888', letterSpacing: 1,
    marginBottom: 4,
  },
  row: {
    display: 'flex', gap: 6, padding: '9px 6px',
    borderRadius: 8, alignItems: 'center', fontSize: 14,
  },
  meTag: {
    fontSize: 10, background: '#3498db', color: '#fff',
    padding: '1px 5px', borderRadius: 4, marginLeft: 5,
  },
  x2: {
    fontSize: 11, fontWeight: 800, color: '#e67e22',
    background: 'rgba(230,126,34,0.18)', padding: '1px 5px',
    borderRadius: 4, marginLeft: 4,
  },
  flowPanel: {
    background: 'rgba(0,0,0,0.25)', borderRadius: 10,
    padding: '12px 14px', marginBottom: 18,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  flowTitle: {
    fontSize: 12, color: '#888', marginBottom: 10, letterSpacing: 1,
  },
  flowRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, padding: '5px 0',
  },
  party: {
    fontSize: 13, fontWeight: 600, color: '#ddd',
    minWidth: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meParty: { color: '#5dade2', textAlign: 'right' },
  arrow: {
    fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
    flexShrink: 0, padding: '0 6px',
  },
  flowTotal: {
    fontSize: 13, fontWeight: 700, color: '#aaa',
    textAlign: 'right', marginTop: 8,
    borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8,
  },
  btn: {
    width: '100%', padding: '12px 0', borderRadius: 8,
    background: '#3498db', color: '#fff', border: 'none',
    fontSize: 16, fontWeight: 700, cursor: 'pointer',
  },
};
