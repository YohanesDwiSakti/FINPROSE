const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const EMAIL = 'rawlaw@gmail.com';
const PASSWORD = '12345678';

async function setupAccount() {
  console.log('=== Setting up account: ' + EMAIL + ' ===\n');

  // 1. Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email === EMAIL);

  let userId;

  if (existing) {
    console.log('User already exists:', existing.id);
    // Update password
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true
    });
    if (error) {
      console.error('Failed to update password:', error.message);
      return;
    }
    userId = existing.id;
    console.log('Password updated successfully.');
  } else {
    // Create new user
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'RAW Law User',
        role: 'toliver'
      }
    });
    if (error) {
      console.error('Failed to create user:', error.message);
      return;
    }
    userId = data.user.id;
    console.log('User created:', userId);
  }

  // 2. Upsert profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      full_name: 'RAW Law User',
      email: EMAIL
    }, { onConflict: 'id' });

  if (profileError) {
    console.error('Profile upsert error:', profileError.message);
  } else {
    console.log('Profile upserted successfully.');
  }

  // 3. Test login
  console.log('\nTesting login...');
  const loginSupabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  const { data: loginData, error: loginError } = await loginSupabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD
  });

  if (loginError) {
    console.error('Login test FAILED:', loginError.message);
  } else {
    console.log('Login test PASSED! User ID:', loginData.user.id);
  }

  console.log('\n=== Done ===');
  console.log('Email:    ' + EMAIL);
  console.log('Password: ' + PASSWORD);
}

setupAccount();
