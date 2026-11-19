/**
 * Gráficas ligeras (HTML/SVG, sin dependencias) siguiendo la guía de visualización:
 * marcas delgadas, un solo eje, valores al final de la barra, tooltip al pasar el cursor,
 * texto en tinta (nunca del color de la serie), leyenda para 2+ series y vista de tabla.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/** Serie única = magnitud: un solo tono (azul agua). */
const SINGLE = "#0b84c6";
/** Dos series (abiertas / resueltas): slots validados 1 y 3 de la paleta de referencia. */
export const SERIES = { opened: "#2a78d6", resolved: "#1baf7a" } as const;

type Datum = { key: string; label: string; value: number; note?: string };

function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-input border border-line bg-card px-2.5 py-1.5 text-[12px] text-ink shadow-card"
      style={{ left: x, top: y - 8 }}
      role="status"
    >
      {children}
    </div>
  );
}

/** Barras horizontales: comparar magnitudes entre categorías (área, tipo, fuga). */
export function BarList({
  data,
  format = (n) => n.toLocaleString("es-MX"),
  color = SINGLE,
  empty = "Sin datos en este periodo.",
}: {
  data: Datum[];
  format?: (n: number) => string;
  color?: string;
  empty?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const [hover, setHover] = useState<{ d: Datum; x: number; y: number } | null>(null);
  const ref = useRef<HTMLUListElement>(null);
  if (!data.length) return <p className="py-6 text-center text-[13px] text-warm">{empty}</p>;
  return (
    <ul ref={ref} className="relative space-y-2.5" onMouseLeave={() => setHover(null)}>
      {data.map((d, i) => (
        <li
          key={d.key}
          className="grid grid-cols-[minmax(90px,38%)_1fr] items-center gap-3 rounded-input py-0.5 hover:bg-canvas"
          onMouseMove={(e) => {
            const box = ref.current!.getBoundingClientRect();
            setHover({ d, x: e.clientX - box.left, y: e.clientY - box.top });
          }}
        >
          <span className="truncate text-[13px] text-ink" title={d.label}>
            {d.label}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 flex-1">
              <span
                className="anim-bar block h-full rounded-r"
                style={{ width: `${Math.max(2, (100 * d.value) / max)}%`, background: color, animationDelay: `${i * 40}ms` }}
              />
            </span>
            <span className="w-24 shrink-0 text-right text-[12px] tabular-nums text-warm">{format(d.value)}</span>
          </span>
        </li>
      ))}
      {hover && (
        <Tooltip x={hover.x} y={hover.y}>
          <span className="font-medium">{hover.d.label}</span>: {format(hover.d.value)}
          {hover.d.note ? <span className="text-warm"> · {hover.d.note}</span> : null}
        </Tooltip>
      )}
    </ul>
  );
}

/** Barra segmentada: un todo dividido en partes (incidencias activas por prioridad). */
export function SegmentedBar({ parts }: { parts: { key: string; label: string; value: number; color: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (!total) return <p className="py-4 text-center text-[13px] text-warm">No hay incidencias activas.</p>;
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded" role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(", ")}>
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <span key={p.key} className="anim-bar h-full first:rounded-l last:rounded-r" style={{ flex: p.value, background: p.color }} title={`${p.label}: ${p.value}`} />
          ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-2 whitespace-nowrap">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color }} aria-hidden />
            <span className="text-ink">{p.label}</span>
            <span className="ml-auto tabular-nums text-warm">
              {p.value} · {Math.round((100 * p.value) / total)} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Point = { day: string; opened: number; resolved: number };

/** Línea de dos series sobre un eje: incidencias abiertas vs. resueltas por día. */
export function TrendChart({ data }: { data: Point[] }) {
  // El ancho del SVG sigue al contenedor para que el texto conserve su tamaño real (no se escala)
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 220;
  const PAD = { l: 32, r: 76, t: 12, b: 24 };
  const [hi, setHi] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { x, y, max, ticks } = useMemo(() => {
    const m = Math.max(1, ...data.flatMap((d) => [d.opened, d.resolved]));
    const niceMax = m <= 4 ? 4 : Math.ceil(m / 5) * 5;
    return {
      max: niceMax,
      ticks: [0, niceMax / 2, niceMax],
      x: (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / Math.max(1, data.length - 1),
      y: (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / niceMax),
    };
  }, [data, W]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data.length) return null;
  const path = (k: "opened" | "resolved") => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(" ");
  const last = data[data.length - 1];
  const fmtDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

  return (
    <div className="relative" ref={boxRef}>
      <ul className="mb-2 flex gap-4 text-[12px] text-warm" aria-label="Leyenda">
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: SERIES.opened }} /> Abiertas
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: SERIES.resolved }} /> Resueltas
        </li>
      </ul>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block max-w-full"
        role="img"
        aria-label="Incidencias abiertas y resueltas por día"
        onMouseLeave={() => setHi(null)}
        onMouseMove={(e) => {
          const box = svgRef.current!.getBoundingClientRect();
          const px = ((e.clientX - box.left) / box.width) * W;
          const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (data.length - 1));
          setHi(Math.min(data.length - 1, Math.max(0, i)));
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#e1e8ef" strokeWidth={1} />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="#556678">
              {t}
            </text>
          </g>
        ))}
        {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="#556678">
            {fmtDay(data[i].day)}
          </text>
        ))}
        <path d={path("opened")} fill="none" stroke={SERIES.opened} strokeWidth={2} strokeLinejoin="round" className="anim-draw" />
        <path d={path("resolved")} fill="none" stroke={SERIES.resolved} strokeWidth={2} strokeLinejoin="round" className="anim-draw" />
        {/* Etiquetas directas al final de cada serie */}
        <text x={x(data.length - 1) + 8} y={y(last.opened) + 4} fontSize={11} fill="#0b2338">
          Abiertas {last.opened}
        </text>
        <text x={x(data.length - 1) + 8} y={y(last.resolved) + (Math.abs(y(last.opened) - y(last.resolved)) < 12 ? 16 : 4)} fontSize={11} fill="#0b2338">
          Resueltas {last.resolved}
        </text>
        {hi != null && (
          <g>
            <line x1={x(hi)} x2={x(hi)} y1={PAD.t} y2={H - PAD.b} stroke="#94a3b4" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x(hi)} cy={y(data[hi].opened)} r={4} fill={SERIES.opened} stroke="#fff" strokeWidth={2} />
            <circle cx={x(hi)} cy={y(data[hi].resolved)} r={4} fill={SERIES.resolved} stroke="#fff" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hi != null && svgRef.current && (
        <Tooltip x={(x(hi) / W) * svgRef.current.getBoundingClientRect().width} y={(y(Math.max(data[hi].opened, data[hi].resolved)) / H) * svgRef.current.getBoundingClientRect().height}>
          <span className="font-medium">{fmtDay(data[hi].day)}</span> · {data[hi].opened} abiertas · {data[hi].resolved} resueltas
        </Tooltip>
      )}
      <span className="sr-only">Máximo en el periodo: {max}</span>
    </div>
  );
}

/** Vista de tabla accesible para cualquier gráfica. */
export function DataTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <div className="mt-3 max-h-64 overflow-auto rounded-input border border-line">
      <table className="w-full text-left text-[12px]">
        <thead className="sticky top-0 bg-canvas text-warm">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-3 py-1.5 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td key={j} className={`px-3 py-1.5 ${typeof v === "number" ? "tabular-nums" : ""}`}>
                  {typeof v === "number" ? v.toLocaleString("es-MX") : v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Tarjeta de gráfica con título, nota y botón "Ver tabla". */
export function ChartCard({
  title,
  note,
  children,
  table,
}: {
  title: string;
  note?: string;
  children: ReactNode;
  table?: { columns: string[]; rows: (string | number)[][] };
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className="lift rounded-card border border-line bg-card p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-medium text-ink">{title}</h3>
          {note && <p className="text-[12px] text-warm">{note}</p>}
        </div>
        {table && (
          <button type="button" className="shrink-0 text-[12px] text-cyan-edge hover:underline" onClick={() => setShowTable((v) => !v)}>
            {showTable ? "Ver gráfica" : "Ver tabla"}
          </button>
        )}
      </header>
      {showTable && table ? <DataTable {...table} /> : children}
    </section>
  );
}
