import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
  ReactNode,
  CSSProperties,
  forwardRef,
  useImperativeHandle,
} from "react";

type Direction = "left" | "right";

export interface SwipeItem<T = any> {
  id: string | number;
  data: T;
}

export interface SwipeDeckProps<T = any> {
  items: SwipeItem<T>[];
  renderCard: (item: SwipeItem<T>) => ReactNode;
  onSwipe?: (item: SwipeItem<T>, direction: Direction, index: number) => void;
  onEmpty?: () => void;
  likeThreshold?: number; // px
  maxRotation?: number; // deg
  className?: string;
  style?: CSSProperties;
  loop?: boolean;
  animateDuration?: number; // ms
}

export interface SwipeDeckRef {
  swipeLeft: () => void;
  swipeRight: () => void;
  reset: () => void;
  rewind: () => void;
}

interface CardState {
  x: number;
  y: number;
  rot: number;
  leaving: boolean;
  dir?: Direction;
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

export const SwipeDeck = forwardRef<SwipeDeckRef, SwipeDeckProps>(
  (
    {
      items,
      renderCard,
      onSwipe,
      onEmpty,
      likeThreshold = 120,
      maxRotation = 18,
      className,
      style,
      loop = false,
      animateDuration = 300,
    },
    ref
  ) => {
    const [index, setIndex] = useState(0);
    const [cardState, setCardState] = useState<CardState>({
      x: 0,
      y: 0,
      rot: 0,
      leaving: false,
    });
    const startRef = useRef<{ x: number; y: number } | null>(null);
    const animRef = useRef<number | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const currentItem = items[index];

    const cleanRAF = () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
    };

    const advance = useCallback(
      (dir: Direction) => {
        if (!currentItem) return;
        onSwipe?.(currentItem, dir, index);
        const nextIndex = index + 1;
        if (nextIndex >= items.length) {
          if (loop && items.length > 0) {
            setIndex(0);
          } else {
            onEmpty?.();
          }
        } else {
          setIndex(nextIndex);
        }
        setCardState({ x: 0, y: 0, rot: 0, leaving: false });
      },
      [currentItem, index, items, loop, onSwipe, onEmpty]
    );

    const rewind = useCallback(() => {
      if (index > 0) {
        setIndex(index - 1);
        setCardState({ x: 0, y: 0, rot: 0, leaving: false });
      } else if (loop && items.length > 0) {
        setIndex(items.length - 1);
        setCardState({ x: 0, y: 0, rot: 0, leaving: false });
      }
    }, [index, loop, items.length]);

    const fling = useCallback(
      (dir: Direction) => {
        if (!currentItem) return;
        const endX = (dir === "right" ? 1 : -1) * (window.innerWidth * 1.2);
        setCardState((s) => ({
          ...s,
          x: endX,
          rot: (dir === "right" ? 1 : -1) * maxRotation,
          leaving: true,
          dir,
        }));
        // After animation ends
        window.setTimeout(() => advance(dir), animateDuration * 0.9);
      },
      [advance, currentItem, maxRotation, animateDuration]
    );

    useImperativeHandle(
      ref,
      () => ({
        swipeLeft: () => fling("left"),
        swipeRight: () => fling("right"),
        reset: () => {
          setCardState({ x: 0, y: 0, rot: 0, leaving: false });
        },
        rewind: () => rewind(),
      }),
      [fling, rewind]
    );

    const handlePointerDown = (e: React.PointerEvent) => {
      if (!currentItem || cardState.leaving) return;
      if (rootRef.current) rootRef.current.setPointerCapture(e.pointerId);
      startRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      if (!startRef.current || !currentItem || cardState.leaving) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      const widthFactor = clamp(dx / likeThreshold, -1, 1);
      const rot = widthFactor * maxRotation;
      setCardState((s) => ({ ...s, x: dx, y: dy, rot }));
    };

    const handlePointerUp = () => {
      if (!startRef.current || !currentItem || cardState.leaving) return;
      const { x } = cardState;
      const passed = Math.abs(x) > likeThreshold;
      if (passed) {
        fling(x > 0 ? "right" : "left");
      } else {
        // animate back
        const from = { ...cardState };
        const start = performance.now();
        const duration = 180;
        const animateBack = (t: number) => {
          const p = clamp((t - start) / duration, 0, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setCardState({
            x: from.x * (1 - ease),
            y: from.y * (1 - ease),
            rot: from.rot * (1 - ease),
            leaving: false,
          });
          if (p < 1) {
            animRef.current = requestAnimationFrame(animateBack);
          } else {
            startRef.current = null;
          }
        };
        cleanRAF();
        animRef.current = requestAnimationFrame(animateBack);
      }
      startRef.current = null;
    };

    useEffect(() => () => cleanRAF(), []);

    const like = () => fling("right");
    const dislike = () => fling("left");

    const cardTransform = `translate(${cardState.x}px, ${cardState.y}px) rotate(${cardState.rot}deg)`;
    const transition = cardState.leaving
      ? `transform ${animateDuration}ms cubic-bezier(.22,.61,.36,1)`
      : startRef.current
        ? "none"
        : "transform 180ms ease";

    return (
      <div
        className={className}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          ...style,
        }}
      >
        {/* Card stack */}
        <div style={{ position: "absolute", inset: 0 }}>
          {items.slice(index + 1, index + 4).map((it, i) => {
            const scale = 1 - i * 0.04;
            const y = i * 10;
            const opacity = 1 - i * 0.15;
            return (
              <div
                key={it.id}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  transform: `translateY(${y}px) scale(${scale})`,
                  opacity,
                  pointerEvents: "none",
                  transition: "transform 300ms ease, opacity 300ms ease",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "#111",
                    boxShadow: "0 8px 24px -4px rgba(0,0,0,0.4)",
                  }}
                >
                  {renderCard(it)}
                </div>
              </div>
            );
          })}
          {currentItem && (
            <div
              ref={rootRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                position: "absolute",
                inset: 0,
                touchAction: "none",
                cursor: startRef.current ? "grabbing" : "grab",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                transform: cardTransform,
                transition,
                willChange: "transform",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 18,
                  background: "#1c1c1e",
                  overflow: "hidden",
                  position: "relative",
                  boxShadow: "0 10px 30px -6px rgba(0,0,0,0.55)",
                  userSelect: "none",
                }}
              >
                {/* Overlays */}
                <OverlayLabel
                  active={cardState.x > likeThreshold / 2}
                  text="LIKE"
                  color="#2ecc71"
                  rotation={-12}
                  side="left"
                />
                <OverlayLabel
                  active={cardState.x < -likeThreshold / 2}
                  text="NOPE"
                  color="#e74c3c"
                  rotation={12}
                  side="right"
                />
                {renderCard(currentItem)}
              </div>
            </div>
          )}
          {!currentItem && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#888",
                fontSize: 18,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              No more items
            </div>
          )}
        </div>

        {/* Controls */}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 20,
            zIndex: 50,
          }}
        >
          <button
            onClick={rewind}
            aria-label="Previous"
            style={circleBtnStyle("#3498db")}
            disabled={!loop && index === 0}
          >
            ↶
          </button>
          <button
            onClick={dislike}
            aria-label="Dislike"
            style={circleBtnStyle("#e74c3c")}
            disabled={!currentItem}
          >
            ✕
          </button>
          <button
            onClick={like}
            aria-label="Like"
            style={circleBtnStyle("#2ecc71")}
            disabled={!currentItem}
          >
            ❤
          </button>
        </div>
      </div>
    );
  }
);

