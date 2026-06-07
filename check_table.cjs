const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTable() {
  const { data, error } = await supabase
    .from('ai_chat_history')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Table exists!');
  }
}

checkTable();
