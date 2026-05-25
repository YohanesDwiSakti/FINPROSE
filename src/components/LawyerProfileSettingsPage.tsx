import { useState } from 'react';
import { ArrowLeft, Award, Briefcase, Camera, Gavel, Loader2, Lock, Mail, MapPin, Phone, Save, Scale, User } from 'lucide-react';
import { getStoredUser, uploadProfilePhoto } from '../api';
import { ActionModal } from './ActionModal';

const DOMICILE_OPTIONS = [
  'DKI Jakarta - Jakarta Pusat',
  'DKI Jakarta - Jakarta Selatan',
  'DKI Jakarta - Jakarta Barat',
  'DKI Jakarta - Jakarta Timur',
  'DKI Jakarta - Jakarta Utara',
  'Banten - Tangerang',
  'Banten - Tangerang Selatan',
  'Jawa Barat - Bandung',
  'Jawa Barat - Bekasi',
  'Jawa Barat - Bogor',
  'Jawa Barat - Depok',
  'Jawa Tengah - Semarang',
  'DI Yogyakarta - Yogyakarta',
  'Jawa Timur - Surabaya',
  'Bali - Denpasar',
  'Sumatera Utara - Medan',
  'Sumatera Selatan - Palembang',
  'Sulawesi Selatan - Makassar'
];

const SPECIALTY_OPTIONS = [
  'Hukum Perdata',
  'Hukum Pidana',
  'Hukum Keluarga',
  'Hukum Bisnis & Kontrak',
  'Hukum Ketenagakerjaan',
  'Hukum Pajak',
  'Hak Kekayaan Intelektual',
  'Sengketa Tanah & Properti',
  'Hukum Waris'
];

const getInitials = (name: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || 'AD';
};

