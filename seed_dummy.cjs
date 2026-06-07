const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
  console.log('Seeding dummy database...');

  const roles = [
    { type: 'toliver', count: 10, prefix: 'toliver' },
    { type: 'lawyer', count: 10, prefix: 'lawyer' },
    { type: 'admin', count: 2, prefix: 'admin' }
  ];

  for (const roleDef of roles) {
    for (let i = 1; i <= roleDef.count; i++) {
      const email = `${roleDef.prefix}${i}@example.com`;
      const password = 'password123';
      const name = `${roleDef.type.charAt(0).toUpperCase() + roleDef.type.slice(1)} ${i}`;

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: name,
          role: roleDef.type
        }
      });

      if (error) {
        if (!error.message.includes('User already registered')) {
            console.error(`Error creating ${email}:`, error.message);
        } else {
            console.log(`${email} already exists.`);
        }
      } else {
        console.log(`Created ${email}`);
        
        // If lawyer, add some dummy details directly using service role
        if (roleDef.type === 'lawyer' && data.user) {
           const specialties = ['Hukum Bisnis', 'Hukum Keluarga', 'Hukum Pidana', 'Hukum Perdata'];
           await supabase.from('lawyer_profiles').update({
             specialty: specialties[i % specialties.length],
             experience: 5 + (i % 5),
             rating: 4 + (i % 5) * 0.1,
             review_count: 10 + i * 2,
             price: 50000 + i * 10000,
             image: `/lawyer${(i % 3) + 1}.png`,
             description: `Saya adalah pengacara profesional berpengalaman dalam ${specialties[i % specialties.length]}.`
           }).eq('id', data.user.id);
        }
      }
    }
  }

  console.log('Seeding finished.');
}

seed().catch(console.error);
