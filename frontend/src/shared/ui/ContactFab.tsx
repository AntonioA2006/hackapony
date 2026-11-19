import { useRef, useState } from "react";

const DEMO_NUMBER = "+52 55 0000 0000";

/** Contacto de demostración. El número es ficticio: no abre llamada ni WhatsApp. */
export default function ContactFab() {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");
  const timers = useRef<number[]>([]);
  const open = phase !== "hidden";

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
      {open && (
        <p
          role="status"
          aria-live="polite"
          className={`absolute bottom-full right-0 mb-3 whitespace-nowrap rounded-full border border-line bg-card px-4 py-2 text-body font-medium text-ink shadow-float ${
            phase === "in" ? "anim-toast" : "anim-toast-out"
          }`}
        >
          Contáctanos
        </p>
      )}
      <button
        type="button"
        onClick={show}
        data-open={open ? "true" : "false"}
        aria-label="Contacto de demostración"
        className="aa-fab pointer-events-auto group flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-cyan-edge bg-cyan text-white shadow-float transition-[width,padding,gap] duration-300 ease-out hover:w-auto hover:justify-start hover:gap-3 hover:pl-3 hover:pr-4 focus-visible:w-auto focus-visible:justify-start focus-visible:gap-3 focus-visible:pl-3 focus-visible:pr-4 data-[open=true]:w-auto data-[open=true]:justify-start data-[open=true]:gap-3 data-[open=true]:pl-3 data-[open=true]:pr-4"
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 3.8h2.2l1.2 3-1.6 1a12.5 12.5 0 0 0 5.4 5.4l1-1.6 3 1.2V19a2 2 0 0 1-2.2 2A16.2 16.2 0 0 1 3 7.8 2 2 0 0 1 5 5.6"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-left opacity-0 transition-all duration-300 group-hover:max-w-[15rem] group-hover:opacity-100 group-focus-visible:max-w-[15rem] group-focus-visible:opacity-100 group-data-[open=true]:max-w-[15rem] group-data-[open=true]:opacity-100">
          <span className="block font-mono text-[13px] leading-none tracking-tight">{DEMO_NUMBER}</span>
          <span className="mt-1 block text-[11px] leading-tight text-white/80">Demostración · no es un teléfono real</span>
        </span>
      </button>
    </div>
  );
}