SwipeDeck.displayName = "SwipeDeck";

const circleBtnStyle = (bg: string): CSSProperties => ({
  width: 64,
  height: 64,
  borderRadius: "50%",
  border: "none",
  background: bg,
  color: "#fff",
  fontSize: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 6px 16px -4px rgba(0,0,0,0.5)",
  transition: "transform 120ms ease, box-shadow 120ms ease, opacity 120ms",
  fontFamily: "system-ui, sans-serif",
  outline: "none",
});

interface OverlayLabelProps {
  active: boolean;
  text: string;
  color: string;
  rotation: number;
  side: "left" | "right";
}

const OverlayLabel: React.FC<OverlayLabelProps> = ({
  active,
  text,
  color,
  rotation,
  side,
}) => (
  <div
    style={
      {
        position: "absolute",
        top: 18,
        [side === "left" ? "left" : "right"]: 18,
        padding: "6px 14px 5px",
        border: `3px solid ${color}`,
        borderRadius: 8,
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: 2,
        fontFamily: "system-ui, sans-serif",
        color,
        transform: `rotate(${rotation}deg) scale(${active ? 1 : 0.85})`,
        opacity: active ? 1 : 0,
        transition: "opacity 160ms ease, transform 160ms ease",
        background: "rgba(0,0,0,0.35)",
        textShadow: "0 1px 2px rgba(0,0,0,0.5)",
        pointerEvents: "none",
      } as CSSProperties
    }
  >
    {text}
  </div>
);

// Example of local default export component wrapping deck with sample usage
// Remove or adjust as needed
export interface SampleItem {
  title: string;
  image?: string;
  description?: string;
}

export const SampleSwipeDemo: React.FC = () => {
  const ref = useRef<SwipeDeckRef>(null);
  const demoItems: SwipeItem<SampleItem>[] = [
    { id: 1, data: { title: "Mountains", description: "Fresh air & vistas" } },
    { id: 2, data: { title: "Ocean", description: "Waves & breeze" } },
    { id: 3, data: { title: "Forest", description: "Green & serene" } },
  ];

  return (
    <div
      style={{
        width: 340,
        height: 540,
        margin: "0 auto",
        position: "relative",
      }}
    >
      <SwipeDeck
        ref={ref}
        items={demoItems}
        onSwipe={(item, dir) => console.log("swiped", dir, item)}
        onEmpty={() => console.log("empty")}
        renderCard={(item) => (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              padding: 24,
              gap: 16,
              background: "linear-gradient(160deg,#222,#111)",
              color: "#fff",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 28 }}>{item.data.title}</h2>
            <p style={{ margin: 0, opacity: 0.8 }}>{item.data.description}</p>
            <div style={{ marginTop: "auto", fontSize: 12, opacity: 0.5 }}>
              Swipe left / right
            </div>
          </div>
        )}
      />

      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
        }}
      >
        <button
          onClick={() => ref.current?.rewind()}
          style={miniBtn("#f39c12")}
        >
          Previous
        </button>
        <button
          onClick={() => ref.current?.swipeLeft()}
          style={miniBtn("#e74c3c")}
        >
          Left
        </button>
        <button
          onClick={() => ref.current?.swipeRight()}
          style={miniBtn("#2ecc71")}
        >
          Right
        </button>
        <button onClick={() => ref.current?.reset()} style={miniBtn("#3498db")}>
          Reset
        </button>
      </div>
    </div>
  );
};

const miniBtn = (bg: string): CSSProperties => ({
  background: bg,
  border: "none",
  color: "#fff",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
});

export default SwipeDeck;
