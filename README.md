# Gas POS System - Stock & Sales Management

A modern, mobile-first Point of Sale system for gas cylinder businesses. Built with React, Flask, and PostgreSQL (Supabase).

## Features

- **Fast POS Interface** - Optimized for mobile and desktop
- **Multi-shop Management** - Track inventory across locations
- **Gas Cylinder Tracking** - Empty cylinder returns and deposits
- **Real-time Stock Updates** - FIFO batch-based inventory
- **Sales Analytics** - Daily, weekly, monthly, yearly reports
- **Credit Sales (Baadaye)** - Customer credit management
- **Supplier Management** - Purchase orders and invoices
- **Role-based Access** - Admin, Manager, Attendant roles
- **Dark Mode** - Easy on the eyes
- **Offline-capable** - Service worker ready

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Backend | Flask, SQLAlchemy, Flask-JWT-Extended |
| Database | PostgreSQL (Supabase) |
| Auth | JWT with HttpOnly cookies |
| Deployment | Vercel (Frontend), Render/Railway (Backend) |

## Quick Start (Local Development)

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings (use sqlite:///dev.db for local)
flask db upgrade
python seed.py --force
flask run
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with VITE_API_BASE_URL=http://127.0.0.1:5000
npm run dev
```

Visit `http://localhost:5173` - Login with:
- **Admin**: `admin@gaspos.com` / `password123`
- **Manager**: `manager@gaspos.com` / `manager123`

## Supabase Deployment

See [SUPABASE_DEPLOYMENT.md](SUPABASE_DEPLOYMENT.md) for complete deployment guide.

### Quick Deploy Steps

1. **Create Supabase Project** → Get connection string
2. **Deploy Backend** (Render/Railway/Fly.io):
   - Set `DATABASE_URL` to Supabase connection string
   - Set `SECRET_KEY`, `JWT_SECRET_KEY`, `FRONTEND_URL`
   - Run `flask db upgrade` and `python seed.py --force`
3. **Deploy Frontend** (Vercel/Netlify):
   - Set `VITE_API_BASE_URL` to your backend URL
4. **Configure CORS** - Ensure `FRONTEND_URL` matches your frontend domain

## Project Structure

```
├── backend/
│   ├── app.py                 # Flask app factory
│   ├── config.py              # Configuration
│   ├── seed.py                # Database seeding
│   ├── extensions.py          # Flask extensions
│   ├── models/                # SQLAlchemy models
│   ├── routes/                # API routes
│   ├── controllers/           # Request handlers
│   ├── services/              # Business logic
│   ├── utils/                 # Helpers
│   └── migrations/            # Alembic migrations
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── context/           # React context providers
│   │   ├── hooks/             # Custom hooks
│   │   ├── api/               # API client
│   │   └── utils/             # Helpers
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.cjs
│
└── SUPABASE_DEPLOYMENT.md     # Deployment guide
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Sales
- `POST /sales` - Create sale
- `GET /sales/all` - All sales (admin)
- `GET /sales/today` - Today's sales
- `GET /sales/week` - This week's sales
- `GET /sales/month` - This month's sales
- `GET /sales/year` - This year's sales

### Inventory
- `GET /items` - List all items
- `POST /items` - Create item (admin)
- `GET /items/categories` - List categories
- `POST /items/categories` - Create category (admin)

### Stock
- `GET /stocks/shop/<id>` - Shop inventory
- `POST /stocks/restock` - Add stock
- `POST /transfers` - Transfer between shops

### Deposits
- `POST /deposits` - Create deposit
- `POST /deposits/<id>/payments` - Add payment
- `GET /deposits/active` - Active deposits

### Reports
- `GET /reports/product-analysis` - Product performance
- `GET /reports/credits-summary` - Credit sales summary
- `GET /reports/pnl` - Profit & Loss

## Default Categories (from seed)

- Gas Cylinders
- Gas Accessories

## License

MIT