import { Lawyer } from '../types';

export type PlatformCategory = {
  id: string;
  name: string;
  description: string;
  lawyerCount: number;
  consultationCount: number;
};

export type PlatformClient = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  gender: 'male' | 'female';
  membershipStatus: string;
  avatarUrl: string;
  registeredAt: string;
  consultationIds: string[];
  transactionIds: string[];
};

export type PlatformConsultation = {
  id: string;
  clientId: string;
  lawyerId: string;
  categoryId: string;
  categoryName: string;
  issueTitle: string;
  issueDescription: string;
  notes: string;
  status: 'pending' | 'paid' | 'ongoing' | 'in_review' | 'completed' | 'cancelled' | 'expired';
  consultationType: 'chat' | 'video' | 'voice' | 'document_review';
  meetingMode: 'virtual' | 'in_person';
  scheduledDate: string;
  scheduledTime: string;
  price: number;
  createdAt: string;
  clientName: string;
  lawyerName: string;
  lawyerSpecialty: string;
  lawyerImage: string;
};

export type PlatformReview = {
  id: string;
  consultationId: string;
  clientId: string;
  lawyerId: string;
  clientName: string;
  lawyerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  categoryName: string;
};

export type PlatformTransaction = {
  id: string;
  consultationId: string;
  clientId: string;
  lawyerId: string;
  clientName: string;
  lawyerName: string;
  invoiceNumber: string;
  amount: number;
  taxAmount: number;
  platformFee: number;
  adminFee: number;
  totalAmount: number;
  netRevenue: number;
  method: 'bank_transfer' | 'qris' | 'credit_card' | 'debit_card' | 'ewallet';
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'expired';
  paymentProofUrl: string;
  receiptUrl: string;
  lawyerEarnings: number;
  createdAt: string;
  paidAt: string | null;
};

export type PlatformFile = {
  id: string;
  originalName: string;
  storedName: string;
  extension: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  publicUrl: string;
  uploadedBy: string;
  entityType: 'consultation' | 'transaction' | 'lawyer' | 'client' | 'ai' | 'profile';
  entityId: string;
  status: 'active' | 'archived';
  checksum: string;
  extractedText?: string;
  createdAt: string;
};

export type PlatformFavorite = {
  clientId: string;
  lawyerId: string;
  createdAt: string;
};

export type PlatformNotification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'success';
  createdAt: string;
  isRead: boolean;
};

export type PlatformAnalytics = {
  monthlyRevenue: Array<{ month: string; revenue: number; consultations: number }>;
  consultationGrowth: Array<{ month: string; count: number }>;
  categoryPopularity: Array<{ category: string; count: number }>;
  consultationStatusDistribution: Array<{ status: string; count: number }>;
  transactionStatusDistribution: Array<{ status: string; count: number }>;
  topLawyers: Array<{ name: string; consultations: number; revenue: number; rating: number }>;
  topClients: Array<{ name: string; consultations: number; spent: number }>;
  aiUsage: { conversations: number; messages: number; fileUploads: number; analyses: number };
};

export type PlatformDataset = {
  categories: PlatformCategory[];
  lawyers: Lawyer[];
  lawyerRecords: Array<Lawyer & {
    id: string;
    gender: string;
    age: number;
    lawFirm: string;
    officeLocation: string;
    successRate: number;
    consultationCount: number;
    supportsOnline: boolean;
    supportsOffline: boolean;
    categoryIds: string[];
  }>;
  clients: PlatformClient[];
  consultations: PlatformConsultation[];
  reviews: PlatformReview[];
  transactions: PlatformTransaction[];
  notifications: PlatformNotification[];
  files: PlatformFile[];
  favorites: PlatformFavorite[];
  analytics: PlatformAnalytics;
  demoAccounts: {
    clientId: string;
    lawyerId: string;
    adminId: string;
    clientEmail: string;
    lawyerEmail: string;
    adminEmail: string;
  };
};

