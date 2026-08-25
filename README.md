# Agency CRM

Digital Marketing Agency CRM + Project Management System. Manager portal (dashboard, Kanban task board, clients, team, activity log) and Team portal (my tasks, profile) with JWT auth and role-based access.

## Tech Stack

- **Backend:** Node.js, Express, JSON file database (zero installation), JWT, bcryptjs
- **Frontend:** React 18 (Vite), Tailwind CSS, React Router 6, Axios, Recharts, react-hot-toast, Lucide icons

## Project Structure

```
agency-crm/
├── backend/
│   ├── src/
│   │   ├── models/        # User, Client, Task, Activity (JSON store data layer)
│   │   ├── routes/        # auth, clients, tasks, team, dashboard
│   │   ├── middleware/    # auth (JWT + managerOnly), errorHandler
│   │   ├── store.js       # JSON file persistence (data/db.json)
│   │   ├── server.js
│   │   └── seed.js        # demo data seeder
│   ├── data/db.json       # created at runtime (the database)
│   ├── .env
│   └── .env.example
└── frontend/
    └── src/
        ├── components/    # TaskModal, ClientModal, MemberModal, ui kit
        ├── layouts/       # ManagerLayout, TeamLayout
        ├── pages/         # Login, Dashboard, Tasks, Clients, Team,
        │                  # Activity, MyTasks, MyProfile
        ├── context/AuthContext.jsx
        └── utils/api.js
```

## Local Setup

### 1. Backend

No database installation needed — data is stored in `backend/data/db.json`.

```bash
cd backend
npm install          # already done if you received this repo pre-installed
npm run seed         # optional: resets and seeds demo data (also wipes existing data)
npm run dev          # starts on http://localhost:5000
```

`.env`:

```
PORT=5000
JWT_SECRET=change-this-to-a-long-random-secret-min-32-chars
JWT_EXPIRE=30d
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

> **Note:** `npm run seed` deletes everything in `data/db.json` and re-creates demo data. Back up that file if you have real data in it.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173 (proxies /api → :5000)
```

## Demo Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Manager | admin@agency.com | Admin@123 |
| Team | ali@agency.com, sara@agency.com, bilal@agency.com, hina@agency.com, usman@agency.com, ayesha@agency.com | Team@123 |

## Deployment

### Backend — Render / Railway

1. Push repo to GitHub.
2. Render → New Web Service → connect repo → root dir `backend`.
3. Build command `npm install`, start command `npm start`.
4. Environment variables: `JWT_SECRET`, `JWT_EXPIRE=30d`, `NODE_ENV=production`, `FRONTEND_URL=https://your-app.vercel.app`.
5. **Important:** the free tier has an ephemeral disk — `data/db.json` resets on every redeploy/restart. For production use a persistent disk (Render disks / Railway volumes mounted at the backend dir) or re-run the seed after deploys.
6. Seed once (optional): run `npm run seed` locally, then deploy `data/db.json` with the repo (remove `data/` from `.gitignore` if you want seeded data shipped).

### Frontend — Vercel

1. Vercel → Import repo → root dir `frontend` (framework auto-detected: Vite).
2. Environment variable: `VITE_API_URL=https://your-backend.onrender.com/api`
   - If set, update `frontend/src/utils/api.js` baseURL to use it; otherwise keep the dev proxy for local only.
3. Deploy.

### First Login

1. Open the deployed frontend.
2. Login as manager (`admin@agency.com / Admin@123`) or register your own first manager via `POST /api/auth/register` (first-ever manager is allowed without auth).
3. Add clients, add team members, create tasks.

## API Overview

| Route | Methods | Access |
|-------|---------|--------|
| `/api/auth` | register, login, me, profile | public / auth |
| `/api/clients` | GET all, GET one | any authenticated |
| `/api/clients` | POST, PUT, DELETE | manager only |
| `/api/tasks` | GET (team sees only their tasks), POST, PUT, DELETE | role-based |
| `/api/team` | GET list/stats, PUT, DELETE (deactivate) | role-based |
| `/api/dashboard` | GET stats | any authenticated |
| `/api/health` | GET | public |

## Features

- JWT authentication with 30-day expiry, bcrypt password hashing
- Role-based access: manager full control, team restricted to own tasks
- Auto-generated IDs: `C-SEO-001…` clients, `TASK-0001…` tasks
- Activity logging on every create/update/delete/login
- Dashboard stats, team workload, overdue detection, upcoming tasks
- Search/filter everywhere, toasts, loading states, empty states
