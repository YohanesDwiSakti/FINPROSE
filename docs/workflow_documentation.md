# Workflow Documentation

## 1. User Registration Workflow
1. User submits registration form on the frontend.
2. Frontend calls Go backend `/api/register`.
3. Go backend securely creates the user in Supabase Auth using the `SUPABASE_SERVICE_ROLE_KEY`.
4. A database trigger (`on_auth_user_created`) automatically creates an entry in the `profiles` table.
5. If the user is a `lawyer`, they are placed in a `pending` verification state.

## 2. Lawyer Verification Workflow
1. Lawyer registers and completes their profile details.
2. Admin logs into the Admin Dashboard and navigates to the "Lawyers" tab.
3. Admin clicks "Verify". The frontend calls `/api/admin` with `action: verify_lawyer`.
4. Go backend updates `verification_status` to `verified` and `status` to `active`.
5. The lawyer now appears in the public directory and can accept consultations.

## 3. Consultation Booking & Payment Workflow
1. Client (Client) selects a Lawyer and a timeslot, then clicks "Book".
2. Frontend inserts a new `consultations` record in Supabase with status `pending`.
3. Client proceeds to payment. Frontend calls `/api/payments`.
4. Go backend generates a Midtrans Snap Token and returns it.
5. Frontend redirects Client to the Midtrans payment gateway.
6. Upon successful payment, Midtrans sends a webhook to `/api/payments/midtrans-notification`.
7. Go backend verifies the signature and updates the payment and consultation status to `paid`.

## 4. Real-time Consultation Workflow
1. At the scheduled time, Client and Lawyer enter the `MeetingPage` or `ChatPage`.
2. WebRTC call signaling is handled securely via the `call_signaling` table in Supabase.
3. Messages and file uploads are stored in `messages` and `consultation_documents`.
4. Upon completion, the lawyer marks the consultation as `completed`.
5. Client is prompted to leave a review.

## 5. AI Rusdi Integration
1. Client accesses the Rusdi Widget.
2. If Client uploads a document, it is saved to Supabase Storage, and the reference is passed to `/api/rusdi/case-analysis`.
3. The Go backend fetches the document, extracts text, and passes it to the Gemini API using RAG logic.
4. Gemini returns legal analysis and recommends specific lawyer specializations based on the issue.
