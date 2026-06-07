const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'toliver1@example.com',
    password: 'password123'
  });

  if (error) {
    console.error('Login error:', error.message);
    return;
  }
  
  console.log('Login successful:', data.user.id);
  
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: data.user.id,
      full_name: 'Toliver 1',
      email: 'toliver1@example.com',
      role: 'toliver',
      status: 'active'
    }, { onConflict: 'id' });

  if (profileError) {
    console.error('Profile Upsert Error:', profileError);
  } else {
    console.log('Profile upsert successful');
  }
}

testLogin();
