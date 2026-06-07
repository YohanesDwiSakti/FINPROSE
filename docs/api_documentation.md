# API Documentation

## Overview
The YDA LAW OFFICE & Partners platform uses a hybrid API architecture:
1. **Supabase REST API / PostgREST**: Direct CRUD from the frontend (consultations, documents, profiles) with RLS.
2. **Vercel Serverless `/api/*`** (production): Payments, Rusdi AI, admin, chat, calls, reviews.
3. **`server.js` Express** (local dev): Mirrors all Vercel handlers on port 5000; proxied by Vite `/api`.
4. **Go Backend** (optional local): Partial parity on port 5000.

## API Endpoints
Base URL: `/api` (same-origin in prod; `http://localhost:5000/api` in dev)

### 1. Authentication & Registration
- **`POST /api/register`**
  - **Description**: Registers a new user with Supabase Auth and creates their profile securely.
  - **Body**: `{ "fullName": "string", "email": "string", "password": "string", "role": "string" }`

### 2. Payments & Transactions (Manual Verification)
- **`GET /api/payments`**
  - **Description**: Lists active payment method configs (bank transfer, e-wallet, QRIS).

- **`POST /api/payments`**
  - **Actions**: `create-invoice`, `select-method`, `get-invoice`, `upload-proof`
  - **Description**: Manual payment workflow with auto-verification on proof upload.
  - **Body (create-invoice)**: `{ "action": "create-invoice", "consultationId": "uuid", "amount": int }`
  - **Body (upload-proof)**: `{ "action": "upload-proof", "paymentId": "uuid", "fileName": "string", "mimeType": "string", "fileBase64": "string" }`

- **`PATCH /api/payments/verify`**
  - **Description**: Lawyer/admin manual approve or reject payment.
  - **Body**: `{ "paymentId": "uuid", "decision": "approve|reject|override_approve|override_reject" }`

### 3. Consultations & Cases
- **`POST /api/consultations/status`**
  - **Description**: Securely updates the status of a consultation.
  - **Body**: `{ "consultationId": "uuid", "actorId": "uuid", "status": "string", "note": "string" }`

- **`GET /api/lawyer/consultations?lawyerId={uuid}`**
  - **Description**: Retrieves consultations assigned to a specific lawyer.

### 4. Admin Operations
- **`POST /api/admin`**
  - **Description**: Performs administrative tasks like verifying lawyers or answering support tickets.
  - **Body**: `{ "action": "verify_lawyer|reject_lawyer|ticket_reply", ... }`

### 5. AI Assistant "Rusdi"
- **`POST /api/rusdi/chat`**
  - **Description**: General AI chat using conversation memory.
  - **Body**: `{ "conversationId": "uuid", "message": "string" }`
  
- **`POST /api/rusdi/case-analysis`**
  - **Description**: Analyzes uploaded case documents using RAG.
  
- **`POST /api/rusdi/lawyer-recommendation`**
  - **Description**: Recommends lawyers based on case context.
