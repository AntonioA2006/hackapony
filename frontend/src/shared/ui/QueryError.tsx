import { ApiConnectionError } from "../api/client";
import { Button } from "./index";

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
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-ink/15 bg-card px-4 py-3" role="alert">
      <p className="mr-auto text-body text-ink">{message}</p>
      {onRetry && <Button onClick={onRetry}>Reintentar</Button>}
    </div>
  );
}
