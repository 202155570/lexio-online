import type { PlayerPublic } from '../game/types';
import ScoreChips from './ScoreChips';

interface Props {
  roomId: string;
  players: PlayerPublic[];
  myId: string;
  myReady: boolean;
  onReady: (r: boolean) => void;
  hostId: string | null;
  startingChips: number;
  onSetChips: (amount: number) => void;
}

const SUIT_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
const CHIP_PRESETS = [50, 100, 200, 300];

export default function Lobby({
  roomId, players, myId, myReady, onReady, hostId, startingChips, onSetChips,
}: Props) {
  const allReady = players.length >= 2 && players.every(p => p.ready);
  const isHost = myId === hostId;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>렉시오 온라인</h1>
        <div style={styles.roomBadge}>
          방 코드: <span style={{ fontWeight: 700, letterSpacing: 2 }}>{roomId}</span>
        </div>

        {/* 시작 칩 설정 (방장만 변경 가능) */}
        <div style={styles.chipPanel}>
          <div style={styles.chipHeader}>
            <span style={styles.sectionLabel}>시작 칩</span>
            <span style={styles.chipValue}>{startingChips}점</span>
          </div>
          {isHost ? (
            <div style={styles.chipPresets}>
              {CHIP_PRESETS.map(v => (
                <button
                  key={v}
                  onClick={() => onSetChips(v)}
                  style={{
                    ...styles.chipBtn,
                    ...(startingChips === v ? styles.chipBtnActive : {}),
                  }}
                >{v}</button>
              ))}
              <input
                type="number"
                min={10}
                max={9999}
                placeholder="직접"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const v = Number((e.target as HTMLInputElement).value);
                    if (v >= 10) onSetChips(v);
                  }
                }}
                style={styles.chipInput}
              />
            </div>
          ) : (
            <div style={styles.chipHostNote}>방장이 설정합니다</div>
          )}
        </div>

        <div style={styles.playerList}>
          <div style={styles.sectionLabel}>플레이어 ({players.length}/6)</div>
          {players.map((p, i) => (
            <div key={p.id} style={{
              ...styles.playerRow,
              background: p.id === myId ? 'rgba(255,255,255,0.08)' : 'transparent',
            }}>
              <div style={{ ...styles.colorDot, background: SUIT_COLORS[i % 4] }} />
              <span style={{ flex: 1 }}>
                {p.name}
                {p.id === hostId && <span style={styles.hostBadge}>방장</span>}
                {p.id === myId && <span style={styles.youBadge}>나</span>}
              </span>
              <span style={{ ...styles.readyBadge, color: p.ready ? '#2ecc71' : '#e74c3c' }}>
                {p.ready ? '준비 완료' : '대기 중'}
              </span>
              <ScoreChips score={p.score} size={20} />
            </div>
          ))}
          {players.length < 2 && (
            <div style={styles.waitMsg}>다른 플레이어를 기다리는 중...</div>
          )}
        </div>

        <div style={styles.actions}>
          <button
            onClick={() => onReady(!myReady)}
            style={{
              ...styles.btn,
              background: myReady ? '#e74c3c' : '#2ecc71',
            }}
          >
            {myReady ? '준비 취소' : '준비 완료'}
          </button>
        </div>

        {allReady && (
          <div style={styles.startMsg}>모든 플레이어 준비 완료! 게임을 시작합니다...</div>
        )}

        <div style={styles.hint}>
          이 코드를 친구에게 알려주세요: <strong>{roomId}</strong>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', padding: 20,
  },
  card: {
    background: '#16213e', borderRadius: 16, padding: '36px 32px',
    maxWidth: 480, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.07)',
  },
  chipPanel: {
    background: 'rgba(0,0,0,0.2)', borderRadius: 10,
    padding: '12px 14px', marginBottom: 20,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  chipHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  chipValue: { fontSize: 16, fontWeight: 800, color: '#f1c40f' },
  chipPresets: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  chipBtn: {
    flex: 1, minWidth: 48, padding: '8px 0', borderRadius: 6,
    border: '1px solid #444', background: 'transparent', color: '#ccc',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  chipBtnActive: { background: '#f1c40f', color: '#000', borderColor: '#f1c40f' },
  chipInput: {
    width: 64, padding: '8px 6px', borderRadius: 6,
    border: '1px solid #444', background: 'rgba(255,255,255,0.05)',
    color: '#fff', fontSize: 14, textAlign: 'center',
  },
  chipHostNote: { fontSize: 13, color: '#888' },
  hostBadge: {
    fontSize: 10, background: '#f1c40f', color: '#000',
    padding: '1px 6px', borderRadius: 4, marginLeft: 6, fontWeight: 700,
  },
  title: {
    fontSize: 32, fontWeight: 800, textAlign: 'center',
    marginBottom: 12, color: '#f1c40f',
    textShadow: '0 2px 12px rgba(241,196,15,0.4)',
  },
  roomBadge: {
    textAlign: 'center', fontSize: 14, color: '#aaa',
    marginBottom: 28, letterSpacing: 1,
  },
  sectionLabel: {
    fontSize: 12, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1,
  },
  playerList: { marginBottom: 24 },
  playerRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 8, marginBottom: 4,
  },
  colorDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  youBadge: {
    fontSize: 10, background: '#3498db', color: '#fff',
    padding: '1px 6px', borderRadius: 4, marginLeft: 4,
  },
  readyBadge: { fontSize: 12, fontWeight: 600 },
  scoreTag: { fontSize: 12, color: '#888' },
  waitMsg: { color: '#666', textAlign: 'center', padding: '12px 0', fontSize: 14 },
  actions: { display: 'flex', justifyContent: 'center', marginBottom: 16 },
  btn: {
    padding: '12px 40px', borderRadius: 8, border: 'none',
    color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  startMsg: {
    textAlign: 'center', color: '#2ecc71', fontWeight: 600,
    fontSize: 14, marginBottom: 12,
    animation: 'pulse 1s infinite',
  },
  hint: {
    textAlign: 'center', color: '#666', fontSize: 12, marginTop: 16,
  },
};
