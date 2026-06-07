/**
 * Skrip All-in-One: Buat tabel knowledge_base + Upload data CSV
 * Menggunakan Supabase REST API dengan service_role key
 * 
 * Jalankan: node setup_and_upload_knowledge.cjs
 */
const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("VITE_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ============================================================
// STEP 1: Create table via direct REST call to Supabase
// ============================================================
async function runSQL(sql) {
  // Supabase exposes a /rest/v1/rpc endpoint but we need to use
  // the pg-meta API or the SQL editor. Since we can't do DDL via 
  // PostgREST, we'll try using the Supabase Management API.
  // 
  // Alternative: Use the pg module to connect directly.
  
  const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL execution failed: ${response.status} - ${text}`);
  }
}

// ============================================================
// STEP 2: Upload CSV data
// ============================================================
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function uploadDaftarPengadilan(filePath) {
  console.log(`\n📂 Memproses: ${filePath}`);
  const rows = await readCSV(filePath);
  const records = rows.map(row => ({
    category: 'Daftar Pengadilan Indonesia',
    content: `Nama Pengadilan: ${row.nama_pengadilan || ''}\nPengadilan Tinggi: ${row.pengadilan_tinggi || ''}\nProvinsi: ${row.provinsi || ''}\nJumlah Putusan: ${row.jumlah_putusan || ''}`
  }));
  return records;
}

async function uploadViolenceReporting(filePath) {
  console.log(`\n📂 Memproses: ${filePath}`);
  const rows = await readCSV(filePath);
  const records = rows.map(row => {
    const services = [];
    if (row['Layanan Hukum'] === '1') services.push('Layanan Hukum');
    if (row['Layanan Medis'] === '1') services.push('Layanan Medis');
    if (row['Layanan Psikologis'] === '1') services.push('Layanan Psikologis');
    if (row['Rehabilitasi Sosial'] === '1') services.push('Rehabilitasi Sosial');
    if (row['Jaminan Keselamatan'] === '1') services.push('Jaminan Keselamatan');
    if (row['Layanan Pendidikan'] === '1') services.push('Layanan Pendidikan');
    if (row['Pengasuhan Pengganti'] === '1') services.push('Pengasuhan Pengganti');
    if (row['Bantuan Sosial'] === '1') services.push('Bantuan Sosial');

    return {
      category: 'Kasus Hukum - Kekerasan & Perlindungan',
      content: `Laporan Kasus: ${row.Text || ''}\nLayanan yang Dibutuhkan: ${services.join(', ') || 'Tidak ditentukan'}`
    };
  });
  return records;
}

async function uploadTindakPidana(filePath) {
  console.log(`\n📂 Memproses: ${filePath}`);
  const rows = await readCSV(filePath);
  const records = rows.map(row => ({
    category: 'Statistik Tindak Pidana Indonesia',
    content: `Kepolisian Daerah: ${row['Kepolisian Daerah'] || ''}\nJumlah Tindak Pidana 2021: ${row['Jumlah Tindak Pidana 2021'] || ''}\nJumlah Tindak Pidana 2022: ${row['Jumlah Tindak Pidana 2022'] || ''}\nPenyelesaian 2021: ${row['Penyelesaian tindak pidana 2021(%)'] || ''}%\nPenyelesaian 2022: ${row['Penyelesaian tindak pidana 2022(%)'] || ''}%`
  }));
  return records;
}

async function insertBatch(records) {
  const BATCH_SIZE = 100;
  let success = 0;
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('knowledge_base').insert(batch);
    
    if (error) {
      console.error(`  ❌ Gagal batch ${i + 1}-${i + batch.length}: ${error.message}`);
    } else {
      success += batch.length;
      console.log(`  ✅ Upload ${success}/${records.length}`);
    }
  }
  return success;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const basePath = 'F:\\FINPROSE\\data testing rawlaw\\data testing rawlaw';

  // Step 1: Check if table exists, if not ask user to create it
  console.log('🔍 Memeriksa apakah tabel knowledge_base sudah ada...');
  const { error: tableCheck } = await supabase.from('knowledge_base').select('id').limit(1);
  
  if (tableCheck && tableCheck.message.includes("Could not find the table")) {
    console.log('\n⚠️  Tabel knowledge_base BELUM ADA di database Supabase Anda.');
    console.log('📋 Silakan buka Supabase Dashboard > SQL Editor, lalu jalankan isi file:');
    console.log('   F:\\FINPROSE\\supabase\\migrations\\018_knowledge_base.sql');
    console.log('\nSetelah itu, jalankan skrip ini lagi.\n');
    process.exit(1);
  }

  console.log('✅ Tabel knowledge_base ditemukan!\n');

  // Step 2: Upload relevant CSVs
  let totalUploaded = 0;

  // 2a. Daftar Pengadilan
  try {
    const records = await uploadDaftarPengadilan(`${basePath}\\daftar_pengadilan.csv`);
    console.log(`  📊 ${records.length} baris ditemukan`);
    totalUploaded += await insertBatch(records);
  } catch (e) {
    console.error('  ❌ Error:', e.message);
  }

  // 2b. Kasus Kekerasan & Perlindungan Hukum
  try {
    const records = await uploadViolenceReporting(`${basePath}\\indonesia-violence-reporting-text.csv`);
    console.log(`  📊 ${records.length} baris ditemukan`);
    totalUploaded += await insertBatch(records);
  } catch (e) {
    console.error('  ❌ Error:', e.message);
  }

  // 2c. Statistik Tindak Pidana
  try {
    const records = await uploadTindakPidana(`${basePath}\\Presentase Penyelesaian Tindak Pidana di Indonesia tahun 2021-2022.csv`);
    console.log(`  📊 ${records.length} baris ditemukan`);
    totalUploaded += await insertBatch(records);
  } catch (e) {
    console.error('  ❌ Error:', e.message);
  }

  console.log(`\n🎉 Selesai! Total ${totalUploaded} data berhasil diunggah ke knowledge_base.`);
  console.log('Rusdi AI sekarang bisa menjawab pertanyaan berdasarkan data ini.\n');
}

main().catch(console.error);
