# Sistema de Atención Ciudadana — Municipalidad de Guastatoya

Solución web funcional para el registro y seguimiento de quejas ciudadanas.

- **Serie I (Frontend):** portal público + panel de administración municipal, en HTML/CSS/JavaScript con `fetch`.
- **Serie II (Backend + Firebase):** API REST con Node.js + Express, persistencia en **Firestore** y fotografías en **Firebase Storage**.

> Repositorio único (monorepo). Cada carpeta se despliega de forma independiente.

## Estructura del proyecto

```
ExamenDesarolloWeb/
├── backend/                 # Serie II - API REST
│   ├── src/
│   │   ├── constants.js     # Categorías, estados y límites
│   │   ├── firebase.js      # Inicialización de Firebase Admin
│   │   ├── server.js        # Servidor Express, CORS y manejo de errores
│   │   ├── middleware/
│   │   │   ├── upload.js    # Multer (memoria, 5 MB, solo imágenes)
│   │   │   └── validate.js  # Validaciones del servidor
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
│       ├── form.js          # Validaciones y envío de queja
│       └── admin.js         # Listado, filtros, detalle y estados
├── .gitignore
└── README.md
```

## Requisitos

- Node.js 18 o superior.
- Un proyecto de Firebase (plan gratuito **Spark**).
- (Para desplegar) Cuenta en Render y en Vercel o Netlify. También puede usarse GitHub.

---

## 1. Configurar Firebase

1. Cree un proyecto en <https://console.firebase.google.com>.
2. **Firestore Database** → Crear base de datos (modo producción).
3. **Storage** → Comenzar (necesario para las fotografías).
4. **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**. Se descarga un archivo JSON.
5. Use los datos de ese JSON en el `.env` del backend:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (entre comillas, con `\n`)

### Reglas recomendadas (el backend usa el Admin SDK, que omite las reglas)

Firestore (`rules_version = '2'`):

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

Storage:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

> Las imágenes se sirven mediante URLs firmadas que genera el backend, por lo que no es necesario exponer el bucket.

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
# Opción A: extensión Live Server de VS Code (puerto 5500)
# Opción B: servidor estático con Node
npx serve frontend -l 5500
```

Abra `http://localhost:5500`.

Si usa otro puerto, ajuste `CORS_ORIGIN` en `backend/.env`.

## API REST

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/health` | Estado del servicio |
| GET | `/api/meta` | Categorías y estados disponibles |
| POST | `/api/reports` | Registra una queja (`multipart/form-data` con `foto`) |
| GET | `/api/reports` | Lista reportes (filtros: `estado`, `categoria`, `q`, `desde`, `hasta`) |
| GET | `/api/reports/:id` | Detalle de un reporte |
| GET | `/api/reports/stats` | Indicadores (total, pendientes, en proceso, resueltos) |
| PATCH | `/api/reports/:id/status` | Cambia el estado (`{ "estado": "resuelto" }`) |

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
  "fotoPath": "reports/REP-2026-0001/foto-xxxx.jpg",
  "fotoUrl": "https://storage.googleapis.com/...",
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
6. Variables de entorno:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (pegue el valor completo con `\n`)
   - `FIREBASE_STORAGE_BUCKET` (`tu-proyecto.appspot.com`)
   - `CORS_ORIGIN` (la URL de su frontend desplegado)
7. Anote la URL pública, p. ej. `https://atencion-ciudadana.onrender.com`.

> Nota: el plan gratuito de Render "duerme" el servicio tras inactividad; la primera petición puede tardar unos segundos.

### Frontend en Vercel o Netlify

1. **Vercel:** New Project → importe el repositorio.
   - **Root Directory:** `frontend`
   - Framework preset: *Other* / sin build.
2. **Netlify:** New site → importe el repositorio y fije **Base directory:** `frontend`, sin comando de build, publish `frontend`.
3. Edite `frontend/js/config.js` y coloque la URL del backend:

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
5. Confirmar en la consola de Firebase que el documento existe en Firestore y la imagen en Storage.

## Seguridad

- El `.env` y las llaves de servicio **no** se suben al repositorio (ver `.gitignore`).
- El backend valida todos los datos y el tipo/tamaño de las imágenes.
- El acceso directo a Firestore/Storage está bloqueado; solo el backend opera sobre ellos.
