const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seedOriginalDummies() {
  const users = [
    { email: 'client@email.com', role: 'client', name: 'Client Dummy' },
    { email: 'user@email.com', role: 'client', name: 'User Dummy' },
    { email: 'dummy@email.com', role: 'client', name: 'Dummy Dummy' },
    { email: 'lawyer@email.com', role: 'lawyer', name: 'Lawyer Dummy' },
    { email: 'admin@email.com', role: 'admin', name: 'Admin Dummy' }
  ];

  for (const u of users) {
    const { data: { users: authUsers }, error: authListError } = await supabase.auth.admin.listUsers();
    let authUser = authUsers.find(x => x.email === u.email);

    if (!authUser) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: 'password',
        email_confirm: true,
        user_metadata: {
          name: u.name,
          role: u.role
        }
      });
      if (error) {
        console.log('Error creating auth user', u.email, error.message);
        continue;
      }
      authUser = data.user;
    }

    if (authUser) {
      // Upsert into profiles using service role key (bypasses RLS)
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authUser.id,
        full_name: u.name,
        email: u.email,
        role: u.role,
        status: 'active'
      }, { onConflict: 'id' });

      if (profileError) {
        console.log('Error creating profile for', u.email, profileError.message);
      } else {
        console.log('Profile created/updated for', u.email);
      }

      if (u.role === 'lawyer') {
         await supabase.from('lawyer_profiles').upsert({
            user_id: authUser.id,
            specialty: 'Hukum Bisnis',
            description: 'Advokat FINPROSE',
            experience_years: 5,
            consultation_price: 150000,
            verification_status: 'verified'
         }, { onConflict: 'user_id' });
         
         await supabase.from('lawyer_directory').upsert({
            id: authUser.id,
            name: u.name,
            specialty: 'Hukum Bisnis',
            description: 'Advokat FINPROSE',
            experience_years: 5,
            consultation_price: 150000,
            image: '/lawyer1.png',
            verification_status: 'verified',
            languages: ['Bahasa Indonesia'],
            education: [],
            certifications: []
         }, { onConflict: 'id' });
      }
    }
  }
}

seedOriginalDummies().catch(console.error);
