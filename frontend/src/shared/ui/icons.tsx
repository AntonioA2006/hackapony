/**
 * Íconos de línea minimalistas (24×24, trazo 1.75, esquinas redondeadas, color = currentColor).
 * Reemplazan a los emojis para que todos los íconos compartan peso visual y sigan la paleta.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 24, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Goteo: una gota con brillo. */
export const DropIcon = (p: P) => (
  <Base {...p}>
    <path d="M12 2.8c3.7 4.4 6.6 8 6.6 11.6a6.6 6.6 0 0 1-13.2 0c0-3.6 2.9-7.2 6.6-11.6Z" />
    <path className="icon-shine" d="M8.9 14.6a3.2 3.2 0 0 0 2.7 3" />
  </Base>
);

/** Chorro: llave de agua con flujo continuo. */
export const FaucetIcon = (p: P) => (
  <Base {...p}>
    <path d="M3 8.5v6" />
    <path d="M3 10.5h9.5a4.5 4.5 0 0 1 4.5 4.5v1" />
    <path d="M3 14.5h7" />
    <path d="M8 10.5V6.5M5.5 6.5h5" />
    <path className="icon-stream" d="M17 18.5v3" />
  </Base>
);

/** Inundación: tres ondas de agua. */
export const WavesIcon = (p: P) => (
  <Base {...p}>
    <path className="icon-wave" d="M2.5 7.5q2.4-2.6 4.75 0t4.75 0 4.75 0 4.75 0" />
    <path className="icon-wave icon-wave-2" d="M2.5 12.5q2.4-2.6 4.75 0t4.75 0 4.75 0 4.75 0" />
    <path className="icon-wave icon-wave-3" d="M2.5 17.5q2.4-2.6 4.75 0t4.75 0 4.75 0 4.75 0" />
  </Base>
);

export const PhoneIcon = (p: P) => (
  <Base {...p}>
    <path d="M5 4.5h3l1.5 4-2 1.3a10 10 0 0 0 6.7 6.7l1.3-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5Z" />
  </Base>
);

/** Emergencia: triángulo de alerta. */
export const AlertIcon = (p: P) => (
  <Base {...p}>
    <path d="M10.3 4.2 3 17.5A2 2 0 0 0 4.7 20.5h14.6a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4M12 17h.01" />
  </Base>
);

/** Cuadrilla: casco de obra. */
export const HelmetIcon = (p: P) => (
  <Base {...p}>
    <path d="M5 16v-2.5a7 7 0 0 1 14 0V16" />
    <path d="M10 6.8V11M14 6.8V11" />
    <path d="M2.5 16h19v1.2a1.8 1.8 0 0 1-1.8 1.8H4.3a1.8 1.8 0 0 1-1.8-1.8V16Z" />
  </Base>
);

export const PinIcon = (p: P) => (
  <Base {...p}>
    <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </Base>
);

export const CheckIcon = (p: P) => (
  <Base {...p}>
    <path d="M5 12.5 10 17.5 19 7.5" />
  </Base>
);

/** Hamburguesa → X animada (las líneas rotan; ver .burger en index.css). */
export function BurgerIcon({ open, size = 20 }: { open: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden className={`burger ${open ? "is-open" : ""}`}>
      <path className="burger-top" d="M4 7h16" />
      <path className="burger-mid" d="M4 12h16" />
      <path className="burger-bot" d="M4 17h16" />
    </svg>
  );
}
