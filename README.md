# Sistema de Atención Ciudadana — Municipalidad de Guastatoya

Solución web funcional para el registro y seguimiento de quejas ciudadanas.

- **Serie I (Frontend):** portal público + panel de administración municipal, en HTML/CSS/JavaScript con `fetch`.
- **Serie II (Backend + Firebase):** API REST con Node.js + Express y persistencia en **Firestore** (plan gratuito **Spark**, sin tarjeta).

> Repositorio único (monorepo). Cada carpeta se despliega de forma independiente.

## ¿Por qué las fotos van en Firestore?

Desde 2026, **Cloud Storage para Firebase exige el plan Blaze** (con tarjeta). Para mantenernos
100% en el plan gratuito **Spark**, la fotografía se comprime en el navegador y se guarda como
`base64` dentro del mismo documento de Firestore. Además se guarda una miniatura para que el
listado del panel cargue rápido. Cada documento se mantiene por debajo del límite de 1 MiB.

## Estructura del proyecto

```
ExamenDesarolloWeb/
├── backend/                 # Serie II - API REST
│   ├── src/
│   │   ├── constants.js     # Categorías, estados y límites de imagen
│   │   ├── firebase.js      # Inicialización de Firebase Admin (solo Firestore)
│   │   ├── server.js        # Servidor Express, CORS y manejo de errores
│   │   ├── middleware/
│   │   │   └── validate.js  # Validaciones del servidor (incluye imagen base64)
│   │   └── routes/
│   │       └── reports.js   # Endpoints de reportes
│   ├── .env.example
│   └── package.json
├── frontend/                # Serie I - Interfaz
│   ├── index.html           # Portal público ciudadano
│   ├── admin.html           # Panel de Administración Municipal
│   ├── css/styles.css
│   └── js/
│       ├── config.js        # URL del backend (editar al desplegar)
│       ├── api.js           # Cliente fetch centralizado
│       ├── form.js          # Validación, compresión de imagen y envío
│       └── admin.js         # Listado, filtros, detalle y estados
├── .gitignore
└── README.md
```

## Requisitos

- Node.js 18 o superior.
- Un proyecto de Firebase en el plan gratuito **Spark** (sin facturación).

---

## 1. Configurar Firebase (plan Spark, sin tarjeta)

1. Cree un proyecto en <https://console.firebase.google.com>.
2. **Firestore Database** → **Crear base de datos** → modo **Producción** → región `us-central1`.
3. **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**. Se descarga un archivo JSON.
4. Use los datos de ese JSON en el `.env` del backend:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (con los `\n`, sin comillas externas)

> No active Cloud Storage: no se usa y no es necesario.

### Reglas de Firestore (el backend usa el Admin SDK, que omite las reglas)

Firestore → **Reglas** → publicar:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 2. Ejecutar el backend en local

```bash
cd backend
copy .env.example .env      # Windows (en macOS/Linux: cp .env.example .env)
npm install
npm run dev                 # o: npm start
```

El API queda en `http://localhost:4000`. Verifique con `GET http://localhost:4000/api/health`.

## 3. Ejecutar el frontend en local

Sirva la carpeta `frontend` con cualquier servidor estático (no abra los HTML con doble clic):

```bash
npx serve frontend -l 5500
```

Abra `http://localhost:5500`. Si usa otro puerto, ajuste `CORS_ORIGIN` en `backend/.env`.

## API REST

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/health` | Estado del servicio |
| GET | `/api/meta` | Categorías y estados disponibles |
| POST | `/api/reports` | Registra una queja (`application/json` con la imagen en base64) |
| GET | `/api/reports` | Lista reportes (filtros: `estado`, `categoria`, `q`, `desde`, `hasta`) |
| GET | `/api/reports/:id` | Detalle de un reporte (incluye la fotografía completa) |
| GET | `/api/reports/stats` | Indicadores (total, pendientes, en proceso, resueltos) |
| PATCH | `/api/reports/:id/status` | Cambia el estado (`{ "estado": "resuelto" }`) |

### Ejemplo de cuerpo `POST /api/reports`

```json
{
  "nombre": "María López",
  "correo": "maria@ejemplo.com",
  "telefono": "5555 5555",
  "categoria": "Bacheo y calles",
  "ubicacion": "4a. calle, zona 1",
  "descripcion": "Bache profundo frente al parque",
  "fotoBase64": "data:image/jpeg;base64,/9j/4AAQ...",
  "fotoThumbBase64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

### Modelo de datos (Firestore `reports/{id}`)

```json
{
  "folio": "REP-2026-0001",
  "nombre": "María López",
  "correo": "maria@ejemplo.com",
  "telefono": "5555 5555",
  "categoria": "Bacheo y calles",
  "ubicacion": "4a. calle, zona 1",
  "descripcion": "Bache profundo frente al parque",
  "foto": "data:image/jpeg;base64,...",
  "fotoThumb": "data:image/jpeg;base64,...",
  "estado": "pendiente",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## 4. Despliegue

### Backend en Render

1. Suba el proyecto a GitHub.
2. En Render: **New → Web Service** → conecte el repositorio.
3. **Root Directory:** `backend`
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. **Health Check Path:** `/api/health`
7. Variables de entorno:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (con `\n`, sin comillas)
   - `CORS_ORIGIN` (la URL de su frontend desplegado)
8. Anote la URL pública, p. ej. `https://atencion-ciudadana.onrender.com`.

> El plan gratuito de Render "duerme" el servicio tras inactividad; la primera petición puede tardar unos segundos.

### Frontend en Vercel o Netlify

1. **Vercel:** New Project → importe el repositorio.
   - **Root Directory:** `frontend`
   - Framework preset: *Other* / sin build.
2. **Netlify:** New site → importe el repositorio y fije **Base directory:** `frontend`, sin comando de build, publish `frontend`.
3. Edite `frontend/js/config.js` con la URL del backend:

   ```js
   window.APP_CONFIG = {
     API_BASE_URL: "https://atencion-ciudadana.onrender.com/api",
   };
   ```

4. Vuelva a Render y agregue la URL del frontend en `CORS_ORIGIN`.

## 5. Flujo a demostrar

1. Abrir el **portal público** y registrar una queja con fotografía.
2. Recibir el **folio** de confirmación.
3. Abrir el **Panel de Administración** y comprobar que el reporte aparece con la foto y la descripción original.
4. Filtrar, ver el detalle y **cambiar el estado** del reporte.
5. Confirmar en la consola de Firebase que el documento existe en Firestore (con sus campos `foto` y `fotoThumb`).

## Seguridad

- El `.env` y las llaves de servicio **no** se suben al repositorio (ver `.gitignore`).
- El backend valida todos los datos y el tamaño/formato de las imágenes.
- El acceso directo a Firestore está bloqueado; solo el backend (Admin SDK) opera sobre él.
