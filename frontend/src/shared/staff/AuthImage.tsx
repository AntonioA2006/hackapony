import { useEffect, useState } from "react";
import { fetchPhotoUrl } from "./api";

/** Miniatura de una foto privada con visor ampliado (Esc o clic para cerrar). */
export default function AuthImage({ reportId, photoId, alt }: { reportId: string; photoId: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let revoked: string | null = null;
    fetchPhotoUrl(reportId, photoId)
      .then((u) => {
        revoked = u;
        setUrl(u);
      })
      .catch(() => setFailed(true));
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [reportId, photoId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (failed) return <div className="flex aspect-square items-center justify-center rounded-input border border-line bg-canvas text-[11px] text-ash">No disponible</div>;
  if (!url) return <div className="skeleton aspect-square" />;
  return (
    <>
      <button type="button" className="anim-pop group relative block aspect-square overflow-hidden rounded-input border border-line" onClick={() => setOpen(true)} aria-label={`Ampliar ${alt}`}>
        <img src={url} alt={alt} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      </button>
      {open && (
        <div className="anim-fade fixed inset-0 z-[3000] flex items-center justify-center bg-ink/80 p-4" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setOpen(false)}>
          <img src={url} alt={alt} className="anim-pop max-h-[90vh] max-w-[95vw] rounded-card shadow-float" />
          <button type="button" className="absolute right-4 top-4 rounded-full bg-card px-3 py-1 text-body" onClick={() => setOpen(false)}>
            Cerrar
          </button>
        </div>
      )}
    </>
  );
}
