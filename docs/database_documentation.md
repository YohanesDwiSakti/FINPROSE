# Database Documentation

## Architecture
YDA LAW OFFICE & Partners uses Supabase (PostgreSQL) as its primary relational database. Row Level Security (RLS) is strictly enforced across all tables to ensure data privacy.

## Core Tables

### 1. `profiles`
Stores extended user data. Created automatically via trigger when a Supabase Auth user is created.
- `id` (UUID, PK) - Maps to auth.users.id
- `full_name`, `email`, `phone`, `role` (Admin, Lawyer, Client)

### 2. `lawyer_directory` (View / Table mapping)
Stores lawyer-specific public data.
- `user_id` (UUID, PK, FK to profiles)
- `specialty`, `experience_years`, `consultation_price`
- `verification_status`

### 3. `consultations`
Tracks the lifecycle of a legal case between a Client and a Lawyer.
- `id` (UUID, PK)
- `client_id` (UUID, FK to profiles)
- `lawyer_id` (UUID, FK to lawyer_directory)
- `status` (pending, paid, ongoing, in_review, completed)
- `consultation_type`, `scheduled_day`, `scheduled_time`

### 4. `app_payments`
Tracks Midtrans payment transactions for consultations.
- `id` (UUID, PK)
- `consultation_id` (UUID, FK)
- `amount`, `platform_fee`, `total_amount`
- `status` (pending, paid, failed, refunded)

### 5. `reviews`
Client reviews for lawyers upon consultation completion.
- `id` (UUID, PK)
- `consultation_id` (UUID, FK)
- `rating` (1-5)
- `comment`

### 6. AI Subsystem (`ai_conversations`, `ai_messages`, `ai_file_uploads`)
Manages the memory and context for AI Rusdi.
- Stores chat histories linked to a specific Client.
- Stores vector references (if pgvector is enabled) for uploaded documents.

## Security (RLS)
- **Clients** can only read/write their own consultations, payments, and AI chats.
- **Lawyers** can only read/write consultations assigned to them.
- **Admins** bypass RLS policies or have explicit full access policies.
