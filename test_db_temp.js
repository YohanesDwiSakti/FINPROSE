import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key starts with:", supabaseKey ? supabaseKey.substring(0, 10) + "..." : "undefined");

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  async function testTable(table) {
    const { data, count, error } = await supabase.from(table).select('*', { count: 'exact' }).limit(3);
    if (error) {
      console.log(`Table/View '${table}' error:`, error);
    } else {
      console.log(`Table/View '${table}' - Count: ${count}, Row count in data: ${data.length}`);
      if (data.length > 0) {
        console.log(`Sample row from '${table}':`, data[0]);
      }
    }
  }

  await testTable('users');
  await testTable('profiles');
  await testTable('lawyers');
  await testTable('categories');
  await testTable('consultations');
  await testTable('transactions');
  await testTable('lawyer_directory');
  await testTable('app_consultations');
  await testTable('admin_clients');
}

checkDb();
