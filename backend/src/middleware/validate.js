import { CATEGORIAS, ESTADOS } from "../constants.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;

export function validateReport(body, file) {
  const errors = {};

  const nombre = (body.nombre || "").trim();
  const correo = (body.correo || "").trim().toLowerCase();
  const telefono = (body.telefono || "").trim();
  const categoria = (body.categoria || "").trim();
  const ubicacion = (body.ubicacion || "").trim();
  const descripcion = (body.descripcion || "").trim();

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

  if (!file) {
    errors.foto = "La fotografía es obligatoria.";
  }

  const valid = Object.keys(errors).length === 0;

  return {
    valid,
    errors,
    values: { nombre, correo, telefono, categoria, ubicacion, descripcion },
  };
}

export function validateStatus(estado) {
  const value = (estado || "").trim();
  if (!value || !ESTADOS.includes(value)) {
    return { valid: false, message: "Estado no válido." };
  }
  return { valid: true, value };
}
