/**
 * Seeds FINPROSE Supabase with the full demo platform dataset.
 *
 * Usage:
 *   npm run seed
 *
 * Requires .env:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const CATEGORY_DEFS = [
  ['Criminal Lawyer', 'Defense and prosecution support for criminal cases.'],
  ['Civil Lawyer', 'Contract disputes, tort claims, and civil litigation.'],
  ['Family Lawyer', 'Divorce, custody, and family mediation.'],
  ['Labor Lawyer', 'Employment disputes and labor compliance.'],
  ['Tax Lawyer', 'Tax audits, appeals, and planning.'],
  ['Corporate Lawyer', 'Company formation, M&A, and commercial contracts.'],
  ['Cyber Crime Lawyer', 'Online defamation, ITE violations, and digital fraud.'],
  ['Intellectual Property Lawyer', 'Trademark, copyright, and IP enforcement.'],
  ['Land Dispute Lawyer', 'Land ownership conflicts and property disputes.'],
  ['Immigration Lawyer', 'Visas, residence permits, and citizenship matters.']
];

function uuid(prefix, index) {
  return `${prefix}-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

async function upsertBatch(table, rows, onConflict) {
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const query = supabase.from(table).upsert(chunk, { onConflict });
    const { error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function main() {
  console.log('Seeding FINPROSE platform data...');

  const categories = CATEGORY_DEFS.map(([name, description], index) => ({
    id: uuid('c0000000-0000-4c00-8000', index + 1),
    name,
    description,
    icon_url: `/icons/cat-${index + 1}.svg`
  }));

  await upsertBatch('categories', categories, 'name');

  const users = [];
  const profiles = [];
  const lawyers = [];
  const specializations = [];
  const availability = [];
  let lawyerIndex = 0;

  const seedScriptCategories = 12; // 12 lawyers x 10 categories = 120 lawyers
  categories.forEach((category, catIndex) => {
    const count = seedScriptCategories;
    for (let i = 0; i < count; i += 1) {
      lawyerIndex += 1;
      const id = lawyerIndex === 1 ? 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' : uuid('10000000-0000-4000-8000', lawyerIndex);
      const email = `lawyer.${lawyerIndex}@lawyer.finpro.id`;
      users.push({ id, email, role: 'lawyer', status: 'active' });
      profiles.push({
        id,
        full_name: `Advokat Demo ${lawyerIndex}, S.H.`,
        email,
        phone: `0813${String(10000000 + lawyerIndex)}`,
        avatar_url: `/avatars/lawyer-${(lawyerIndex % 8) + 1}.png`,
        bio: `Spesialis ${category.name}.`,
        address: `Kantor ${lawyerIndex}, Jakarta`,
        role: 'lawyer',
        status: 'active',
        gender: lawyerIndex % 2 === 0 ? 'female' : 'male',
        membership_status: 'active'
      });
      lawyers.push({
        id,
        bio: `Pengacara berpengalaman di bidang ${category.name}.`,
        experience_years: 2 + (lawyerIndex % 24),
        consultation_fee: 150000 + (lawyerIndex % 10) * 450000,
        rating: Number((4.1 + (lawyerIndex % 9) * 0.1).toFixed(1)),
        review_count: 5 + (lawyerIndex % 30),
        is_online: lawyerIndex % 3 !== 0,
        verification_status: 'verified',
        gender: lawyerIndex % 2 === 0 ? 'female' : 'male',
        law_firm: 'FinPro Legal Partners',
        office_location: 'Jakarta, Indonesia',
        languages: ['Bahasa Indonesia', 'English'],
        education: ['S1 Hukum Universitas Indonesia'],
        certifications: ['Izin Praktik PERADI'],
        success_rate: 82 + (lawyerIndex % 18),
        consultation_count: 5 + (lawyerIndex % 25),
        supports_online: true,
        supports_offline: lawyerIndex % 4 !== 0
      });
      specializations.push({ lawyer_id: id, category_id: category.id });
      availability.push(
        { lawyer_id: id, day: 'Senin', start_time: '09:00:00', end_time: '12:00:00' },
        { lawyer_id: id, day: 'Rabu', start_time: '13:00:00', end_time: '16:00:00' }
      );
    }
  });

  for (let i = 1; i <= 200; i += 1) {
    const id = i === 1 ? 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' : uuid('20000000-0000-4000-8000', i);
    const email = `client.${i}@client.finpro.id`;
    users.push({ id, email, role: 'toliver', status: 'active' });
    profiles.push({
      id,
      full_name: `Klien Demo ${i}`,
      email,
      phone: `0812${String(10000000 + i)}`,
      avatar_url: `/avatars/toliver-${(i % 6) + 1}.png`,
      bio: 'Klien FINPROSE',
      address: `Jl. Demo No. ${i}, Jakarta`,
      role: 'toliver',
      status: 'active',
      gender: i % 2 === 0 ? 'female' : 'male',
      membership_status: i % 5 === 0 ? 'premium' : 'active'
    });
  }

  users.push({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', email: 'demo.admin@finpro.id', role: 'admin', status: 'active' });
  profiles.push({
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    full_name: 'Admin FINPROSE',
    email: 'demo.admin@finpro.id',
    role: 'admin',
    status: 'active',
    membership_status: 'active'
  });

  await upsertBatch('users', users, 'id');
  await upsertBatch('profiles', profiles, 'id');
  await upsertBatch('lawyers', lawyers, 'id');
  await upsertBatch('lawyer_specializations', specializations, 'lawyer_id,category_id');
  await upsertBatch('lawyer_availability', availability, 'id');

  const lawyerIds = lawyers.map(l => l.id);
  const clientIds = users.filter(u => u.role === 'toliver').map(u => u.id);
  const consultations = [];
  const transactions = [];
  const reviews = [];

  for (let i = 1; i <= 150; i += 1) {
    const id = uuid('30000000-0000-4000-8000', i);
    const clientId = clientIds[i % clientIds.length];
    const lawyerId = lawyerIds[i % lawyerIds.length];
    const lawyer = lawyers.find(l => l.id === lawyerId);
    const status = ['pending', 'paid', 'ongoing', 'completed', 'completed', 'cancelled'][i % 6];
    consultations.push({
      id,
      toliver_id: clientId,
      lawyer_id: lawyerId,
      category_id: categories[i % categories.length].id,
      consultation_type: ['chat', 'video', 'voice'][i % 3],
      meeting_mode: i % 4 === 0 ? 'in_person' : 'virtual',
      scheduled_date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
      scheduled_time: `${9 + (i % 8)}:00:00`,
      duration_minutes: 60,
      status,
      price: lawyer.consultation_fee,
      issue_title: `Konsultasi Hukum #${i}`,
      notes: `Notulen konsultasi demo #${i}`
    });

    const tax = Math.round(lawyer.consultation_fee * 0.11);
    const platformFee = Math.round(lawyer.consultation_fee * 0.1);
    transactions.push({
      id: uuid('50000000-0000-4000-8000', i),
      consultation_id: id,
      toliver_id: clientId,
      amount: lawyer.consultation_fee,
      admin_fee: 5000,
      tax_amount: tax,
      platform_fee: platformFee,
      total_amount: lawyer.consultation_fee + tax + platformFee + 5000,
      method: ['bank_transfer', 'qris', 'credit_card', 'ewallet'][i % 4],
      provider: 'Midtrans',
      status: status === 'completed' ? 'paid' : status === 'cancelled' ? 'failed' : status === 'pending' ? 'pending' : 'paid',
      invoice_number: `INV-FP-${String(i).padStart(5, '0')}`,
      payment_proof_url: `/proofs/payment-${(i % 6) + 1}.png`,
      paid_at: status === 'completed' ? new Date().toISOString() : null
    });
  }

  for (let i = 1; i <= 200; i += 1) {
    const consultation = consultations[i % consultations.length];
    reviews.push({
      id: uuid('40000000-0000-4000-8000', i),
      consultation_id: consultation.id,
      toliver_id: consultation.toliver_id,
      lawyer_id: consultation.lawyer_id,
      rating: i % 5 === 0 ? 4 : 5,
      comment: 'Pengalaman konsultasi sangat membantu dan profesional.'
    });
  }

  await upsertBatch('consultations', consultations, 'id');
  await upsertBatch('transactions', transactions, 'id');
  await upsertBatch('reviews', reviews, 'id');

  console.log(`Seeded ${categories.length} categories, ${lawyers.length} lawyers, ${clientIds.length} clients, ${consultations.length} consultations, ${transactions.length} transactions, ${reviews.length} reviews.`);
  console.log('Demo accounts (create auth users separately if needed):');
  console.log('  client: demo.client@finpro.id / client id aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  console.log('  lawyer: demo.lawyer@finpro.id / lawyer id bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  console.log('  admin:  demo.admin@finpro.id / admin id cccccccc-cccc-4ccc-8ccc-cccccccccccc');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
