# YDA LAW OFFICE & Partners — Multi-Agent Execution Plan

**Date:** 2026-06-06  
**Principle:** Preserve architecture and UI; extend, never rebuild.

---

## Repository Audit Summary

| Layer | Stack | Status |
|-------|-------|--------|
| Frontend | React 19 + Vite + Tailwind 4 + i18next | Preserved |
| Auth | Supabase Auth (`signUp`, `signInWithPassword`, RLS) | Preserved |
| Database | Supabase Postgres (22 migrations) | Preserved |
| API (production) | Vercel serverless `/api/*` | Preserved |
| API (local alt) | Go backend `backend/main.go` :5000 | Preserved |
| API (local dev) | `server.js` Express wrapper over `/api` handlers | **Added** |
| Payments | Midtrans Snap + `app_payments` | Extended |
| AI | Rusdi via `/api/rusdi/*` + Gemini 2.5 Flash | Validated |
| Routing | View-state SPA in `App.tsx` (no React Router) | Preserved |

### Database Tables (key)

- `profiles`, `users`, `lawyer_directory`, `lawyers`
- `app_consultations`, `app_payments`, `consultation_status_logs`
- `app_chat_sessions`, `app_messages`, `call_signals`
- `documents`, `reviews`, `support_tickets`
- `ai_conversations`, `ai_messages`, `knowledge_base`, `ai_embeddings`

### Critical Bug Fixed

**Symptom:** "Failed to Fetch" on payment method selection.

**Root cause:** Dev frontend defaulted to `http://localhost:5000/api` but no API process was bound; `package.json` referenced missing `server.js`.

**Fix:**

1. Added `server.js` mounting all Vercel `/api` handlers on port 5000.
2. Vite proxy `/api` → `localhost:5000` (same-origin `/api` in browser).
3. Unified `API_BASE` default to `/api` across frontend services.
4. Improved network error message when API server is offline.
5. Fixed `createConsultation` to insert `status: 'pending'` (was incorrectly `'paid'`, bypassing payment gate).
6. Added `/api/payments/confirm` to Go backend for parity with Vercel routes.

---

## Agent 1 — Architecture Preservation

| Task | Status |
|------|--------|
| Full repository audit | Done |
| Preserve Supabase + Vercel stack | Done |
| Local dev API server (`server.js`) | Done |
| Fix consultation create status | Done |
| Go backend payment confirm route | Done |
| RBAC via Supabase RLS + admin API | Existing |
| Payment workflow (Midtrans) | Existing + dev fix |
| Database migrations 001–022 | Existing |
| API documentation | Existing in `docs/api_documentation.md` |

---

## Agent 2 — Frontend & UI Integration

| Task | Status |
|------|--------|
| Preserve visual identity (colors, typography, layouts) | Verified |
| i18next: id, en, ja, zh | Existing |
| UI shows "Client"/"Klien" (internal role `Client` retained for DB) | Verified |
| Payment gate: consultation locked until paid | Fixed + verified in `App.tsx` |
| Dynamic dashboards (client, lawyer, admin) | Existing with Supabase + fallbacks |
| Payment page Midtrans integration | Existing |
| Responsive UI, loading/error states | Existing |

---

## Agent 3 — Rusdi AI, QA & Production

| Task | Status |
|------|--------|
| Rusdi open chat + memory | Validated |
| Conversation sidebar (create/rename/delete/archive/search) | Validated |
| RAG via `search_knowledge` RPC | Validated |
| File analysis PDF/DOCX/PNG/JPG/JPEG | Partial (Gemini inline) |
| Lawyer recommendations (specialty/experience/rating/availability) | Validated |
| Multilingual AI (`language` param) | Validated |
| TypeScript lint (`npm run lint`) | Pass |
| Payment E2E dev path | Fixed (requires `npm run server`) |
| QA report | Updated in `docs/QA_RUSDI_REPORT.md` |

---

## Local Development Workflow

```bash
# Terminal 1 — API server (required for payments, Rusdi API routes)
npm run server

# Terminal 2 — Frontend
npm run dev
```

Alternative: Go backend (`cd backend && go run main.go`) on port 5000.

Production: deploy to Vercel; `/api` routes run as serverless functions.

---

## Production Checklist

- [ ] Apply migration `022_ai_conversation_archive.sql` to production Supabase
- [ ] Set `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Midtrans keys in Vercel
- [ ] Leave `VITE_API_BASE_URL` empty (uses same-origin `/api`)
- [ ] Configure Midtrans webhook → `/api/payments/midtrans-notification`
- [ ] Run `npm run lint` and `npm run build` in CI

---

## Architectural Decisions Log

1. **Dual backend preserved:** Vercel `/api` (production) + Go (optional local) + `server.js` (local dev parity with Vercel).
2. **No UI redesign:** All changes are integration/fixes only.
3. **Internal role `Client` kept** for DB/API compatibility; UI displays "Client"/"Klien".
4. **Payment gate enforced** at `createConsultation` (`pending`) and `canAccessConsultationSession` in `App.tsx`.
5. **Same-origin `/api`** in dev and prod eliminates CORS fetch failures when proxy/server is running.
