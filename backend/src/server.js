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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  if (error.name === "MulterError") {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "La imagen supera el tamaño máximo permitido (5 MB)."
        : `Error al subir el archivo: ${error.message}`;
    return res.status(413).json({ ok: false, message });
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
