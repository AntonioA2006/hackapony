import { useRef, useState } from "react";

const DEMO_NUMBER = "+52 55 0000 0000";

/** Contacto de demostración. El número es ficticio: no abre llamada ni WhatsApp. */
export default function ContactFab() {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");
  const timers = useRef<number[]>([]);

  const show = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    setPhase("in");
    timers.current = [
      window.setTimeout(() => setPhase("out"), 1500),
      window.setTimeout(() => setPhase("hidden"), 1700),
    ];
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[1200] sm:bottom-6 sm:right-6">
      {phase !== "hidden" && (
        <p
          role="status"
          aria-live="polite"
          className={`absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-full border border-line bg-card px-4 py-2 text-body font-medium text-ink shadow-float ${
            phase === "in" ? "anim-toast" : "anim-toast-out"
          }`}
        >
          Contáctanos
        </p>
      )}
      <button
        type="button"
        onClick={show}
        className="pointer-events-auto press flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-cyan-edge bg-cyan py-2 pl-3 pr-4 text-left text-white shadow-float hover:bg-cyan-edge"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 3.8h2.2l1.2 3-1.6 1a12.5 12.5 0 0 0 5.4 5.4l1-1.6 3 1.2V19a2 2 0 0 1-2.2 2A16.2 16.2 0 0 1 3 7.8 2 2 0 0 1 5 5.6"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block font-mono text-[13px] leading-none tracking-tight">{DEMO_NUMBER}</span>
          <span className="mt-1 block text-[11px] leading-tight text-white/80">Demostración · no es un teléfono real</span>
        </span>
      </button>
    </div>
  );
}
