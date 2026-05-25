import { useState } from 'react';
import { ArrowLeft, Bell, Camera, Loader2, Lock, Mail, MapPin, Phone, Save, User } from 'lucide-react';
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
  'Sumatera Barat - Padang',
  'Sumatera Selatan - Palembang',
  'Kalimantan Timur - Balikpapan',
  'Kalimantan Selatan - Banjarmasin',
  'Sulawesi Selatan - Makassar',
  'Sulawesi Utara - Manado',
  'Papua - Jayapura'
];

export const ProfileSettingsPage = ({ onBack }: { onBack: () => void }) => {
  const user = getStoredUser();
  const [name, setName] = useState(user?.name || 'Klien FINPROSE');
  const [email, setEmail] = useState(user?.email || 'klien@example.com');
  const [phone, setPhone] = useState(user?.phone || '+62 812 0000 0001');
  const [address, setAddress] = useState(user?.address || 'DKI Jakarta - Jakarta Selatan');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [saved, setSaved] = useState(false);
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);

  const saveProfile = () => {
    localStorage.setItem('finprose_user', JSON.stringify({
      id: user?.id || 'local-client',
      role: user?.role || 'client',
      status: user?.status || 'Member Aktif',
      name,
      email,
      phone,
      address,
      avatarUrl
    }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const handlePhotoChange = async (file?: File) => {
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const url = await uploadProfilePhoto(file);
      setAvatarUrl(url);
      setModal({ title: 'Foto Profil Tersimpan', description: 'Foto profil Anda berhasil diunggah dan akan tampil di akun FINPROSE.' });
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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <button onClick={onBack} className="flex items-center space-x-2 text-sm font-bold uppercase tracking-widest text-brand-gray-400 hover:text-brand-black">
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali</span>
          </button>
          <h1 className="font-display text-xl font-bold">Profil & Pengaturan</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-6 py-12 lg:grid-cols-3">
        <section className="rounded-[40px] border border-brand-gray-100 bg-brand-black p-8 text-white shadow-2xl shadow-black/20">
          <div className="mb-8 space-y-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-[32px] bg-white text-brand-black">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-bold">
                  {name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}
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
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{user?.role === 'lawyer' ? 'Advokat' : user?.role === 'admin' ? 'Admin' : 'Klien'} FINPROSE</p>
          <div className="mt-10 space-y-4 text-xs font-bold uppercase tracking-widest text-zinc-400">
            <div className="space-y-1">
              <p className="text-[9px] text-zinc-600">Email</p>
              <div className="flex items-center space-x-3"><Mail className="h-4 w-4" /><span className="break-all normal-case tracking-normal">{email}</span></div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] text-zinc-600">Nomor Telepon</p>
              <div className="flex items-center space-x-3"><Phone className="h-4 w-4" /><span>{phone}</span></div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] text-zinc-600">Domisili / Asal</p>
              <div className="flex items-center space-x-3"><MapPin className="h-4 w-4" /><span>{address}</span></div>
            </div>
          </div>
        </section>

        <section className="space-y-8 lg:col-span-2">
          <div className="rounded-[40px] border border-brand-gray-100 bg-white p-8 shadow-xl shadow-black/5">
            <h3 className="mb-8 flex items-center space-x-3 text-xs font-bold uppercase tracking-[0.2em]">
              <User className="h-4 w-4" />
              <span>Data Akun</span>
            </h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Nama Lengkap</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" className="w-full rounded-2xl bg-brand-gray-50 p-5 text-sm font-medium outline-none focus:ring-1 focus:ring-brand-black" />
              </label>
              <label className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Alamat Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Alamat email" className="w-full rounded-2xl bg-brand-gray-50 p-5 text-sm font-medium outline-none focus:ring-1 focus:ring-brand-black" />
              </label>
              <label className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Nomor Telepon</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+62 812 0000 0001" className="w-full rounded-2xl bg-brand-gray-50 p-5 text-sm font-medium outline-none focus:ring-1 focus:ring-brand-black" />
              </label>
              <label className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">Domisili / Asal</span>
                <select value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-2xl bg-brand-gray-50 p-5 text-sm font-medium outline-none focus:ring-1 focus:ring-brand-black">
                  {DOMICILE_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <button onClick={saveProfile} className="mt-8 flex items-center justify-center space-x-3 rounded-2xl bg-brand-black px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-white">
              <Save className="h-4 w-4" />
              <span>{saved ? 'Tersimpan' : 'Simpan Perubahan'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-[32px] border border-brand-gray-100 bg-white p-7">
              <Bell className="mb-6 h-5 w-5" />
              <h4 className="mb-2 font-bold">Notifikasi</h4>
              <p className="text-xs font-medium leading-6 text-brand-gray-400">Atur pengingat jadwal, pesan baru, pembayaran, dan dokumen hukum.</p>
              <label className="mt-6 flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                Email & Push
                <input type="checkbox" defaultChecked className="h-5 w-5" />
              </label>
            </div>
            <div className="rounded-[32px] border border-brand-gray-100 bg-white p-7">
              <Lock className="mb-6 h-5 w-5" />
              <h4 className="mb-2 font-bold">Keamanan</h4>
              <p className="text-xs font-medium leading-6 text-brand-gray-400">Kelola kata sandi, sesi login, dan proteksi dokumen sensitif.</p>
              <button
                onClick={() => setModal({ title: 'Ubah Kata Sandi', description: 'Form keamanan akan meminta kata sandi lama, kata sandi baru, dan konfirmasi sebelum menyimpan perubahan akun.' })}
                className="mt-6 rounded-xl bg-brand-gray-50 px-5 py-3 text-[10px] font-bold uppercase tracking-widest"
              >
                Ubah Kata Sandi
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
