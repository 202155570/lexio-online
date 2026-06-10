import type { Tile } from '../game/types';
import { NUMBER_RANK } from '../game/types';

// Sprite sheet: 1629×656, 4 rows × 15 cols
// Row order (top→bottom): moon(달), star(별), cloud(구름), sun(해)
// Col order (left→right): 3,4,5,6,7,8,9,10,11,12,13,14,15,1,2
const TILE_W = 1629 / 15;   // ~108.6
const TILE_H = 656 / 4;     // 164

const SUIT_ROW: Record<string, number> = {
  moon: 0, star: 1, cloud: 2, sun: 3,
};

// Number → column index (rank order from 3 to 2)
const NUM_COL: Record<number, number> = {
  3: 0, 4: 1, 5: 2, 6: 3, 7: 4, 8: 5, 9: 6,
  10: 7, 11: 8, 12: 9, 13: 10, 14: 11, 15: 12,
  1: 13, 2: 14,
};

interface Props {
  tile: Tile;
  selected?: boolean;
  selectable?: boolean;
  small?: boolean;
  onClick?: () => void;
}

export default function TileCard({ tile, selected, selectable, small, onClick }: Props) {
  const col = NUM_COL[tile.number];
  const row = SUIT_ROW[tile.suit];

  const displayW = small ? 54 : 72;
  const displayH = small ? 82 : 109;
  const scale = displayW / TILE_W;

  const bgX = -col * TILE_W * scale;
  const bgY = -row * TILE_H * scale;
  const bgW = 1629 * scale;
  const bgH = 656 * scale;

  return (
    <div
      onClick={selectable ? onClick : undefined}
      style={{
        width: displayW,
        height: displayH,
        backgroundImage: 'url(/tiles.png)',
        backgroundSize: `${bgW}px ${bgH}px`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundRepeat: 'no-repeat',
        borderRadius: 6,
        cursor: selectable ? 'pointer' : 'default',
        transform: selected ? 'translateY(-12px)' : 'translateY(0)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        boxShadow: selected
          ? '0 0 0 2px #ffd700, 0 4px 16px rgba(255,215,0,0.5)'
          : selectable
          ? '0 2px 6px rgba(0,0,0,0.5)'
          : '0 2px 4px rgba(0,0,0,0.3)',
        flexShrink: 0,
        display: 'inline-block',
      }}
      title={`${tile.suit === 'cloud' ? '구름' : tile.suit === 'star' ? '별' : tile.suit === 'moon' ? '달' : '해'} ${tile.number}`}
    />
  );
}
