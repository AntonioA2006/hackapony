import { ApiConnectionError } from "../api/client";

type Props = {
  error: unknown;
  onRetry?: () => void;
  context?: "map" | "default";
};

export default function QueryError({ error, onRetry, context = "default" }: Props) {
  let message =
    context === "map"
      ? "No fue posible obtener las incidencias. Intenta nuevamente."
      : "No fue posible cargar los datos. Intenta nuevamente.";

  if (error instanceof ApiConnectionError) {
    message = error.message;
  } else if (error instanceof Error && error.message && error.message !== "Failed to fetch") {
    message = error.message;
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900" role="alert">
      <p className="font-medium">{message}</p>
      {onRetry && (
        <button
          type="button"
          className="mt-3 rounded bg-accent-600 px-3 py-1.5 text-sm text-white hover:bg-accent-700"
          onClick={onRetry}
        >
          Reintentar
        </button>
      )}
    </div>
  );
}