# Gas POS System - Supabase Deployment Guide

## Prerequisites
- Supabase account (https://supabase.com)
- Python 3.11+
- Node.js 18+ (for frontend build)

---

## 1. Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Choose organization, enter project name (e.g., `gas-pos-system`)
4. Set database password (save this!)
5. Choose region closest to your users
6. Wait for project to be ready (~2 minutes)

---

## 2. Get Database Connection Details

1. In Supabase dashboard, go to **Settings** → **Database**
2. Copy the **Connection string** (URI format):
   ```
   postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
   ```
3. Also copy **Project URL** and **anon/public API key** from **Settings** → **API**

---

## 3. Backend Configuration

### 3.1 Create Environment File

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
# Database - Use the connection string from Supabase
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Security - Generate strong secrets
SECRET_KEY=your-super-secret-key-min-32-chars
JWT_SECRET_KEY=your-jwt-secret-key-min-32-chars

# Frontend URL (update after frontend deployment)
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Optional: Reserve stock on deposit
RESERVE_ON_DEPOSIT=true
```

### 3.2 Generate Secure Secrets

```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate JWT_SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3.3 Install Dependencies & Run Migrations

```bash
# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
flask db upgrade

# Seed initial data (admin user, shops, categories)
python seed.py --force
```

---

## 4. Frontend Configuration

### 4.1 Create Environment File

```bash
cd frontend
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_BASE_URL=https://your-backend-domain.onrender.com
```

### 4.2 Build Frontend

```bash
npm install
npm run build
```

The built files will be in `frontend/dist/`

---

## 5. Deploy Backend

### Option A: Render.com (Recommended)

1. Push code to GitHub
2. Go to https://dashboard.render.com
3. Click "New" → "Web Service"
4. Connect your GitHub repo
5. Configure:
   - **Build Command**: `cd backend && pip install -r requirements.txt`
   - **Start Command**: `cd backend && gunicorn --bind 0.0.0.0:$PORT app:app`
   - **Environment**: Python 3
6. Add environment variables from your `.env` file
7. Deploy

### Option B: Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Option C: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch
fly deploy
```

---

## 6. Deploy Frontend

### Option A: Vercel (Recommended)

1. Push code to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variable:
   - `VITE_API_BASE_URL` = your backend URL
6. Deploy

### Option B: Netlify

```bash
# Build locally
cd frontend && npm run build

# Deploy to Netlify
npx netlify deploy --prod --dir=dist
```

### Option C: Cloudflare Pages

1. Connect GitHub repo
2. Build command: `cd frontend && npm run build`
3. Output directory: `frontend/dist`

---

## 7. Configure CORS in Supabase (Optional)

If you need direct database access from frontend:

1. Go to Supabase Dashboard → **Settings** → **API**
2. Add your frontend domain to **CORS origins**

---

## 8. Run Migrations on Supabase

After deploying backend, run migrations:

```bash
# On your deployed backend server
flask db upgrade
python seed.py --force
```

Or run locally against Supabase:

```bash
# Set DATABASE_URL to Supabase
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
flask db upgrade
python seed.py --force
```

---

## 9. Verify Deployment

1. Check backend health: `https://your-backend.com/health`
2. Check frontend loads: `https://your-frontend.com`
3. Test login with seeded credentials:
   - Admin: `admin@gaspos.com` / `password123`
   - Manager: `manager@gaspos.com` / `manager123`

---

## 10. Production Checklist

- [ ] Change default passwords after first login
- [ ] Enable HTTPS (automatic on Vercel/Render)
- [ ] Set strong `SECRET_KEY` and `JWT_SECRET_KEY`
- [ ] Configure `FRONTEND_URL` correctly for CORS
- [ ] Set up Supabase backups (automatic on paid plans)
- [ ] Configure monitoring/alerts
- [ ] Set up custom domain if needed

---

## Troubleshooting

### Migration Errors
```bash
# Check migration status
flask db current

# If stuck, check alembic_version table in Supabase
# You may need to manually fix: DELETE FROM alembic_version;
# Then: flask db stamp head && flask db upgrade
```

### Connection Issues
- Ensure Supabase allows connections from your deployment IP
- Check firewall rules in Supabase dashboard
- Verify DATABASE_URL format (use `postgresql://` not `postgres://`)

### CORS Errors
- Verify `FRONTEND_URL` in backend `.env` matches your frontend domain exactly
- Check browser console for specific CORS error details

---

## Supabase-Specific Notes

1. **Connection Pooling**: Use Supabase's PgBouncer for production:
   ```
   postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:6543/postgres?pgbouncer=true
   ```

2. **Row Level Security**: Supabase enables RLS by default. The app manages auth at application level, so RLS policies aren't strictly needed but can be added for extra security.

3. **Realtime**: Not used in this app, but available if needed for live updates.

4. **Storage**: Receipts are stored in database as HTML. For PDF generation, consider Supabase Storage.

5. **Edge Functions**: Could be used for background jobs (reports, notifications) in the future.