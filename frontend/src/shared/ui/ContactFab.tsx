import { useEffect, useRef, useState, type PointerEvent } from "react";

const DEMO_NUMBER = "+52 55 0000 0000";
const STORAGE_KEY = "aa-contact-pos";
const SIZE = 56;

type Pos = { x: number; y: number };

function readPos(): Pos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Pos;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") return parsed;
  } catch {
    /* posición guardada ilegible */
  }
  return null;
}

function clamp(pos: Pos): Pos {
  const pad = 8;
  return {
    x: Math.min(Math.max(pad, pos.x), window.innerWidth - SIZE - pad),
    y: Math.min(Math.max(pad, pos.y), window.innerHeight - SIZE - pad),
  };
}

/** Contacto de demostración. El número es ficticio: no abre llamada ni WhatsApp. */
export default function ContactFab() {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");
  const [pos, setPos] = useState<Pos | null>(() => readPos());
  const [dragging, setDragging] = useState(false);
  const timers = useRef<number[]>([]);
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const open = phase !== "hidden";
  const expandLeft = (pos?.x ?? window.innerWidth) > window.innerWidth / 2;

  const show = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    setPhase("in");
    timers.current = [
      window.setTimeout(() => setPhase("out"), 1500),
      window.setTimeout(() => setPhase("hidden"), 1700),
    ];
  };

  useEffect(() => {
    const onResize = () => setPos((current) => (current ? clamp(current) : current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: box.left, oy: box.top, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.id !== e.pointerId) return;
    const dx = e.clientX - current.sx;
    const dy = e.clientY - current.sy;
    if (!current.moved && Math.hypot(dx, dy) < 6) return;
    current.moved = true;
    setDragging(true);
    setPos(clamp({ x: current.ox + dx, y: current.oy + dy }));
  };

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    drag.current = null;
    setDragging(false);
    if (!current || current.id !== e.pointerId) return;
    if (current.moved) {
      setPos((latest) => {
        if (latest) localStorage.setItem(STORAGE_KEY, JSON.stringify(latest));
        return latest;
      });
      return;
    }
    show();
  };

  return (
    <div
      className="fixed z-[1200]"
      style={pos ? { left: pos.x, top: pos.y } : { right: "max(1rem, env(safe-area-inset-right))", bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      {open && (
        <p
          role="status"
          aria-live="polite"
          className={`pointer-events-none absolute bottom-full mb-3 whitespace-nowrap rounded-full border border-line bg-card px-4 py-2 text-body font-medium text-ink shadow-float ${
            expandLeft ? "right-0" : "left-0"
          } ${phase === "in" ? "anim-toast" : "anim-toast-out"}`}
        >
          Contáctanos
        </p>
      )}
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-open={open ? "true" : "false"}
        data-dragging={dragging ? "true" : "false"}
        aria-label="Contacto de demostración. Arrastra para moverlo."
        className={`aa-fab flex h-14 cursor-grab items-center overflow-hidden rounded-full border border-cyan-edge bg-cyan text-white shadow-float touch-none active:cursor-grabbing data-[dragging=true]:cursor-grabbing ${
          expandLeft ? "flex-row-reverse" : ""
        }`}
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center" aria-hidden>
          <i className="fa-solid fa-phone text-[18px]" aria-hidden />
        </span>
        <span className={`aa-fab-reveal ${expandLeft ? "origin-right" : "origin-left"}`}>
          <span className={`block min-w-0 overflow-hidden whitespace-nowrap text-left ${expandLeft ? "pl-4" : "pr-4"}`}>
            <span className="block font-mono text-[13px] leading-none tracking-tight">{DEMO_NUMBER}</span>
            <span className="mt-1 block text-[11px] leading-tight text-white/80">Demostración · no es un teléfono real</span>
          </span>
        </span>
      </button>
    </div>
  );
}
