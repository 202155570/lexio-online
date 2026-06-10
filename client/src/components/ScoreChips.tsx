// 점수를 색깔별 칩(1·5·10·50·100)으로 시각화

interface ChipDef {
  value: number;
  // 카지노 칩 컬러 컨벤션
  base: string;
  ring: string;
  text: string;
}

const CHIP_DEFS: ChipDef[] = [
  { value: 100, base: '#1a1a1a', ring: '#f1c40f', text: '#f1c40f' }, // 검정+금
  { value: 50,  base: '#27ae60', ring: '#d5f5e3', text: '#fff' },   // 초록
  { value: 10,  base: '#2980b9', ring: '#d6eaf8', text: '#fff' },   // 파랑
  { value: 5,   base: '#c0392b', ring: '#fadbd8', text: '#fff' },   // 빨강
  { value: 1,   base: '#ecf0f1', ring: '#bdc3c7', text: '#2c3e50' }, // 흰색
];

function decompose(score: number): { def: ChipDef; count: number }[] {
  let rem = Math.max(0, Math.floor(score));
  const out: { def: ChipDef; count: number }[] = [];
  for (const def of CHIP_DEFS) {
    const count = Math.floor(rem / def.value);
    if (count > 0) out.push({ def, count });
    rem -= count * def.value;
  }
  return out;
}

interface Props {
  score: number;
  size?: number;       // 칩 지름(px)
  showTotal?: boolean; // 옆에 숫자 합계도 표시
}

export default function ScoreChips({ score, size = 28, showTotal = true }: Props) {
  const stacks = decompose(score);

  if (score <= 0) {
    return <span style={{ fontSize: 12, color: '#888' }}>0점</span>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: size * 0.45 }}>
      {stacks.map(({ def, count }) => (
        <ChipStack key={def.value} def={def} count={count} size={size} />
      ))}
      {showTotal && (
        <span style={{ fontSize: 12, color: '#f1c40f', fontWeight: 700, marginLeft: 4 }}>
          {score}점
        </span>
      )}
    </div>
  );
}

function ChipStack({ def, count, size }: { def: ChipDef; count: number; size: number }) {
  const visible = Math.min(count, 5);
  const overlap = size * 0.18; // 칩이 위로 쌓이는 높이

  return (
    <div
      style={{ position: 'relative', width: size, height: size + overlap * (visible - 1) }}
      title={`${def.value}점 × ${count}`}
    >
      {Array.from({ length: visible }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: i * overlap,
            left: 0,
            width: size,
            height: size,
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 40%, ${def.base} 60%, ${shade(def.base)} 100%)`,
            border: `2px dashed ${def.ring}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* 맨 위 칩에만 액면가 표시 */}
          {i === visible - 1 && (
            <span style={{ fontSize: size * 0.34, fontWeight: 800, color: def.text }}>
              {def.value}
            </span>
          )}
        </div>
      ))}
      {/* 개수 배지 */}
      <div style={{
        position: 'absolute',
        bottom: visible * overlap + size * 0.05,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 10,
        fontWeight: 700,
        color: '#fff',
        background: 'rgba(0,0,0,0.6)',
        padding: '0 4px',
        borderRadius: 8,
        whiteSpace: 'nowrap',
      }}>
        ×{count}
      </div>
    </div>
  );
}

// 베이스 컬러를 약간 어둡게 (간단한 그라데이션용)
function shade(hex: string): string {
  const m = hex.replace('#', '');
  const r = Math.max(0, parseInt(m.slice(0, 2), 16) - 40);
  const g = Math.max(0, parseInt(m.slice(2, 4), 16) - 40);
  const b = Math.max(0, parseInt(m.slice(4, 6), 16) - 40);
  return `rgb(${r},${g},${b})`;
}
