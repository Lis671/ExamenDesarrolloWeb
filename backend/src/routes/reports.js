import { Router } from "express";
import admin, { db } from "../firebase.js";
import { validateReport, validateStatus } from "../middleware/validate.js";

const router = Router();
const COLLECTION = "reports";

function toIso(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function baseReport(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    folio: data.folio,
    nombre: data.nombre,
    correo: data.correo,
    telefono: data.telefono || "",
    categoria: data.categoria,
    ubicacion: data.ubicacion,
    descripcion: data.descripcion,
    estado: data.estado,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function toListReport(doc) {
  return { ...baseReport(doc), fotoUrl: doc.data().fotoThumb || "" };
}

function toDetailReport(doc) {
  return { ...baseReport(doc), fotoUrl: doc.data().foto || "" };
}

async function nextFolio() {
  const counterRef = db.collection("counters").doc("reports");
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const seq = (snapshot.exists ? snapshot.data().seq : 0) + 1;
    transaction.set(counterRef, { seq }, { merge: true });
    const year = new Date().getFullYear();
    return `REP-${year}-${String(seq).padStart(4, "0")}`;
  });
}

router.post("/", async (req, res, next) => {
  try {
    const { valid, errors, values } = validateReport(req.body);
    if (!valid) {
      return res.status(400).json({
        ok: false,
        message: "Revise los datos del formulario.",
        errors,
      });
    }

    const folio = await nextFolio();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const docRef = db.collection(COLLECTION).doc();

    await docRef.set({
      folio,
      ...values,
      estado: "pendiente",
      createdAt: now,
      updatedAt: now,
    });

    return res.status(201).json({
      ok: true,
      message: "Queja registrada correctamente.",
      data: { id: docRef.id, folio, estado: "pendiente" },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const { estado, categoria, q, desde, hasta } = req.query;

    const snapshot = await db
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .get();

    let reports = snapshot.docs.map(toListReport);
    const search = (q || "").trim().toLowerCase();

    if (estado) reports = reports.filter((r) => r.estado === estado);
    if (categoria) reports = reports.filter((r) => r.categoria === categoria);
    if (desde) reports = reports.filter((r) => r.createdAt && r.createdAt >= desde);
    if (hasta) {
      const end = hasta.length === 10 ? `${hasta}T23:59:59.999Z` : hasta;
      reports = reports.filter((r) => r.createdAt && r.createdAt <= end);
    }
    if (search) {
      reports = reports.filter((r) =>
        [r.folio, r.nombre, r.descripcion, r.ubicacion, r.categoria]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(search))
      );
    }

    return res.json({ ok: true, data: reports });
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const snapshot = await db.collection(COLLECTION).get();

    let total = 0;
    const porEstado = { pendiente: 0, en_proceso: 0, resuelto: 0 };
    const porCategoria = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      total += 1;
      if (porEstado[data.estado] !== undefined) porEstado[data.estado] += 1;
      porCategoria[data.categoria] = (porCategoria[data.categoria] || 0) + 1;
    });

    return res.json({
      ok: true,
      data: {
        total,
        pendiente: porEstado.pendiente,
        en_proceso: porEstado.en_proceso,
        resuelto: porEstado.resuelto,
        porCategoria,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) {
      return res
        .status(404)
        .json({ ok: false, message: "Reporte no encontrado." });
    }
    return res.json({ ok: true, data: toDetailReport(doc) });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const { valid, value, message } = validateStatus(req.body.estado);
    if (!valid) {
      return res.status(400).json({ ok: false, message });
    }

    const docRef = db.collection(COLLECTION).doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res
        .status(404)
        .json({ ok: false, message: "Reporte no encontrado." });
    }

    await docRef.update({
      estado: value,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      ok: true,
      message: "Estado actualizado correctamente.",
      data: { id: req.params.id, estado: value },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
