# FINPROSE Supabase Setup

1. Buka Supabase Dashboard, buat project baru.
2. Buka SQL Editor.
3. Jalankan isi file `supabase/migrations/001_finprose_schema.sql`.
4. Buka Project Settings > API.
5. Copy Project URL ke `VITE_SUPABASE_URL`.
6. Copy anon/public key ke `VITE_SUPABASE_ANON_KEY`.
7. Simpan kedua nilai itu di file root `.env`.
8. Restart frontend Vite.

Auth yang dipakai aplikasi:
- Register: `supabase.auth.signUp`
- Login: `supabase.auth.signInWithPassword`
- Session refresh: `supabase.auth.getSession`
- Logout: `supabase.auth.signOut`

Catatan:
- Jika email confirmation aktif di Supabase, user harus verifikasi email sebelum bisa login.
- Untuk demo lokal yang lebih cepat, matikan dulu email confirmation di Authentication > Providers > Email.
- Database Supabase memakai RLS. Policy awal sudah disediakan agar user hanya mengakses data miliknya, advokat terverifikasi bisa dibaca, dan admin bisa mengelola data.
