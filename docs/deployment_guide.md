# Deployment Guide

## Overview
Deploying YDA LAW OFFICE & Partners requires hosting the React/Vite frontend (e.g., Vercel, Netlify) and the Go backend (e.g., Railway, Render, AWS).

## 1. Database (Supabase)
1. Ensure all migrations are applied to your production Supabase instance.
2. Verify that Authentication providers (Email/Password, Google) are configured.
3. Ensure RLS policies are enabled and secure.

## 2. Frontend Deployment (Vercel)
1. Push your repository to GitHub.
2. Go to Vercel and import the project.
3. Set the Framework Preset to `Vite`.
4. Add the following Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL` (Set this to your deployed Go backend URL)
5. Click **Deploy**.

## 3. Backend Deployment (Railway)
1. Connect your GitHub repository to Railway.
2. Select the `backend` folder as the root directory (or use a Dockerfile in the root).
3. Add the following Environment Variables:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `MIDTRANS_SERVER_KEY`
   - `MIDTRANS_IS_PRODUCTION` (Set to "true")
   - `GEMINI_API_KEY`
4. Set the Start Command to `go run main.go` (or compile it via `go build -o server main.go && ./server`).
5. Expose port `5000` to the internet.

## 4. Post-Deployment Checks
- Register a test user.
- Verify that the Midtrans webhook URL points to your public Backend URL (`https://your-backend-url.railway.app/api/payments/midtrans-notification`).
- Test the AI Rusdi features to ensure the Gemini API is correctly integrated.
