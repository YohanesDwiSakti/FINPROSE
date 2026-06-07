# Installation Guide

## Prerequisites
- Node.js (v18 or higher)
- Go (v1.20 or higher)
- Supabase CLI (optional for local database testing)
- A Supabase Project (for cloud database)

## Step 1: Clone the Repository
```bash
git clone <repository_url>
cd YDA LAW OFFICE & Partners
```

## Step 2: Install Frontend Dependencies
```bash
npm install
```

## Step 3: Configure Environment Variables
Create a `.env` file in the root directory based on the `.env.example` structure:
```ini
VITE_SUPABASE_URL="https://your-supabase-url.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
MIDTRANS_SERVER_KEY="your-midtrans-server-key"
MIDTRANS_CLIENT_KEY="your-midtrans-client-key"
MIDTRANS_IS_PRODUCTION="false"
GEMINI_API_KEY="your-gemini-key"
```

## Step 4: Database Setup
Apply the database migrations to your Supabase project. You can do this via the Supabase Dashboard SQL Editor or using the CLI:
```bash
supabase link --project-ref your-project-ref
supabase db push
```

## Step 5: Start the Development Servers

**Option A — Node API server (matches Vercel routes):**
```bash
npm run server
```
The API runs on `http://localhost:5000/api`. Vite proxies `/api` automatically.

**Option B — Go backend:**
```bash
cd backend
go run main.go
```

**Run the Frontend:**
Open a new terminal in the root directory:
```bash
npm run dev
```
The frontend runs on `http://localhost:3000`.

> Payment, Rusdi chat API, and admin routes require the API server (Option A or B) to be running locally.
