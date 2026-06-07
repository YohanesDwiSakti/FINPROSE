const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("VITE_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env");
  process.exit(1);
}

const supabase = createClient(url, key);

const filePath = process.argv[2];

if (!filePath) {
  console.error("Harap masukkan nama file CSV. Contoh: node upload_csv.cjs data_hukum_perdata.csv");
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File ${filePath} tidak ditemukan.`);
  process.exit(1);
}

const results = [];

console.log(`Membaca file ${filePath}...`);

fs.createReadStream(filePath)
  .pipe(csv())
  .on('data', (data) => {
    // Gabungkan semua kolom menjadi satu teks yang rapi agar AI mudah membacanya
    let contentParts = [];
    let category = 'Hukum Perdata'; // Default

    for (const [key, value] of Object.entries(data)) {
      if (!value) continue;
      
      const keyUpper = key.trim().toUpperCase();
      if (keyUpper === 'KATEGORI' || keyUpper === 'CATEGORY' || keyUpper === 'BAB') {
        category = value.trim();
      }

      contentParts.push(`${key.trim()}: ${value.trim()}`);
    }

    const content = contentParts.join('\n');
    
    if (content) {
      results.push({
        category,
        content
      });
    }
  })
  .on('end', async () => {
    console.log(`Berhasil membaca ${results.length} baris dari CSV.`);
    
    if (results.length === 0) {
      console.log("Tidak ada data yang diproses.");
      return;
    }

    console.log("Mengunggah data ke tabel knowledge_base di Supabase...");
    
    // Upload in batches of 100 to avoid request size limits
    const BATCH_SIZE = 100;
    let successCount = 0;
    
    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('knowledge_base')
        .insert(batch);
        
      if (error) {
        console.error(`Gagal mengunggah baris ${i + 1} hingga ${i + batch.length}:`, error.message);
        // Lanjut ke batch berikutnya
      } else {
        successCount += batch.length;
        console.log(`Telah mengunggah ${successCount} dari ${results.length} baris...`);
      }
    }

    console.log(`Proses selesai! Berhasil mengunggah ${successCount} baris data hukum perdata.`);
  });
