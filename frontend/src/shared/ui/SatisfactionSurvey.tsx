import { useState } from "react";

const QUESTIONS = [
  { key: "tiempo", label: "¿Qué tan rápido se atendió?" },
  { key: "claridad", label: "¿El seguimiento fue claro?" },
  { key: "resultado", label: "¿Quedó resuelto el problema?" },
] as const;

const SCALE = [
  { n: 1, label: "Nada" },
  { n: 2, label: "Poco" },
  { n: 3, label: "Regular" },
  { n: 4, label: "Bien" },
  { n: 5, label: "Muy bien" },
];

/** Tres preguntas. Se envía el promedio, que es lo que guarda el sistema (1 a 5). */
export default function SatisfactionSurvey({
  onSubmit,
  pending,
}: {
  onSubmit: (score: number) => void;
  pending?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [sent, setSent] = useState(false);
  const ready = QUESTIONS.every((q) => answers[q.key]);

  if (sent) {
    return <p className="text-[13px] text-ok">Gracias. Tu encuesta ya cuenta en la satisfacción.</p>;
  }

  return (
    <fieldset className="mt-3 space-y-3 rounded-card border border-line bg-canvas/60 p-3">
      <legend className="px-1 text-[13px] font-medium text-ink">
        <i className="fa-solid fa-clipboard-check mr-1.5 text-cyan" aria-hidden />
        Encuesta de satisfacción
      </legend>
      {QUESTIONS.map((q) => (
        <div key={q.key}>
          <p className="text-[13px] text-warm">{q.label}</p>
          <div className="mt-1 flex flex-wrap gap-1" role="radiogroup" aria-label={q.label}>
            {SCALE.map((item) => {
              const selected = answers[q.key] === item.n;
              return (
                <button
                  key={item.n}
                  type="button"
                  aria-pressed={selected}
                  className={`min-h-11 rounded-full border px-3 text-[13px] ${selected ? "border-cyan-edge bg-cyan text-white" : "border-line bg-white text-ink"}`}
                  onClick={() => setAnswers((current) => ({ ...current, [q.key]: item.n }))}
                >
                  {item.n} · {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <button
        type="button"
        className="press min-h-11 rounded-full bg-cyan px-4 text-body font-medium text-white disabled:opacity-50"
        disabled={!ready || pending}
        onClick={() => {
          const avg = Math.round(QUESTIONS.reduce((sum, q) => sum + answers[q.key], 0) / QUESTIONS.length);
          onSubmit(Math.min(5, Math.max(1, avg)));
          setSent(true);
        }}
      >
        Enviar encuesta
      </button>
    </fieldset>
  );
}