export const LawyerProfileSettingsPage = ({ onBack }: { onBack: () => void }) => {
  const user = getStoredUser();
  const [name, setName] = useState(user?.name || 'Advokat FINPROSE');
  const [email, setEmail] = useState(user?.email || 'advokat@example.com');
  const [phone, setPhone] = useState(user?.phone || '+62 812 0000 0002');
  const [address, setAddress] = useState(user?.address || 'DKI Jakarta - Jakarta Selatan');
  const [specialty, setSpecialty] = useState(localStorage.getItem('finprose_lawyer_specialty') || 'Hukum Bisnis & Kontrak');
  const [price, setPrice] = useState(localStorage.getItem('finprose_lawyer_price') || '350000');
  const [experience, setExperience] = useState(localStorage.getItem('finprose_lawyer_experience') || '8');
  const [licenseNumber, setLicenseNumber] = useState(localStorage.getItem('finprose_lawyer_license') || 'PERADI-2026-0001');
  const [bio, setBio] = useState(localStorage.getItem('finprose_lawyer_bio') || 'Advokat terverifikasi FINPROSE yang menangani konsultasi hukum, review dokumen, dan pendampingan perkara.');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [saved, setSaved] = useState(false);
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);

  const saveProfile = () => {
    localStorage.setItem('finprose_user', JSON.stringify({
      id: user?.id || 'local-lawyer',
      role: user?.role || 'lawyer',
      status: user?.status || 'active',
      name,
      email,
      phone,
      address,
      avatarUrl
    }));
    localStorage.setItem('finprose_lawyer_specialty', specialty);
    localStorage.setItem('finprose_lawyer_price', price);
    localStorage.setItem('finprose_lawyer_experience', experience);
    localStorage.setItem('finprose_lawyer_license', licenseNumber);
    localStorage.setItem('finprose_lawyer_bio', bio);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const handlePhotoChange = async (file?: File) => {
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const url = await uploadProfilePhoto(file);
      setAvatarUrl(url);
      setModal({ title: 'Foto Profil Tersimpan', description: 'Foto advokat berhasil diunggah dan akan disinkronkan ke direktori advokat.' });
    } catch (error) {
      setModal({ title: 'Upload Foto Gagal', description: error instanceof Error ? error.message : 'Foto profil gagal diunggah.' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-gray-50">
      {modal && <ActionModal title={modal.title} description={modal.description} onClose={() => setModal(null)} />}
      <header className="sticky top-0 z-30 border-b border-brand-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <button onClick={onBack} className="flex items-center space-x-2 text-sm font-bold uppercase tracking-widest text-brand-gray-400 hover:text-brand-black">
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali</span>
          </button>
          <h1 className="font-display text-xl font-bold">Profil Advokat</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-12 lg:grid-cols-3">
        <section className="rounded-[40px] border border-brand-gray-100 bg-brand-black p-8 text-white shadow-2xl shadow-black/20">
          <div className="mb-8 space-y-4">
            <div className="h-24 w-24 overflow-hidden rounded-[32px] bg-white text-brand-black">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-bold">
                  {getInitials(name)}
                </div>
              )}
            </div>
            <label className="inline-flex cursor-pointer items-center space-x-2 rounded-2xl bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-brand-black">
              {isUploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              <span>{isUploadingPhoto ? 'Mengunggah...' : 'Ganti Foto'}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => handlePhotoChange(event.target.files?.[0])} />
            </label>
          </div>
          <h2 className="font-display text-3xl font-bold">{name}</h2>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Advokat Terverifikasi</p>

          <div className="mt-10 space-y-4 text-xs font-bold uppercase tracking-widest text-zinc-400">
            <div className="space-y-1">
              <p className="text-[9px] text-zinc-600">Spesialisasi</p>
              <div className="flex items-center space-x-3"><Scale className="h-4 w-4" /><span>{specialty}</span></div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] text-zinc-600">Email</p>
              <div className="flex items-center space-x-3"><Mail className="h-4 w-4" /><span className="break-all normal-case tracking-normal">{email}</span></div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] text-zinc-600">Nomor Telepon</p>
              <div className="flex items-center space-x-3"><Phone className="h-4 w-4" /><span>{phone}</span></div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] text-zinc-600">Domisili Praktik</p>
              <div className="flex items-center space-x-3"><MapPin className="h-4 w-4" /><span>{address}</span></div>
            </div>
          </div>
        </section>

        <section className="space-y-8 lg:col-span-2">
          <div className="rounded-[40px] border border-brand-gray-100 bg-white p-8 shadow-xl shadow-black/5">
            <h3 className="mb-8 flex items-center space-x-3 text-xs font-bold uppercase tracking-[0.2em]">
              <User className="h-4 w-4" />
              <span>Data Identitas</span>
            </h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Nama Advokat</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl bg-brand-gray-50 p-5 text-sm font-medium outline-none focus:ring-1 focus:ring-brand-black" />
              </label>
              <label className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Alamat Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl bg-brand-gray-50 p-5 text-sm font-medium outline-none focus:ring-1 focus:ring-brand-black" />
              </label>
              <label className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Nomor Telepon</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-2xl bg-brand-gray-50 p-5 text-sm font-medium outline-none focus:ring-1 focus:ring-brand-black" />
              </label>
              <label className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Domisili Praktik</span>
                <select value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-2xl bg-brand-gray-50 p-5 text-sm font-medium outline-none focus:ring-1 focus:ring-brand-black">
                  {DOMICILE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-[40px] border border-brand-gray-100 bg-white p-8 shadow-xl shadow-black/5">
            <h3 className="mb-8 flex items-center space-x-3 text-xs font-bold uppercase tracking-[0.2em]">
              <Briefcase className="h-4 w-4" />
              <span>Profil Praktik</span>
            </h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Spesialisasi Utama</span>
                <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full rounded-2xl bg-brand-gray-50 p-5 text-sm font-medium outline-none focus:ring-1 focus:ring-brand-black">
                  {SPECIALTY_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Tarif Konsultasi</span>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-2xl bg-brand-gray-50 p-5 text-sm font-medium outline-none focus:ring-1 focus:ring-brand-black" />
              </label>
              <label className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Pengalaman (Tahun)</span>
                <input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} className="w-full rounded-2xl bg-brand-gray-50 p-5 text-sm font-medium outline-none focus:ring-1 focus:ring-brand-black" />
              </label>
              <label className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Nomor Izin / PERADI</span>
                <input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="w-full rounded-2xl bg-brand-gray-50 p-5 text-sm font-medium outline-none focus:ring-1 focus:ring-brand-black" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Bio Profesional</span>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="w-full resize-none rounded-2xl bg-brand-gray-50 p-5 text-sm font-medium outline-none focus:ring-1 focus:ring-brand-black" />
              </label>
            </div>
            <button onClick={saveProfile} className="mt-8 flex items-center justify-center space-x-3 rounded-2xl bg-brand-black px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-white">
              <Save className="h-4 w-4" />
              <span>{saved ? 'Tersimpan' : 'Simpan Profil Advokat'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <button onClick={() => setModal({ title: 'Dokumen Verifikasi', description: 'Halaman ini akan memuat KTP, kartu advokat, sertifikat, dan status validasi admin.' })} className="rounded-[32px] border border-brand-gray-100 bg-white p-7 text-left hover:border-brand-black">
              <Award className="mb-6 h-5 w-5" />
              <h4 className="mb-2 font-bold">Verifikasi</h4>
              <p className="text-xs font-medium leading-6 text-brand-gray-400">Kelola dokumen izin praktik dan sertifikat.</p>
            </button>
            <button onClick={() => setModal({ title: 'Jadwal Praktik', description: 'Atur hari aktif, jam konsultasi, kuota harian, dan mode chat/video/telepon.' })} className="rounded-[32px] border border-brand-gray-100 bg-white p-7 text-left hover:border-brand-black">
              <Gavel className="mb-6 h-5 w-5" />
              <h4 className="mb-2 font-bold">Jadwal</h4>
              <p className="text-xs font-medium leading-6 text-brand-gray-400">Atur ketersediaan konsultasi online.</p>
            </button>
            <button onClick={() => setModal({ title: 'Keamanan Akun', description: 'Kelola kata sandi, perangkat login, dan proteksi dokumen klien.' })} className="rounded-[32px] border border-brand-gray-100 bg-white p-7 text-left hover:border-brand-black">
              <Lock className="mb-6 h-5 w-5" />
              <h4 className="mb-2 font-bold">Keamanan</h4>
              <p className="text-xs font-medium leading-6 text-brand-gray-400">Lindungi akun dan data perkara.</p>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
