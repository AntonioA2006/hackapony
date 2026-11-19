/** Validaciones de formularios (el servidor vuelve a validar todo; esto es para guiar a la persona). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]{1,59}$/u;

export type Errors<K extends string> = Partial<Record<K, string>>;

export function validateEmail(v: string): string | undefined {
  if (!v.trim()) return "Escribe tu correo.";
  if (!EMAIL_RE.test(v.trim())) return "Revisa el formato del correo (ejemplo: nombre@dominio.com).";
}

export function validateName(v: string): string | undefined {
  const t = v.trim();
  if (t.length < 2) return "Escribe al menos 2 caracteres.";
  if (t.length > 60) return "Máximo 60 caracteres.";
  if (!NAME_RE.test(t)) return "Usa solo letras, espacios, puntos o guiones.";
}

export type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string; checks: { ok: boolean; text: string }[] };

export function passwordStrength(v: string): PasswordStrength {
  const checks = [
    { ok: v.length >= 8, text: "Al menos 8 caracteres" },
    { ok: /[a-záéíóúñ]/i.test(v) && /\d/.test(v), text: "Letras y números" },
    { ok: /[A-ZÁÉÍÓÚÑ]/.test(v) && /[a-záéíóúñ]/.test(v), text: "Mayúsculas y minúsculas" },
    { ok: /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/.test(v) || v.length >= 12, text: "Un símbolo o 12+ caracteres" },
  ];
  const score = checks.filter((c) => c.ok).length as PasswordStrength["score"];
  const label = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte"][score];
  return { score, label, checks };
}

export function validatePassword(v: string): string | undefined {
  const s = passwordStrength(v);
  if (!s.checks[0].ok) return "La contraseña debe tener al menos 8 caracteres.";
  if (!s.checks[1].ok) return "Combina letras y números.";
}

export function validateLength(v: string, min: number, max: number, what: string): string | undefined {
  const t = v.trim();
  if (t.length < min) return `${what}: escribe al menos ${min} caracteres (llevas ${t.length}).`;
  if (t.length > max) return `${what}: máximo ${max} caracteres.`;
}

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MAX_COUNT = 5;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validatePhotos(files: File[]): string | undefined {
  if (files.length > PHOTO_MAX_COUNT) return `Máximo ${PHOTO_MAX_COUNT} fotografías.`;
  const badType = files.find((f) => !PHOTO_TYPES.includes(f.type));
  if (badType) return `“${badType.name}” no es JPEG, PNG ni WebP.`;
  const big = files.find((f) => f.size > PHOTO_MAX_BYTES);
  if (big) return `“${big.name}” pesa más de 5 MB.`;
}

/** Props de accesibilidad para un campo con error. */
export function fieldA11y(id: string, error?: string) {
  return { id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? `${id}-error` : undefined };
}
