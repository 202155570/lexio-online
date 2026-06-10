import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

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

  // window 핸들러가 최신 값을 읽도록 ref 동기화 (캡처 의존 X → 커서 어디든 추적)
  const overIdRef = useRef(overId); overIdRef.current = overId;
  const autoSortRef = useRef(autoSort); autoSortRef.current = autoSort;
  const isMyTurnRef = useRef(isMyTurn); isMyTurnRef.current = isMyTurn;
  const orderedRef = useRef(orderedTiles); orderedRef.current = orderedTiles;

  // ===== 포인터 이벤트: 탭=선택, 드래그=재배치 (마우스/터치 공통) =====
  // 타일에서 시작만 잡고, 이동/종료는 window에서 처리 → 커서가 테이블 위로 가도 끊기지 않음
  const onPointerDown = (e: React.PointerEvent, tileId: string) => {
    drag.current = { id: tileId, startX: e.clientX, startY: e.clientY, dragging: false };
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d.id) return;
      const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
      if (!d.dragging && dist > TAP_THRESHOLD && !autoSortRef.current) {
        d.dragging = true;
        setDragId(d.id);
      }
      if (d.dragging) {
        setDragPos({ x: e.clientX, y: e.clientY }); // 손에 들린 고스트 위치
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const over = el?.closest('[data-tile-id]')?.getAttribute('data-tile-id') ?? null;
        setOverId(over);
      }
    };
    const up = () => {
      const d = drag.current;
      if (!d.id) return;
      if (d.dragging) {
        const toId = overIdRef.current;
        if (toId && toId !== d.id) {
          const order = orderedRef.current.map(t => t.id);
          const from = order.indexOf(d.id);
          const to = order.indexOf(toId);
          if (from >= 0 && to >= 0) {
            order.splice(from, 1);
            order.splice(to, 0, d.id);
            setManualOrder(order);
          }
        }
      } else if (isMyTurnRef.current) {
        toggle(d.id); // 탭 → 선택 토글
      }
      drag.current = { id: null, startX: 0, startY: 0, dragging: false };
      setDragId(null);
      setOverId(null);
      setDragPos(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [toggle]);

  const draggingTile = dragId ? orderedTiles.find(t => t.id === dragId) : null;

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
          {orderedTiles.map(tile => {
            const isDragged = dragId === tile.id;
            const isOver = overId === tile.id && !isDragged;
            return (
              <div
                key={tile.id}
                data-tile-id={tile.id}
                onPointerDown={(e) => onPointerDown(e, tile.id)}
                style={{
                  display: 'inline-block',
                  paddingLeft: isOver ? 10 : 0,
                  borderLeft: isOver ? '3px solid #ffd700' : '3px solid transparent',
                  cursor: !autoSort ? 'grab' : 'pointer',
                  // 수동 모드: 드래그가 스크롤에 막히지 않도록 / 자동 모드: 가로 스크롤 허용
                  touchAction: autoSort ? 'pan-x' : 'none',
                  transition: 'padding 0.1s',
                }}
              >
                {isDragged ? (
                  // 들어올린 타일 자리는 빈 placeholder로 표시
                  <div style={{
                    width: isMobile ? 54 : 72,
                    height: Math.round((isMobile ? 54 : 72) * 133 / 92),
                    borderRadius: 7,
                    border: '2px dashed rgba(255,215,0,0.5)',
                    background: 'rgba(255,255,255,0.04)',
                  }} />
                ) : (
                  <TileCard
                    tile={tile}
                    selected={selected.has(tile.id)}
                    selectable={isMyTurn}
                    small={isMobile}
                  />
                )}
              </div>
            );
          })}
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

      {/* 드래그 중인 타일: 커서를 따라 손에 들린 것처럼 떠다님.
          backdrop-filter 컨테이너가 fixed 기준이 되는 걸 피하려고 body로 portal */}
      {draggingTile && dragPos && createPortal(
        <div
          style={{
            position: 'fixed',
            left: dragPos.x,
            top: dragPos.y,
            transform: 'translate(-50%, -115%) rotate(-5deg) scale(1.12)',
            pointerEvents: 'none',
            zIndex: 9999,
            filter: 'drop-shadow(0 14px 16px rgba(0,0,0,0.55))',
          }}
        >
          <TileCard tile={draggingTile} small={isMobile} dragging />
        </div>,
        document.body,
      )}
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
