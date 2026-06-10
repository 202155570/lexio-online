import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Tile, Play } from '../game/types';
import { HAND_LABEL } from '../game/types';
import { classifyHand, canPlay, sortTiles, sortTilesBySuit } from '../game/rules';
import { useIsMobile } from '../game/useIsMobile';
import TileCard from './TileCard';
import ScoreChips from './ScoreChips';

type AutoMode = 'number' | 'suit';

interface Props {
  tiles: Tile[];
  isMyTurn: boolean;
  lastPlay: Play | null;
  onPlay: (tiles: Tile[]) => void;
  onPass: () => void;
  myName: string;
  myScore: number;
}

const TAP_THRESHOLD = 8; // px 이내 움직임은 '탭(선택)', 그 이상은 '드래그(재배치)'

export default function PlayerHand({
  tiles, isMyTurn, lastPlay, onPlay, onPass, myName, myScore,
}: Props) {
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 정렬 상태: 자동정렬 on/off + (on일 때) 숫자순/문양순
  const [autoSort, setAutoSort] = useState(true);
  const [autoMode, setAutoMode] = useState<AutoMode>('number');
  // 수동(드래그) 정렬용 타일 순서
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // 포인터(마우스/터치 통합) 드래그 추적
  const drag = useRef<{ id: string | null; startX: number; startY: number; dragging: boolean }>(
    { id: null, startX: 0, startY: 0, dragging: false }
  );

  // 화면에 표시할 타일 순서 계산
  const orderedTiles = useMemo(() => {
    if (autoSort) {
      return autoMode === 'number' ? sortTiles(tiles) : sortTilesBySuit(tiles);
    }
    const byId = new Map(tiles.map(t => [t.id, t]));
    const kept = manualOrder.filter(id => byId.has(id)).map(id => byId.get(id)!);
    const fresh = tiles.filter(t => !manualOrder.includes(t.id));
    return [...kept, ...fresh];
  }, [tiles, autoSort, autoMode, manualOrder]);

  // 수동 모드에서 타일 구성이 바뀌면 manualOrder를 동기화
  useEffect(() => {
    if (!autoSort) setManualOrder(orderedTiles.map(t => t.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles.length, autoSort]);

  const selectedTiles = orderedTiles.filter(t => selected.has(t.id));
  const handType = selectedTiles.length > 0 ? classifyHand(selectedTiles) : null;
  const isValidPlay = handType !== null && canPlay({ tiles: selectedTiles, handType }, lastPlay);

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handlePlay = () => {
    if (!isValidPlay) return;
    onPlay(selectedTiles);
    setSelected(new Set());
  };

  const handlePass = () => {
    setSelected(new Set());
    onPass();
  };

  const turnOffAuto = () => {
    setManualOrder(orderedTiles.map(t => t.id));
    setAutoSort(false);
  };

  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const order = orderedTiles.map(t => t.id);
    const from = order.indexOf(fromId);
    const to = order.indexOf(toId);
    if (from < 0 || to < 0) return;
    order.splice(from, 1);
    order.splice(to, 0, fromId);
    setManualOrder(order);
  };

  // ===== 포인터 이벤트: 탭=선택, 드래그=재배치 (마우스/터치 공통) =====
  const onPointerDown = (e: React.PointerEvent, tileId: string) => {
    drag.current = { id: tileId, startX: e.clientX, startY: e.clientY, dragging: false };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.id) return;
    const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
    if (!d.dragging && dist > TAP_THRESHOLD && !autoSort) {
      d.dragging = true;
      setDragId(d.id);
    }
    if (d.dragging) {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const over = el?.closest('[data-tile-id]')?.getAttribute('data-tile-id');
      if (over) setOverId(over);
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d.id) return;
    if (d.dragging) {
      if (overId) reorder(d.id, overId);
    } else if (isMyTurn) {
      toggle(d.id); // 탭 → 선택 토글
    }
    drag.current = { id: null, startX: 0, startY: 0, dragging: false };
    setDragId(null);
    setOverId(null);
  };

  const tileSize = isMobile ? 'mobile' : 'normal';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.nameRow}>
          <span style={styles.myName}>{myName}</span>
          <span style={styles.tileCount}>{tiles.length}장</span>
          <div style={{ marginLeft: 8 }}>
            <ScoreChips score={myScore} size={isMobile ? 22 : 26} />
          </div>
        </div>
        {isMyTurn && <div style={styles.turnBadge}>내 차례!</div>}
      </div>

      {/* 정렬 컨트롤 */}
      <div style={styles.sortBar}>
        <span style={styles.sortLabel}>정렬</span>
        <button
          onClick={() => autoSort ? turnOffAuto() : setAutoSort(true)}
          style={{ ...styles.toggle, background: autoSort ? '#2ecc71' : '#555' }}
          title="자동 정렬 켜기/끄기"
        >
          <span style={{
            ...styles.toggleKnob,
            transform: autoSort ? 'translateX(18px)' : 'translateX(0)',
          }} />
        </button>
        <span style={{ fontSize: 12, color: autoSort ? '#2ecc71' : '#888' }}>
          {autoSort ? '자동' : '수동'}
        </span>

        {autoSort ? (
          <div style={styles.segment}>
            <button
              onClick={() => setAutoMode('number')}
              style={{ ...styles.segBtn, ...(autoMode === 'number' ? styles.segActive : {}) }}
            >숫자순</button>
            <button
              onClick={() => setAutoMode('suit')}
              style={{ ...styles.segBtn, ...(autoMode === 'suit' ? styles.segActive : {}) }}
            >문양순</button>
          </div>
        ) : (
          <span style={styles.dragHint}>
            {isMobile ? '타일을 꾹 눌러 끌면 재배치' : '드래그해서 순서 변경'}
          </span>
        )}
      </div>

      {selectedTiles.length > 0 && (
        <div style={styles.selectionInfo}>
          {handType
            ? <span style={{ color: isValidPlay ? '#2ecc71' : '#e74c3c' }}>
                {HAND_LABEL[handType]} {isValidPlay ? '✓ 낼 수 있음' : '✗ 낼 수 없음'}
              </span>
            : <span style={{ color: '#e74c3c' }}>유효하지 않은 조합</span>
          }
        </div>
      )}

      <div style={styles.handContainer}>
        <div style={{ ...styles.tileRow, minHeight: isMobile ? 90 : 120 }}>
          {orderedTiles.map(tile => (
            <div
              key={tile.id}
              data-tile-id={tile.id}
              onPointerDown={(e) => onPointerDown(e, tile.id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{
                display: 'inline-block',
                paddingLeft: overId === tile.id && dragId !== tile.id ? 8 : 0,
                borderLeft: overId === tile.id && dragId !== tile.id
                  ? '2px solid #ffd700' : '2px solid transparent',
                opacity: dragId === tile.id ? 0.4 : 1,
                cursor: !autoSort ? 'grab' : 'pointer',
                // 수동 모드: 드래그가 스크롤에 막히지 않도록 / 자동 모드: 가로 스크롤 허용
                touchAction: autoSort ? 'pan-x' : 'none',
                transition: 'padding 0.1s',
              }}
            >
              <TileCard
                tile={tile}
                selected={selected.has(tile.id)}
                selectable={isMyTurn}
                small={isMobile}
              />
            </div>
          ))}
          {tiles.length === 0 && <div style={styles.empty}>타일 없음</div>}
        </div>
      </div>

      <div style={styles.actions}>
        <button
          onClick={handlePlay}
          disabled={!isMyTurn || !isValidPlay}
          style={{
            ...styles.btn,
            flex: isMobile ? 1 : 'none',
            background: isMyTurn && isValidPlay ? '#2ecc71' : '#444',
            color: isMyTurn && isValidPlay ? '#fff' : '#888',
            cursor: isMyTurn && isValidPlay ? 'pointer' : 'not-allowed',
          }}
        >
          내기 ({selectedTiles.length})
        </button>
        <button
          onClick={handlePass}
          disabled={!isMyTurn || !lastPlay}
          style={{
            ...styles.btn,
            flex: isMobile ? 1 : 'none',
            background: isMyTurn && lastPlay ? '#e74c3c' : '#444',
            color: isMyTurn && lastPlay ? '#fff' : '#888',
            cursor: isMyTurn && lastPlay ? 'pointer' : 'not-allowed',
          }}
        >
          패스
        </button>
        <button
          onClick={() => setSelected(new Set())}
          style={{ ...styles.btn, flex: isMobile ? 1 : 'none', background: 'transparent', border: '1px solid #555', color: '#888' }}
        >
          선택 해제
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(0,0,0,0.5)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    padding: '10px 12px 14px',
    backdropFilter: 'blur(8px)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8, flexWrap: 'wrap', gap: 6,
  },
  nameRow: { display: 'flex', alignItems: 'center', gap: 8 },
  myName: { fontSize: 14, fontWeight: 700, color: '#fff' },
  tileCount: { fontSize: 12, color: '#888' },
  turnBadge: {
    padding: '4px 12px', borderRadius: 20,
    background: '#ffd700', color: '#000',
    fontSize: 12, fontWeight: 700,
    animation: 'pulse 1s ease infinite',
  },
  sortBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: 8, flexWrap: 'wrap',
  },
  sortLabel: { fontSize: 12, color: '#888' },
  toggle: {
    position: 'relative', width: 40, height: 22, borderRadius: 11,
    border: 'none', cursor: 'pointer', padding: 2, transition: 'background 0.2s',
    flexShrink: 0,
  },
  toggleKnob: {
    display: 'block', width: 18, height: 18, borderRadius: '50%',
    background: '#fff', transition: 'transform 0.2s',
  },
  segment: { display: 'flex', gap: 2, borderRadius: 6, overflow: 'hidden' },
  segBtn: {
    padding: '4px 12px', fontSize: 12, border: '1px solid #444',
    background: 'transparent', color: '#aaa', cursor: 'pointer',
  },
  segActive: { background: '#3498db', color: '#fff', borderColor: '#3498db' },
  dragHint: { fontSize: 11, color: '#888', fontStyle: 'italic' },
  selectionInfo: { fontSize: 12, marginBottom: 8, height: 18 },
  handContainer: { overflowX: 'auto', paddingBottom: 4 },
  tileRow: { display: 'flex', gap: 4, paddingBottom: 4, alignItems: 'flex-end' },
  empty: { color: '#666', fontSize: 14, alignSelf: 'center' },
  actions: { display: 'flex', gap: 8, marginTop: 12 },
  btn: {
    padding: '10px 20px', borderRadius: 8, border: 'none',
    fontSize: 14, fontWeight: 600, transition: 'opacity 0.15s',
  },
};
