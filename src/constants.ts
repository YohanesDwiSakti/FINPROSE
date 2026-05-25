import { Lawyer, Consultation, Request, Message } from './types';

export const LAWYERS: Lawyer[] = [
  {
    id: '1',
    name: 'Budi Santoso, S.H., M.H.',
    specialty: 'Hukum Perdata & Keluarga',
    rating: 4.8,
    reviewCount: 156,
    experience: 12,
    price: 150000,
    image: '/lawyer1.png',
    description: 'Ahli dalam menangani kasus sengketa tanah, waris, dan perceraian dengan pendekatan mediasi yang humanis namun tetap tegas sesuai koridor hukum yang berlaku.',
    isOnline: true,
    languages: ['Bahasa Indonesia', 'English'],
    education: [
      'Sarjana Hukum (S.H.), Universitas Indonesia',
      'Magister Hukum (M.H.), Universitas Gadjah Mada'
    ],
    certifications: [
      'Izin Praktik Advokat (PERADI)',
      'Sertifikasi Mediator Bersertifikat'
    ],
    availability: [
      { day: 'Senin', times: ['09:00', '11:00', '14:00', '16:00'] },
      { day: 'Rabu', times: ['10:00', '13:00', '15:00'] },
      { day: 'Jumat', times: ['09:00', '14:00', '15:30'] }
    ]
  },
  {
    id: '2',
    name: 'Siti Aminah, S.H.',
    specialty: 'Hukum Bisnis & Kontrak',
    rating: 4.9,
    reviewCount: 89,
    experience: 8,
    price: 250000,
    image: '/lawyer2.png',
    description: 'Berpengalaman dalam penyusunan kontrak korporasi, audit legalitas usaha (Legal Due Diligence), dan pendampingan UMKM dalam mematuhi regulasi pemerintah.',
    isOnline: false,
    languages: ['Bahasa Indonesia'],
    education: [
      'Sarjana Hukum (S.H.), Universitas Padjadjaran'
    ],
    certifications: [
      'Izin Praktik Advokat (PERADI)',
      'Certified Legal Auditor'
    ],
    availability: [
      { day: 'Selasa', times: ['08:00', '10:00', '14:00'] },
      { day: 'Kamis', times: ['13:00', '15:00', '17:00'] }
    ]
  },
  {
    id: '3',
    name: 'Andi Wijaya, S.H.',
    specialty: 'Hukum Pidana',
    rating: 4.7,
    reviewCount: 210,
    experience: 15,
    price: 200000,
    image: '/lawyer1.png',
    description: 'Spesialis pembelaan pidana umum dan tindak pidana korupsi. Memiliki dedikasi tinggi dalam memperjuangkan hak-hak klienn di hadapan hukum secara profesional.',
    isOnline: true,
    languages: ['Bahasa Indonesia', 'English'],
    education: [
      'Sarjana Hukum (S.H.), Universitas Airlangga'
    ],
    certifications: [
      'Izin Praktik Advokat (PERADI)',
      'Sertifikasi Spesialis Hukum Pidana'
    ],
    availability: [
      { day: 'Senin', times: ['09:00', '13:00'] },
      { day: 'Selasa', times: ['10:00', '14:00'] },
      { day: 'Kamis', times: ['09:00', '11:00'] }
    ]
  },
  {
    id: '4',
    name: 'Linda Kusuma, S.H., LL.M.',
    specialty: 'Hukum Pajak & Investasi',
    rating: 4.9,
    reviewCount: 45,
    experience: 10,
    price: 500000,
    image: '/lawyer2.png',
    description: 'Lulusan luar negeri dengan keahlian khusus pada struktur pajak internasional, kepatuhan investasi, dan penyelesaian sengketa pajak di Pengadilan Pajak.',
    isOnline: true,
    languages: ['Bahasa Indonesia', 'English', 'Mandarin'],
    education: [
      'Sarjana Hukum (S.H.), Universitas Indonesia',
      'Master of Laws (LL.M.), Leiden University, Netherlands'
    ],
    certifications: [
      'Izin Praktik Advokat (PERADI)',
      'Konsultan Pajak Bersertifikat (BKP)'
    ],
    availability: [
      { day: 'Senin', times: ['10:00', '14:00'] },
      { day: 'Rabu', times: ['10:00', '14:00'] },
      { day: 'Jumat', times: ['10:00', '14:00'] }
    ]
  }
];

export const CATEGORIES = [
  'Perceraian',
  'Bisnis/Kontrak',
  'Pidana',
  'Perdata',
  'Ketenagakerjaan',
  'Pajak',
  'Hak Waris'
];

export const LANGUAGES = ['Bahasa Indonesia', 'English', 'Mandarin', 'Jepang'];


export const INCOMING_REQUESTS: Request[] = [
  {
    id: '1',
    clientName: 'Benjamin Wright',
    category: 'CORPORATE LAW',
    description: 'Corporate entity formation for a seed-stage tech startup in the fintech space. Needs guidance on equity split and initial IP assignment.',
    priority: true
  },
  {
    id: '2',
    clientName: 'Sarah Jenkins',
    category: 'INTELLECTUAL PROPERTY',
    description: 'Trademark infringement dispute regarding brand identity in the European market. Requesting initial assessment of strength of claim.'
  }
];

export const ACTIVE_CONSULTATIONS: Consultation[] = [
  {
    id: 'RL-9921',
    clientName: 'Elena Rodriguez',
    lawyerName: 'Marcus Thorne',
    specialty: 'Employment Law',
    date: '12 Sep 2024',
    time: '14:00',
    status: 'In Review',
    type: 'In-Person',
    price: 350000,
    lawyerNotes: 'Tinjauan kontrak kerja awal. Klien memiliki kekhawatiran tentang klausul non-kompetisi.',
    files: [
      { name: 'Kontrak_Kerja_v2.pdf', date: '11 Sep 2024', size: '1.4 MB' }
    ]
  },
  {
    id: 'RL-9804',
    clientName: 'David Thompson',
    lawyerName: 'Marcus Thorne',
    specialty: 'Civil Litigation',
    date: '02 Okt 2024',
    time: '10:00',
    status: 'Ongoing',
    type: 'Virtual Session',
    price: 500000,
    lawyerNotes: 'Tahap penemuan bukti. Perlu koordinasi dengan saksi ahli.',
    files: [
      { name: 'Bukti_Foto_Lokasi.jpg', date: '28 Sep 2024', size: '3.2 MB' },
      { name: 'BAP_Awal.pdf', date: '30 Sep 2024', size: '0.9 MB' }
    ]
  },
  {
    id: 'RL-9500',
    clientName: 'Alexander Smith',
    lawyerName: 'Budi Santoso, S.H.',
    specialty: 'Family Law',
    date: '15 Agu 2024',
    time: '09:00',
    status: 'Completed',
    type: 'Virtual Session',
    price: 450000,
    lawyerNotes: 'Kasus mediasi sengketa waris selesai dengan damai.',
    files: [
      { name: 'Akte_Waris_Final.pdf', date: '15 Agu 2024', size: '2.1 MB' }
    ]
  }
];

export const RECENT_MESSAGES: Message[] = [
  {
    id: '1',
    sender: 'Elias Thorne',
    content: 'The revised NDAs are ready for your electronic signature in the...',
    time: '12 MIN AGO',
    avatar: '/lawyer1.png'
  },
  {
    id: '2',
    sender: 'Sarah Vane',
    content: "I've attached the discovery documents from the opposing...",
    time: '2 HOURS AGO',
    avatar: '/lawyer2.png'
  }
];
