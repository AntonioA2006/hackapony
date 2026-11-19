import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

type Variant = "primary" | "ghost" | "dark" | "quiet";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-body font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  // Acción principal: el único relleno cromático de la pantalla
  primary: "border border-cyan-edge bg-cyan text-white hover:bg-cyan-edge",
  ghost: "border border-line bg-card/0 font-normal text-ink hover:border-muted hover:bg-card",
  dark: "border border-soot bg-soot text-white hover:bg-ink",
  quiet: "px-3 font-normal text-warm hover:text-ink",
};

export function Button({
  variant = "ghost",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({ variant = "ghost", className = "", ...props }: LinkProps & { variant?: Variant }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card border border-line bg-card p-6 shadow-card ${className}`}>{children}</div>;
}

export function PageHeader({ title, lead, actions }: { title: ReactNode; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-heading-sm">{title}</h1>
        {lead && <p className="mt-2 text-body-lg text-warm">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "dark" }) {
  const tones = {
    neutral: "border-line bg-card text-warm",
    accent: "border-sky bg-sky/60 text-cyan-edge",
    dark: "border-soot bg-soot text-white",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-card p-5">
      <p className="text-[12px] font-medium uppercase tracking-[0.025em] text-warm">{label}</p>
      <p className="mt-1 font-display text-heading-sm tabular-nums">{value}</p>
      {note && <p className="mt-1 text-[12px] text-warm">{note}</p>}
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) {
  const tones = {
    info: "border-line bg-card text-warm",
    error: "border-ink/20 bg-card text-ink",
    success: "border-sky bg-sky/40 text-ink",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-card border px-4 py-3 text-body ${tones[tone]}`}>
      {tone === "error" && <span className="mr-1 font-medium">Atención:</span>}
      {children}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}

export function Spinner({ label = "Cargando…" }: { label?: string }) {
  return (
    <p className="flex items-center gap-2 text-warm" role="status">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-cyan" aria-hidden />
      {label}
    </p>
  );
}
