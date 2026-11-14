export const CATEGORIAS = [
  "Bacheo y calles",
  "Alumbrado público",
  "Recolección de basura",
  "Agua y drenajes",
  "Parques y áreas verdes",
  "Seguridad",
  "Otro",
];

export const ESTADOS = ["pendiente", "en_proceso", "resuelto"];

// Límites para las imágenes guardadas como base64 en Firestore.
// Un documento de Firestore no puede superar 1 MiB.
export const MAX_PHOTO_CHARS = 700000;
export const MAX_THUMB_CHARS = 60000;
export const MAX_TOTAL_PHOTO_CHARS = 900000;

export const ALLOWED_DATA_PREFIXES = [
  "data:image/jpeg;base64,",
  "data:image/png;base64,",
  "data:image/webp;base64,",
];
