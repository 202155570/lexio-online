interface Props {
  onClose: () => void;
}

// 족보 레퍼런스 카드(도움말) 모달 — 게임 중 언제든 확인
export default function HelpModal({ onClose }: Props) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.box} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>족보 도움말</span>
          <button onClick={onClose} style={styles.close}>✕</button>
        </div>
        <div style={styles.imgWrap}>
          <img src="/help.jpg" alt="렉시오 족보 레퍼런스" style={styles.img} />
        </div>
        <div style={styles.hint}>낮음 → 높음 순서 · 5장 족보는 종류가 달라도 서열 높으면 받아치기 가능</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  box: {
    background: '#16213e', borderRadius: 14,
    maxWidth: 440, width: '100%', maxHeight: '92vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  title: { fontSize: 16, fontWeight: 700, color: '#f1c40f' },
  close: {
    border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff',
    width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 14,
  },
  imgWrap: { overflow: 'auto', padding: 12 },
  img: {
    width: '100%', height: 'auto', display: 'block', borderRadius: 8,
  },
  hint: {
    fontSize: 11, color: '#888', textAlign: 'center',
    padding: '8px 12px 12px', flexShrink: 0,
  },
};
