/**
 * Run SQL migration via direct PostgreSQL connection using pg module.
 * Connects to Supabase database directly using the pooler connection.
 */
const { Client } = require('pg');
require('dotenv').config();
const fs = require('fs');

const projectRef = 'rvsievmsfqynoesdlfym';

// Supabase exposes a Postgres connection via:
// Host: db.<project-ref>.supabase.co
// Port: 5432
// Database: postgres
// User: postgres
// Password: (your database password - set during project creation)

// We need to get the DB password from the user or .env
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!dbPassword) {
  console.log('');
  console.log('⚠️  Anda perlu menambahkan password database Supabase ke file .env');
  console.log('');
  console.log('Caranya:');
  console.log('1. Buka Supabase Dashboard > Settings > Database');
  console.log('2. Di bagian "Connection string", klik "URI" dan salin password-nya');
  console.log('3. Tambahkan baris berikut ke file .env Anda:');
  console.log('   SUPABASE_DB_PASSWORD="password_anda_disini"');
  console.log('');
  console.log('4. Jalankan skrip ini lagi: node run_migration.cjs');
  console.log('');
  console.log('ATAU alternatif yang lebih mudah:');
  console.log('1. Buka https://supabase.com/dashboard/project/rvsievmsfqynoesdlfym/sql/new');
  console.log('2. Copy-paste isi file: supabase\\migrations\\018_knowledge_base.sql');
  console.log('3. Klik "Run"');
  console.log('');
  process.exit(1);
}

async function main() {
  const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
  
  const client = new Client({ connectionString });
  
  try {
    console.log('🔌 Menghubungkan ke database Supabase...');
    await client.connect();
    console.log('✅ Terhubung!\n');

    const sql = fs.readFileSync('supabase/migrations/018_knowledge_base.sql', 'utf8');
    
    console.log('🚀 Menjalankan migrasi 018_knowledge_base.sql...');
    await client.query(sql);
    console.log('✅ Migrasi berhasil! Tabel knowledge_base telah dibuat.\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
