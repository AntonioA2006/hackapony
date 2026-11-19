import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  id: string;
  files: File[];
  onChange: (files: File[]) => void;
  multiple?: boolean;
  max?: number;
};

/** Toma una foto con la cámara (pide permiso) o elige una de la galería. */
export default function PhotoCapture({ id, files, onChange, multiple = false, max = 1 }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!open || !video || !stream) return;
    video.srcObject = stream;
    const play = () => {
      void video.play();
    };
    video.addEventListener("loadedmetadata", play);
    play();
    return () => video.removeEventListener("loadedmetadata", play);
  }, [open]);

  const stop = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setOpen(false);
  };

  const usesNativeCamera = () =>
    window.matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const takePhoto = () => {
    setError(null);
    if (usesNativeCamera()) {
      cameraInputRef.current?.click();
      return;
    }
    void openBrowserCamera();
  };

  const openBrowserCamera = async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    const attempts: MediaStreamConstraints[] = [
      { audio: false, video: { facingMode: "environment" } },
      { audio: false, video: true },
    ];
    let last: unknown;
    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        setOpen(true);
        return;
      } catch (err) {
        last = err;
        if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) break;
      }
    }
    const name = last instanceof DOMException ? last.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      setError("No se permitió la cámara. En el candado de la barra de dirección elige Permitir y vuelve a pulsar Tomar foto.");
    } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      setError("No hay una cámara disponible en este equipo. Elige un archivo de tu galería.");
    } else {
      setError("No se pudo abrir la cámara. Ciérrala en otras aplicaciones o elige un archivo.");
    }
  };

  const snap = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
        const next = multiple ? [...files, file].slice(0, max) : [file];
        onChange(next);
        stop();
      },
      "image/jpeg",
      0.9,
    );
  };

  const fromFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    if (!picked.length) return;
    onChange(multiple ? [...files, ...picked].slice(0, max) : [picked[0]]);
  };

  return (
    <div>
      {previews.length > 0 && (
        <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {previews.map((photo, index) => (
            <li key={photo.url} className="relative aspect-square overflow-hidden rounded-input border border-line">
              <img src={photo.url} alt={`Foto ${index + 1}: ${photo.name}`} className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-ink/75 text-white"
                aria-label={`Quitar ${photo.name}`}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              >
                <i className="fa-solid fa-xmark" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {files.length < max && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="press inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-edge bg-cyan px-4 text-body font-medium text-white" onClick={takePhoto}>
            <i className="fa-solid fa-camera" aria-hidden />
            Tomar foto
          </button>
          <input
            ref={cameraInputRef}
            className="sr-only"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              fromFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <label className="press inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-4 text-body text-ink">
            <i className="fa-solid fa-image" aria-hidden />
            Elegir archivo
            <input
              id={id}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              multiple={multiple}
              onChange={(e) => {
                fromFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}
      {error && <p className="mt-2 max-w-full text-pretty text-[13px] leading-snug text-critical">{error}</p>}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-label="Cámara">
            <div className="w-full max-w-lg overflow-hidden rounded-feature bg-card p-3 shadow-float">
              <video
                ref={videoRef}
                className="mx-auto aspect-[3/4] w-full max-h-[70vh] rounded-card bg-soot object-cover object-center sm:aspect-video"
                playsInline
                muted
                autoPlay
              />
              <div className="mt-3 flex gap-2">
                <button type="button" className="press min-h-11 flex-1 rounded-full bg-cyan text-white" onClick={snap}>
                  <i className="fa-solid fa-camera mr-2" aria-hidden />
                  Usar esta foto
                </button>
                <button type="button" className="press min-h-11 rounded-full border border-line px-4" onClick={stop}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
