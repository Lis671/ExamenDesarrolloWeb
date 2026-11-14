import "dotenv/config";
import express from "express";
import cors from "cors";
import reportsRouter from "./routes/reports.js";
import { CATEGORIAS, ESTADOS } from "./constants.js";

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
  })
);

// Límite ampliado porque las imágenes viajan como base64 en el JSON.
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));

app.get(["/", "/health", "/api/health"], (req, res) => {
  res.json({ ok: true, message: "API de atención ciudadana en línea." });
});

app.get("/api/meta", (req, res) => {
  res.json({
    ok: true,
    data: { categorias: CATEGORIAS, estados: ESTADOS },
  });
});

app.use("/api/reports", reportsRouter);

app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Ruta no encontrada." });
});

app.use((error, req, res, next) => {
  if (error.type === "entity.too.large") {
    return res.status(413).json({
      ok: false,
      message: "El contenido enviado es demasiado grande.",
    });
  }

  if (error.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ ok: false, message: "El cuerpo de la solicitud no es válido." });
  }

  const status = error.status || 500;
  if (status >= 500) {
    console.error("[ERROR]", error);
  }

  return res.status(status).json({
    ok: false,
    message:
      status >= 500
        ? "Ocurrió un error interno. Intente nuevamente."
        : error.message,
  });
});

app.listen(PORT, () => {
  console.log(`API escuchando en el puerto ${PORT}`);
});