const DEMO_CLIENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEMO_LAWYER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DEMO_ADMIN_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uuidFromIndex(prefix: string, index: number) {
  const hex = index.toString(16).padStart(12, '0');
  return `${prefix}-0000-4000-8000-${hex}`;
}

function pick<T>(rand: () => number, items: T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function pickN<T>(rand: () => number, items: T[], count: number): T[] {
  const copy = [...items];
  const result: T[] = [];
  while (result.length < count && copy.length) {
    const idx = Math.floor(rand() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function isoDaysAgo(days: number, hour = 10, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function dateOnly(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

const CATEGORY_DEFS = [
  { name: 'Criminal Lawyer', description: 'Defense and prosecution support for criminal cases, fraud, assault, and narcotics matters.' },
  { name: 'Civil Lawyer', description: 'Contract disputes, tort claims, debt recovery, and general civil litigation.' },
  { name: 'Family Lawyer', description: 'Divorce, child custody, marital agreements, and family mediation.' },
  { name: 'Labor Lawyer', description: 'Employment termination, severance, workplace disputes, and labor compliance.' },
  { name: 'Tax Lawyer', description: 'Tax audits, appeals, restitution, and corporate tax planning.' },
  { name: 'Corporate Lawyer', description: 'Company formation, M&A, commercial contracts, and governance.' },
  { name: 'Cyber Crime Lawyer', description: 'Online defamation, ITE violations, data breaches, and digital fraud.' },
  { name: 'Intellectual Property Lawyer', description: 'Trademark, copyright, patent registration, and IP enforcement.' },
  { name: 'Land Dispute Lawyer', description: 'Land ownership conflicts, certificates, leasing, and property disputes.' },
  { name: 'Immigration Lawyer', description: 'Visas, residence permits, deportation defense, and citizenship matters.' }
];

const FIRST_NAMES_M = ['Budi', 'Joko', 'Andi', 'Agus', 'Hendra', 'Fajar', 'Reza', 'Bayu', 'Dimas', 'Rizky', 'Aditya', 'Yusuf', 'Hasan', 'Indra', 'Taufik'];
const FIRST_NAMES_F = ['Siti', 'Dewi', 'Putri', 'Ayu', 'Rini', 'Mega', 'Indah', 'Laras', 'Novi', 'Maya', 'Kartika', 'Wulan', 'Dian', 'Nita', 'Tari'];
const LAST_NAMES = ['Santoso', 'Wijaya', 'Prasetyo', 'Kusuma', 'Gunawan', 'Setiawan', 'Nugroho', 'Ramadhan', 'Lubis', 'Nasution', 'Harahap', 'Simanjuntak', 'Siregar', 'Hidayat', 'Saputra'];
const CITIES = ['Jakarta Selatan', 'Jakarta Pusat', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Denpasar', 'Makassar', 'Yogyakarta', 'Palembang'];
const LAW_FIRMS = ['Harapan & Rekan', 'LexIndonesia Partners', 'Nusantara Legal Group', 'Garuda Law Office', 'Sovereign Counsel', 'Mitra Hukum Indonesia', 'Praxis Legal Consultants', 'Archipelago Attorneys'];
const EDUCATION = [
  'S1 Hukum Universitas Indonesia',
  'S1 Hukum Universitas Gadjah Mada',
  'S1 Hukum Universitas Padjadjaran',
  'S2 Magister Hukum Universitas Indonesia',
  'S2 Hukum Bisnis Universitas Pelita Harapan',
  'S1 Hukum Universitas Airlangga'
];
const CERTS = ['Izin Praktik PERADI', 'Sertifikasi Mediator Hukum', 'Sertifikasi Arbitrase BANI', 'Advokat Terdaftar MKHI'];
const LANGUAGE_SETS = [
  ['Bahasa Indonesia', 'English'],
  ['Bahasa Indonesia', 'English', 'Mandarin'],
  ['Bahasa Indonesia', 'English', 'Japanese'],
  ['Bahasa Indonesia', 'English', 'Korean'],
  ['Bahasa Indonesia', 'English', 'Arabic'],
  ['Bahasa Indonesia', 'Mandarin'],
  ['Bahasa Indonesia', 'English', 'Mandarin', 'Japanese']
];
const REVIEW_COMMENTS = [
  'Sangat membantu dan solutif. Penjelasannya mudah dipahami.',
  'Rekomendasi yang luar biasa, pengacara sangat berpengalaman.',
  'Profesional, responsif, dan memberikan langkah konkret.',
  'Konsultasi bisnis yang sangat bermanfaat bagi startup kami.',
  'Penjelasan detail mengenai pasal-pasal hukum yang relevan.',
  'Sangat tenang dan mengayomi selama proses konsultasi.',
  'Langkah hukum yang diberikan praktis dan bisa langsung dijalankan.',
  'Puas dengan kualitas analisis kasus dan follow-up dokumen.',
  'Komunikasi jelas, timeline terpenuhi, hasil sesuai harapan.',
  'Advokat yang sabar mendengarkan dan memberikan opsi strategi.'
];
const ISSUE_TITLES = [
  'Sengketa kontrak kerja sama',
  'Gugatan wanprestasi',
  'Pengajuan gugatan cerai',
  'Banding sengketa tanah',
  'Konsultasi kepatuhan pajak',
  'Pelanggaran hak cipta online',
  'Kasus penipuan digital',
  'Review kontrak proyek',
  'Sengketa PHK',
  'Permohonan izin tinggal'
];

let cachedDataset: PlatformDataset | null = null;

export function buildPlatformDataset(): PlatformDataset {
  if (cachedDataset) return cachedDataset;

  const rand = mulberry32(20260606);
  const categories: PlatformCategory[] = CATEGORY_DEFS.map((cat, index) => ({
    id: uuidFromIndex('c0000000-0000-4c00-8000', index + 1),
    name: cat.name,
    description: cat.description,
    lawyerCount: 0,
    consultationCount: 0
  }));

  const lawyerRecords: PlatformDataset['lawyerRecords'] = [];
  const lawyers: Lawyer[] = [];
  let lawyerIndex = 0;

  categories.forEach((category, catIndex) => {
    const lawyersInCategory = 8 + (catIndex % 8);
    for (let i = 0; i < lawyersInCategory; i += 1) {
      lawyerIndex += 1;
      const isFemale = lawyerIndex % 3 === 0;
      const firstName = FIRST_NAMES_M[(lawyerIndex + catIndex) % FIRST_NAMES_M.length];
      const lastName = LAST_NAMES[(lawyerIndex * 2 + i) % LAST_NAMES.length];
      const fullName = `${firstName} ${lastName}, S.H.${lawyerIndex % 2 === 0 ? ', M.H.' : ''}`;
      const id = lawyerIndex === 1 ? DEMO_LAWYER_ID : uuidFromIndex('10000000-0000-4000-8000', lawyerIndex);
      const experience = 2 + ((lawyerIndex * 7) % 24);
      const price = 150000 + ((lawyerIndex * 37127) % 4350000);
      const rating = Number((4.1 + ((lawyerIndex * 17) % 90) / 100).toFixed(1));
      const reviewCount = 3 + ((lawyerIndex * 5) % 42);
      const consultationCount = 5 + ((lawyerIndex * 11) % 85);
      const successRate = Number((82 + ((lawyerIndex * 3) % 18)).toFixed(1));
      const languages = LANGUAGE_SETS[lawyerIndex % LANGUAGE_SETS.length];
      const education = [EDUCATION[lawyerIndex % EDUCATION.length], EDUCATION[(lawyerIndex + 2) % EDUCATION.length]].slice(0, 1 + (lawyerIndex % 2));
      const certifications = [CERTS[lawyerIndex % CERTS.length], CERTS[(lawyerIndex + 1) % CERTS.length]];
      const lawFirm = LAW_FIRMS[lawyerIndex % LAW_FIRMS.length];
      const city = CITIES[(lawyerIndex + catIndex) % CITIES.length];
      const officeLocation = `${city} • ${lawFirm}`;
      const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
      const availability = pickN(rand, days, 3).map((day, idx) => ({
        day,
        times: [`${9 + idx}:00`, `${11 + idx}:00`, `${14 + idx}:00`]
      }));

      const record = {
        id,
        name: fullName,
        specialty: category.name,
        rating,
        reviewCount,
        experience,
        price,
        image: `https://api.dicebear.com/7.x/personas/svg?seed=finprose-lawyer-${lawyerIndex}`,
        description: `${fullName} adalah advokat ${category.name.toLowerCase()} berbasis ${city} dengan ${experience} tahun pengalaman. Beliau menangani ${consultationCount}+ konsultasi dengan success rate ${successRate}% dan fokus pada strategi hukum yang measurable.`,
        isOnline: lawyerIndex % 4 !== 0,
        languages,
        education,
        certifications,
        availability,
        gender: isFemale ? 'female' : 'male',
        age: 28 + (lawyerIndex % 27),
        lawFirm,
        officeLocation,
        successRate,
        consultationCount,
        supportsOnline: lawyerIndex % 9 !== 0,
        supportsOffline: lawyerIndex % 5 !== 0,
        categoryIds: [category.id]
      };

      lawyerRecords.push(record);
      lawyers.push(record);
      category.lawyerCount += 1;
    }
  });

  const clients: PlatformClient[] = [];
  for (let i = 1; i <= 200; i += 1) {
    const isFemale = rand() > 0.5;
    const firstName = pick(rand, isFemale ? FIRST_NAMES_F : FIRST_NAMES_M);
    const lastName = pick(rand, LAST_NAMES);
    clients.push({
      id: i === 1 ? DEMO_CLIENT_ID : uuidFromIndex('20000000-0000-4000-8000', i),
      fullName: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@client.finpro.id`,
      phone: `08${11 + (i % 8)}${String(10000000 + Math.floor(rand() * 89999999))}`,
      address: `Jl. ${pick(rand, ['Sudirman', 'Thamrin', 'Diponegoro', 'Ahmad Yani', 'Gatot Subroto'])} No. ${i}, ${pick(rand, CITIES)}`,
      gender: isFemale ? 'female' : 'male',
      membershipStatus: rand() > 0.08 ? 'active' : 'premium',
      avatarUrl: `/avatars/client-${(i % 6) + 1}.png`,
      registeredAt: isoDaysAgo(Math.floor(rand() * 540)),
      consultationIds: [],
      transactionIds: []
    });
  }

  const consultations: PlatformConsultation[] = [];
  const statuses: PlatformConsultation['status'][] = ['pending', 'paid', 'ongoing', 'in_review', 'completed', 'completed', 'completed', 'cancelled'];
  const consultationTypes: PlatformConsultation['consultationType'][] = ['chat', 'video', 'voice', 'document_review'];
  const methods: PlatformTransaction['method'][] = ['bank_transfer', 'qris', 'credit_card', 'debit_card', 'ewallet'];
  const paymentStatuses: PlatformTransaction['status'][] = ['paid', 'paid', 'paid', 'pending', 'failed', 'refunded'];

  for (let i = 1; i <= 150; i += 1) {
    const client = i <= 8 ? clients[i - 1] : pick(rand, clients);
    const lawyer = pick(rand, lawyerRecords);
    const category = categories.find(c => c.id === lawyer.categoryIds[0]) || categories[0];
    const status = pick(rand, statuses);
    const daysAgo = Math.floor(rand() * 120);
    const price = lawyer.price;
    const id = uuidFromIndex('30000000-0000-4000-8000', i);
    const issueTitle = pick(rand, ISSUE_TITLES);

    consultations.push({
      id,
      clientId: client.id,
      lawyerId: lawyer.id,
      categoryId: category.id,
      categoryName: category.name,
      issueTitle,
      issueDescription: `Klien membutuhkan pendampingan hukum terkait ${issueTitle.toLowerCase()} dengan urgensi menengah dan dokumen pendukung sudah tersedia.`,
      notes: `Notulen konsultasi: ${issueTitle}. Advokat memberikan rencana tindak lanjut dan checklist dokumen.`,
      status,
      consultationType: consultationTypes[i % consultationTypes.length],
      meetingMode: rand() > 0.25 ? 'virtual' : 'in_person',
      scheduledDate: dateOnly(daysAgo),
      scheduledTime: `${9 + Math.floor(rand() * 8)}:${pick(rand, ['00', '15', '30', '45'])}`,
      price,
      createdAt: isoDaysAgo(daysAgo),
      clientName: client.fullName,
      lawyerName: lawyer.name,
      lawyerSpecialty: lawyer.specialty,
      lawyerImage: lawyer.image
    });

    client.consultationIds.push(id);
    category.consultationCount += 1;
  }

  const completedConsultations = consultations.filter(c => c.status === 'completed');
  const reviews: PlatformReview[] = [];
  for (let i = 1; i <= 200; i += 1) {
    const consultation = completedConsultations[i % completedConsultations.length] || pick(rand, consultations);
    const client = clients.find(c => c.id === consultation.clientId) || pick(rand, clients);
    const lawyer = lawyerRecords.find(l => l.id === consultation.lawyerId) || pick(rand, lawyerRecords);
    reviews.push({
      id: uuidFromIndex('40000000-0000-4000-8000', i),
      consultationId: consultation.id,
      clientId: client.id,
      lawyerId: lawyer.id,
      clientName: client.fullName,
      lawyerName: lawyer.name,
      rating: rand() > 0.15 ? 5 : rand() > 0.5 ? 4 : 3,
      comment: pick(rand, REVIEW_COMMENTS),
      createdAt: isoDaysAgo(Math.floor(rand() * 90)),
      categoryName: consultation.categoryName
    });
  }

  const transactions: PlatformTransaction[] = [];
  consultations.forEach((consultation, index) => {
    const client = clients.find(c => c.id === consultation.clientId)!;
    const taxAmount = Math.round(consultation.price * 0.11);
    const platformFee = Math.round(consultation.price * 0.1);
    const adminFee = 5000;
    const totalAmount = consultation.price + taxAmount + platformFee + adminFee;
    const status = consultation.status === 'cancelled'
      ? pick(rand, ['failed', 'refunded'] as PlatformTransaction['status'][] )
      : consultation.status === 'pending'
        ? 'pending'
        : pick(rand, paymentStatuses.filter(s => s !== 'pending' || consultation.status === 'pending'));

    const lawyerEarnings = consultation.price - platformFee;
    const tx: PlatformTransaction = {
      id: uuidFromIndex('50000000-0000-4000-8000', index + 1),
      consultationId: consultation.id,
      clientId: consultation.clientId,
      lawyerId: consultation.lawyerId,
      clientName: consultation.clientName,
      lawyerName: consultation.lawyerName,
      invoiceNumber: `INV-FP-${String(index + 1).padStart(5, '0')}`,
      amount: consultation.price,
      taxAmount,
      platformFee,
      adminFee,
      totalAmount,
      netRevenue: lawyerEarnings,
      method: methods[index % methods.length],
      status: status === 'pending' && consultation.status !== 'pending' ? 'paid' : status,
      paymentProofUrl: `/proofs/payment-${(index % 6) + 1}.png`,
      receiptUrl: `/proofs/receipt-${(index % 6) + 1}.pdf`,
      lawyerEarnings,
      createdAt: consultation.createdAt,
      paidAt: status === 'paid' || consultation.status === 'completed' ? consultation.createdAt : null
    };

    transactions.push(tx);
    client.transactionIds.push(tx.id);
  });

  const notifications: PlatformNotification[] = clients.slice(0, 30).flatMap((client, index) => ([
    {
      id: uuidFromIndex('60000000-0000-4000-8000', index * 2 + 1),
      userId: client.id,
      title: 'Konsultasi Dijadwalkan',
      message: 'Sesi konsultasi Anda telah dikonfirmasi advokat.',
      type: 'success' as const,
      createdAt: isoDaysAgo(index + 1, 9, 30),
      isRead: index % 3 !== 0
    },
    {
      id: uuidFromIndex('60000000-0000-4000-8000', index * 2 + 2),
      userId: client.id,
      title: 'Pembayaran Berhasil',
      message: 'Bukti pembayaran diterima. Anda dapat masuk ke ruang konsultasi.',
      type: 'info' as const,
      createdAt: isoDaysAgo(index + 2, 14, 15),
      isRead: index % 4 === 0
    }
  ]));

  const favorites: PlatformFavorite[] = clients.slice(0, 80).flatMap((client, index) => {
    const lawyer = lawyerRecords[index % lawyerRecords.length];
    return [{ clientId: client.id, lawyerId: lawyer.id, createdAt: isoDaysAgo(index + 3) }];
  });

  const files: PlatformFile[] = [];
  consultations.forEach((consultation, index) => {
    files.push({
      id: uuidFromIndex('70000000-0000-4000-8000', index * 2 + 1),
      originalName: `Bukti-Kasus-${index + 1}.pdf`,
      storedName: `case-${index + 1}.pdf`,
      extension: 'pdf',
      mimeType: 'application/pdf',
      fileSize: 240000 + index * 1000,
      storagePath: `/storage/consultations/${consultation.id}/case-${index + 1}.pdf`,
      publicUrl: `/files/consultations/case-${index + 1}.pdf`,
      uploadedBy: consultation.clientId,
      entityType: 'consultation',
      entityId: consultation.id,
      status: 'active',
      checksum: `sha256:case-${index + 1}`,
      extractedText: `${consultation.issueTitle}. ${consultation.issueDescription}`,
      createdAt: consultation.createdAt
    });
  });
  transactions.forEach((transaction, index) => {
    files.push({
      id: uuidFromIndex('70000000-0000-4000-8000', index * 2 + 2),
      originalName: `Bukti-Pembayaran-${transaction.invoiceNumber}.png`,
      storedName: `payment-${index + 1}.png`,
      extension: 'png',
      mimeType: 'image/png',
      fileSize: 180000 + index * 800,
      storagePath: `/storage/transactions/${transaction.id}/payment-proof.png`,
      publicUrl: transaction.paymentProofUrl,
      uploadedBy: transaction.clientId,
      entityType: 'transaction',
      entityId: transaction.id,
      status: 'active',
      checksum: `sha256:payment-${index + 1}`,
      createdAt: transaction.createdAt
    });
  });
  lawyerRecords.slice(0, 40).forEach((lawyer, index) => {
    files.push({
      id: uuidFromIndex('71000000-0000-4000-8000', index + 1),
      originalName: `Sertifikat-${lawyer.name.split(',')[0]}.pdf`,
      storedName: `lawyer-cert-${index + 1}.pdf`,
      extension: 'pdf',
      mimeType: 'application/pdf',
      fileSize: 120000,
      storagePath: `/storage/lawyers/${lawyer.id}/certificate.pdf`,
      publicUrl: `/files/lawyers/cert-${index + 1}.pdf`,
      uploadedBy: lawyer.id,
      entityType: 'lawyer',
      entityId: lawyer.id,
      status: 'active',
      checksum: `sha256:lawyer-${index + 1}`,
      createdAt: isoDaysAgo(index + 10)
    });
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthlyRevenue = monthNames.map((month, index) => {
    const paid = transactions.filter(t => t.status === 'paid');
    const slice = paid.filter((_, i) => i % 12 === index);
    return {
      month,
      revenue: slice.reduce((sum, item) => sum + item.totalAmount, 0),
      consultations: slice.length
    };
  });

  const analytics: PlatformAnalytics = {
    monthlyRevenue,
    consultationGrowth: monthNames.map((month, index) => ({
      month,
      count: consultations.filter((_, i) => i % 12 === index).length
    })),
    categoryPopularity: categories.map(cat => ({
      category: cat.name,
      count: cat.consultationCount
    })),
    consultationStatusDistribution: ['pending', 'paid', 'ongoing', 'in_review', 'completed', 'cancelled'].map(status => ({
      status,
      count: consultations.filter(c => c.status === status).length
    })),
    transactionStatusDistribution: ['paid', 'pending', 'failed', 'refunded'].map(status => ({
      status,
      count: transactions.filter(t => t.status === status).length
    })),
    topLawyers: [...lawyerRecords]
      .sort((a, b) => b.consultationCount - a.consultationCount)
      .slice(0, 8)
      .map(l => ({
        name: l.name,
        consultations: l.consultationCount,
        revenue: transactions.filter(t => t.lawyerId === l.id && t.status === 'paid').reduce((s, t) => s + t.netRevenue, 0),
        rating: l.rating
      })),
    topClients: clients
      .slice(0, 8)
      .map(c => ({
        name: c.fullName,
        consultations: c.consultationIds.length,
        spent: transactions.filter(t => t.clientId === c.id && t.status === 'paid').reduce((s, t) => s + t.totalAmount, 0)
      })),
    aiUsage: {
      conversations: 240,
      messages: 1860,
      fileUploads: 96,
      analyses: 128
    }
  };

  cachedDataset = {
    categories,
    lawyers,
    lawyerRecords,
    clients,
    consultations,
    reviews,
    transactions,
    notifications,
    files,
    favorites,
    analytics,
    demoAccounts: {
      clientId: DEMO_CLIENT_ID,
      lawyerId: DEMO_LAWYER_ID,
      adminId: DEMO_ADMIN_ID,
      clientEmail: 'demo.client@finpro.id',
      lawyerEmail: 'demo.lawyer@finpro.id',
      adminEmail: 'demo.admin@finpro.id'
    }
  };

  return cachedDataset;
}

export function getPlatformDataset() {
  return buildPlatformDataset();
}

export function getLawyerById(id: string) {
  return buildPlatformDataset().lawyerRecords.find(l => l.id === id) || null;
}

export function getReviewsForLawyer(lawyerId: string, limit = 6) {
  return buildPlatformDataset().reviews.filter(r => r.lawyerId === lawyerId).slice(0, limit);
}

export function getRelatedLawyers(lawyerId: string, limit = 3) {
  const current = getLawyerById(lawyerId);
  if (!current) return buildPlatformDataset().lawyers.slice(0, limit);
  return buildPlatformDataset().lawyers
    .filter(l => l.id !== lawyerId && l.specialty === current.specialty)
    .slice(0, limit);
}

export function getConsultationsForUser(userId: string, role: 'client' | 'lawyer' | 'admin') {
  const data = buildPlatformDataset();
  if (role === 'lawyer') {
    const rows = data.consultations.filter(c => c.lawyerId === userId);
    return rows.length ? rows : data.consultations.filter(c => c.lawyerId === DEMO_LAWYER_ID);
  }
  if (role === 'admin') return data.consultations;
  const userConsultations = data.consultations.filter(c => c.clientId === userId);
  return userConsultations.length ? userConsultations : data.consultations.filter(c => c.clientId === DEMO_CLIENT_ID);
}

export function getTransactionsForUser(userId: string, role: 'client' | 'lawyer' | 'admin') {
  const data = buildPlatformDataset();
  if (role === 'lawyer') {
    const rows = data.transactions.filter(t => t.lawyerId === userId);
    return rows.length ? rows : data.transactions.filter(t => t.lawyerId === DEMO_LAWYER_ID);
  }
  if (role === 'admin') return data.transactions;
  const rows = data.transactions.filter(t => t.clientId === userId);
  return rows.length ? rows : data.transactions.filter(t => t.clientId === DEMO_CLIENT_ID);
}

export function getNotificationsForUser(userId: string) {
  const data = buildPlatformDataset();
  const rows = data.notifications.filter(n => n.userId === userId);
  return rows.length ? rows : data.notifications.filter(n => n.userId === DEMO_CLIENT_ID);
}

export function getFavoriteLawyersForUser(userId: string, limit = 4) {
  const data = buildPlatformDataset();
  const favoriteLawyerIds = data.favorites
    .filter(item => item.clientId === userId)
    .map(item => item.lawyerId);
  const ids = favoriteLawyerIds.length
    ? favoriteLawyerIds
    : [...new Set(getConsultationsForUser(userId, 'client').map(c => c.lawyerId))];
  return data.lawyers.filter(l => ids.includes(l.id)).slice(0, limit);
}

export function getFilesForUser(userId: string, role: 'client' | 'lawyer' | 'admin') {
  const data = buildPlatformDataset();
  if (role === 'admin') return data.files;
  if (role === 'lawyer') {
    return data.files.filter(file => file.uploadedBy === userId || file.entityType === 'lawyer' && file.entityId === userId);
  }
  const rows = data.files.filter(file => file.uploadedBy === userId || data.consultations.some(c => c.clientId === userId && c.id === file.entityId));
  return rows.length ? rows : data.files.filter(file => file.uploadedBy === DEMO_CLIENT_ID).slice(0, 12);
}

export function getFilesForConsultation(consultationId: string) {
  return buildPlatformDataset().files.filter(file => file.entityType === 'consultation' && file.entityId === consultationId);
}

export function getFilesForTransaction(transactionId: string) {
  return buildPlatformDataset().files.filter(file => file.entityType === 'transaction' && file.entityId === transactionId);
}

export function mergeLawyersWithPlatform(liveLawyers: Lawyer[]) {
  if (liveLawyers.length >= 20) return liveLawyers;
  const platform = buildPlatformDataset().lawyers;
  const seen = new Set(liveLawyers.map(l => l.id));
  return [...liveLawyers, ...platform.filter(l => !seen.has(l.id))];
}

export function toConsultationRow(row: PlatformConsultation) {
  return {
    id: row.id,
    client_id: row.clientId,
    lawyer_id: row.lawyerId,
    consultation_type: row.consultationType,
    scheduled_day: row.scheduledDate,
    scheduled_time: row.scheduledTime,
    status: row.status,
    price: row.price,
    notes: row.notes,
    created_at: row.createdAt,
    lawyer_directory: {
      name: row.lawyerName,
      specialty: row.lawyerSpecialty,
      image: row.lawyerImage
    },
    profiles: {
      full_name: row.clientName,
      email: `${row.clientName.toLowerCase().replace(/\s+/g, '.')}@client.finpro.id`
    },
    app_payments: [{
      id: `pay-${row.id.slice(0, 8)}`,
      status: row.status === 'completed' || row.status === 'paid' || row.status === 'ongoing' ? 'paid' as const : row.status === 'cancelled' ? 'failed' as const : 'pending' as const,
      total_amount: row.price + Math.round(row.price * 0.21) + 5000,
      method: 'qris',
      paid_at: row.createdAt,
      created_at: row.createdAt
    }]
  };
}
