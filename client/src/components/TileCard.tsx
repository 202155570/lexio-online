import type { Tile } from '../game/types';

// 개별 타일 이미지 사용: /tiles/{suit}_{number}.png (각 92×133, 투명 배경)
const SUIT_LABEL: Record<string, string> = {
  cloud: '구름', star: '별', moon: '달', sun: '해',
};

// 원본 타일 비율 92:133 유지
const ASPECT = 133 / 92;

interface Props {
  tile: Tile;
  selected?: boolean;
  selectable?: boolean;
  small?: boolean;
  width?: number;       // 명시적 폭 지정 (드래그 고스트 등)
  dragging?: boolean;   // 드래그 중 떠 있는 상태 표현
  onClick?: () => void;
}

export default function TileCard({
  tile, selected, selectable, small, width, dragging, onClick,
}: Props) {
  const w = width ?? (small ? 54 : 72);
  const h = Math.round(w * ASPECT);

  return (
    <div
      onClick={selectable ? onClick : undefined}
      style={{
        width: w,
        height: h,
        position: 'relative',
        borderRadius: 7,
        cursor: selectable ? 'pointer' : 'default',
        transform: selected ? 'translateY(-12px)' : 'translateY(0)',
        transition: dragging ? 'none' : 'transform 0.15s ease, box-shadow 0.15s ease',
        boxShadow: selected
          ? '0 0 0 2px #ffd700, 0 4px 16px rgba(255,215,0,0.5)'
          : dragging
          ? '0 12px 28px rgba(0,0,0,0.6)'
          : selectable
          ? '0 2px 6px rgba(0,0,0,0.5)'
          : '0 2px 4px rgba(0,0,0,0.3)',
        flexShrink: 0,
        display: 'inline-block',
      }}
      title={`${SUIT_LABEL[tile.suit]} ${tile.number}`}
    >
      <img
        src={`/tiles/${tile.suit}_${tile.number}.png`}
        alt={`${SUIT_LABEL[tile.suit]} ${tile.number}`}
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'contain',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    </div>
  );
}
