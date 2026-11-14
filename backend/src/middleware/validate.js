import {
  ALLOWED_DATA_PREFIXES,
  CATEGORIAS,
  ESTADOS,
  MAX_PHOTO_CHARS,
  MAX_THUMB_CHARS,
  MAX_TOTAL_PHOTO_CHARS,
} from "../constants.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;

function isImageDataUrl(value) {
  return ALLOWED_DATA_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export function validateReport(body = {}) {
  const errors = {};

  const nombre = (body.nombre || "").trim();
  const correo = (body.correo || "").trim().toLowerCase();
  const telefono = (body.telefono || "").trim();
  const categoria = (body.categoria || "").trim();
  const ubicacion = (body.ubicacion || "").trim();
  const descripcion = (body.descripcion || "").trim();

  const fotoBase64 =
    typeof body.fotoBase64 === "string" ? body.fotoBase64.trim() : "";
  const fotoThumbBase64 =
    typeof body.fotoThumbBase64 === "string" ? body.fotoThumbBase64.trim() : "";

  if (!nombre) {
    errors.nombre = "El nombre es obligatorio.";
  } else if (nombre.length < 3 || nombre.length > 80) {
    errors.nombre = "El nombre debe tener entre 3 y 80 caracteres.";
  }

  if (!correo) {
    errors.correo = "El correo es obligatorio.";
  } else if (!EMAIL_REGEX.test(correo)) {
    errors.correo = "Ingrese un correo electrónico válido.";
  }

  if (telefono && !PHONE_REGEX.test(telefono)) {
    errors.telefono = "Ingrese un teléfono válido (7 a 20 dígitos).";
  }

  if (!categoria) {
    errors.categoria = "Seleccione una categoría.";
  } else if (!CATEGORIAS.includes(categoria)) {
    errors.categoria = "La categoría seleccionada no es válida.";
  }

  if (!ubicacion) {
    errors.ubicacion = "La ubicación es obligatoria.";
  } else if (ubicacion.length < 5 || ubicacion.length > 150) {
    errors.ubicacion = "La ubicación debe tener entre 5 y 150 caracteres.";
  }

  if (!descripcion) {
    errors.descripcion = "La descripción es obligatoria.";
  } else if (descripcion.length < 10 || descripcion.length > 1000) {
    errors.descripcion =
      "La descripción debe tener entre 10 y 1000 caracteres.";
  }

  if (!fotoBase64) {
    errors.foto = "La fotografía es obligatoria.";
  } else if (!isImageDataUrl(fotoBase64)) {
    errors.foto = "El formato de la imagen no es válido.";
  } else if (fotoBase64.length > MAX_PHOTO_CHARS) {
    errors.foto = "La imagen es demasiado grande. Intente con otra fotografía.";
  }

  if (fotoThumbBase64) {
    if (!isImageDataUrl(fotoThumbBase64)) {
      errors.foto = "La miniatura de la imagen no es válida.";
    } else if (fotoThumbBase64.length > MAX_THUMB_CHARS) {
      errors.foto = "La miniatura de la imagen es demasiado grande.";
    }
  }

  if (
    !errors.foto &&
    fotoBase64.length + fotoThumbBase64.length > MAX_TOTAL_PHOTO_CHARS
  ) {
    errors.foto = "La imagen es demasiado grande. Intente con otra fotografía.";
  }

  const valid = Object.keys(errors).length === 0;

  return {
    valid,
    errors,
    values: {
      nombre,
      correo,
      telefono,
      categoria,
      ubicacion,
      descripcion,
      foto: fotoBase64,
      fotoThumb: fotoThumbBase64,
    },
  };
}

export function validateStatus(estado) {
  const value = (estado || "").trim();
  if (!value || !ESTADOS.includes(value)) {
    return { valid: false, message: "Estado no válido." };
  }
  return { valid: true, value };
}
