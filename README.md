# DScribe Patient Admission Management App

A responsive patient-admission dashboard built to satisfy the DScribe Software Engineer Intern Round 1 task.

## Technology stack

- Frontend: React 18 + Vite
- Backend: Python 3.11+ + FastAPI
- Database: SQLite (persistent local database)
- API: REST / JSON

## Features

- Add, view, edit and delete patients
- Search patients by name
- Filter by ward, department and doctor
- Mark patients as discharged
- Frontend and backend validation
- Responsive dashboard for desktop, tablet and mobile
- SQLite persistence (records survive backend restarts)

## Patient validation

- Name: required, letters and spaces only
- Age: required, integer from 0 through 120
- Gender, Ward, Department and Doctor: required and must match the backend's allowed lists
- Admission date: required and cannot be in the future
- Status: Admitted or Discharged

## Folder structure

```text
dscribe_patient_admission_app/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── render.yaml
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── styles.css
├── .gitignore
└── README.md
```

---

# 1. Run locally (Windows)

Install Python 3.11 or newer and Node.js 18 or newer.

## Start the backend

Open PowerShell in the project folder:

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend:
- API: http://127.0.0.1:8000
- Interactive API documentation: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

The database file `patients.db` is created automatically in the backend folder.

If PowerShell blocks activation, run this once in that terminal:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## Start the frontend

Open a **second** PowerShell window in the project folder:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173).

The frontend uses `http://127.0.0.1:8000` by default. To change it, create `frontend/.env` from `.env.example` and set:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Restart Vite after changing environment variables.

---

# 2. Deploy the backend on Render

1. Create a GitHub repository and push this complete project.
2. In Render, choose **New → Web Service** and connect the repository.
3. Set **Root Directory** to `backend`.
4. Runtime: Python.
5. Build command:

   ```bash
   pip install -r requirements.txt
   ```

6. Start command:

   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

7. Add a persistent disk in Render (recommended/required for SQLite persistence across redeploys):
   - Mount path: `/var/data`
   - Size: choose an available plan/size.
8. Add environment variable:

   ```text
   DATABASE_PATH=/var/data/patients.db
   ```

9. Add environment variable `FRONTEND_ORIGINS` with your deployed frontend origin, for example:

   ```text
   https://your-project.vercel.app
   ```

10. Deploy. Test `https://YOUR-RENDER-SERVICE.onrender.com/health` and `/docs`.

**Important:** Do not rely on the default ephemeral filesystem for production SQLite data. Use a persistent disk. If your Render plan does not support a persistent disk, use a managed persistent database such as PostgreSQL and adapt the backend before submission. Check current Render plan limitations.

---

# 3. Deploy the frontend on Vercel

1. Import the same GitHub repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add environment variable:

   ```text
   VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
   ```

7. Deploy.
8. Copy the Vercel origin (for example `https://your-project.vercel.app`).
9. Go back to Render → Environment and set `FRONTEND_ORIGINS` to that exact origin. Redeploy/restart the backend if requested.
10. Open the Vercel link and test add, edit, filters, search, discharge and delete.

The frontend URL must not end with `/api`; the app adds the API paths itself.

## Alternative: deploy frontend on Netlify

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `frontend/dist` (or `dist` when base directory is set)
- Environment variable: `VITE_API_URL` = your Render backend URL

---

# 4. Push to GitHub

Create an empty **public** repository on GitHub. Then run these commands from the project root:

```powershell
git init
git add .
git commit -m "Build patient admission management app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the remote URL with your own repository URL.

Never commit `.env`, `.venv`, `node_modules`, database files, or passwords. The `.gitignore` file excludes these.

---

# 5. Final testing checklist

Before submitting, test all of these using the live frontend:

- [ ] Add a valid patient
- [ ] Try blank name, name with digits, blank age, age below 0 and age above 120
- [ ] Try a future admission date
- [ ] Try missing select fields
- [ ] Confirm invalid data is rejected by the backend at `/docs` too
- [ ] Search by full and partial patient name
- [ ] Filter by Ward
- [ ] Filter by Department
- [ ] Filter by Doctor
- [ ] Combine search and filters
- [ ] Edit a patient and refresh the page
- [ ] Mark a patient as discharged
- [ ] Delete a patient and test the confirmation
- [ ] Restart the backend and confirm records remain
- [ ] Test the live frontend on mobile width
- [ ] Confirm the frontend is calling the deployed backend, not localhost

## Screenshots for submission

Capture actual screenshots of:
1. Dashboard with patient list
2. Add/Edit patient form
3. Search/filter results
4. Validation error

Add them to a `screenshots/` folder and link them in this README before submitting. Do not submit fabricated screenshots.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/options` | Allowed select values |
| GET | `/api/patients` | List patients (supports search and filters) |
| GET | `/api/patients/{id}` | Get one patient |
| POST | `/api/patients` | Create patient |
| PUT | `/api/patients/{id}` | Update patient |
| PATCH | `/api/patients/{id}/discharge` | Mark discharged |
| DELETE | `/api/patients/{id}` | Delete patient |

## Before emailing DScribe

Replace the placeholder links in your submission email with:
- Public GitHub repository URL
- Live Vercel frontend URL

Also make sure the Render backend is awake and healthy. The task email requests Reply All, both `pramod@dscribe.in` and `suhasm@dscribe.in`, and your full name in the subject.
