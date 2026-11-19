/**
 * Botones para llamar. 911 es el número nacional de emergencias en México (riesgo inmediato: inundación,
 * socavón, cables). El número del organismo operador del agua se configura con VITE_WATER_UTILITY_PHONE
 * (y su nombre con VITE_WATER_UTILITY_NAME) porque cambia por municipio.
 */
const UTILITY_PHONE = (import.meta.env.VITE_WATER_UTILITY_PHONE as string | undefined)?.replace(/[^\d+]/g, "");
const UTILITY_NAME = (import.meta.env.VITE_WATER_UTILITY_NAME as string | undefined) || "organismo operador del agua";

const cls =
  "press inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border px-4 text-body font-medium transition-colors";

export default function CallButtons({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-3"}`}>
      {UTILITY_PHONE && (
        <a className={`${cls} border-soot bg-soot text-white`} href={`tel:${UTILITY_PHONE}`}>
          📞 Llamar al {UTILITY_NAME}
        </a>
      )}
      <a className={`${cls} border-critical/40 bg-card text-critical hover:bg-critical/5`} href="tel:911" title="Solo si hay riesgo para personas">
        🚨 Emergencia 911
      </a>
    </div>
  );
}
