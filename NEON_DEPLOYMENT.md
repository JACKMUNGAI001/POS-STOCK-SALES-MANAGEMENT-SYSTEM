# Neon Deployment Guide

Neon provides the PostgreSQL database. The included `render.yaml` deploys the Flask API and frontend on Render; the frontend can also be hosted separately.

## 1. Create a Neon database

1. Create a project in the [Neon Console](https://console.neon.tech/).
2. Choose a region near your application host.
3. Open **Connect** and copy the connection string for the database and branch you want to use. Keep the `sslmode=require` setting in the URL.

The URL has this form:

```text
postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

Treat the connection string as a secret. Use a Neon branch dedicated to production, and do not use `python seed.py --force` on a database containing data because that option clears existing records.

## 2. Deploy the application on Render

1. Push this repository to GitHub and create a Render Blueprint from the repository, or create the backend and frontend services using the commands in `render.yaml`.
2. Set the backend `DATABASE_URL` environment variable to the Neon connection string.
3. Set `SECRET_KEY` and `JWT_SECRET_KEY` to long, randomly generated values. Set `FRONTEND_URL` to the deployed frontend's origin.
4. Set the frontend `VITE_API_BASE_URL` to the deployed backend's base URL.
5. Deploy both services.

The app already supports PostgreSQL URLs and requires SSL for PostgreSQL connections. Locally, copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` to the same format.

## 3. Initialize the database

After the backend is deployed, open its Render Shell and run:

```bash
cd backend
flask db upgrade
python seed.py
```

`flask db upgrade` creates or upgrades the schema. `python seed.py` adds the initial admin user, shop, and categories to an empty database, and skips seeding when it detects existing initial data. Change the default seeded passwords immediately after first login.

## 4. Verify the deployment

Open `https://YOUR-BACKEND-URL/health`; it should return:

```json
{"status":"ok"}
```

Then open the frontend URL and confirm that it can sign in and load data from the API.