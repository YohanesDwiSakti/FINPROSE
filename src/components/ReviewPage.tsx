import React, { useState } from 'react';
import { 
  Star, Send, ArrowLeft, MessageSquare, ShieldCheck, 
  ThumbsUp, ThumbsDown, Camera, X, CheckCircle2, Heart
} from 'lucide-react';
import { Lawyer } from '../types';
import { submitReview } from '../api';

export const ReviewPage = ({ 
  lawyer, 
  consultationId,
  onBack, 
  onSubmit 
}: { 
  lawyer: Lawyer, 
  consultationId?: string,
  onBack: () => void, 
  onSubmit: (data: any) => void 
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const tags = [
    'Sangat Informatif', 'Respon Cepat', 'Bahasa Mudah Dimengerti', 
    'Sangat Empati', 'Solusi Tepat', 'Profesional'
  ];

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    setMessage('');
    setIsSaving(true);

    try {
      await submitReview({
        consultationId,
        lawyerId: lawyer.id,
        rating,
        comment: review,
        tags: selectedTags
      });
      setIsSubmitted(true);
      setTimeout(() => {
        onSubmit({ rating, review, selectedTags });
      }, 1600);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ulasan gagal disimpan.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-brand-black text-white rounded-[32px] flex items-center justify-center mb-8 shadow-2xl shadow-black/20">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold font-display mb-4">Terima Kasih!</h2>
        <p className="text-sm text-brand-gray-400 font-medium max-w-xs uppercase tracking-widest leading-relaxed">
          Ulasan Anda sangat berarti bagi perkembangan layanan hukum kami dan membantu klien lain menemukan advokat yang tepat.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-brand-gray-100 p-6 flex items-center justify-between sticky top-0 z-10">
        <button onClick={onBack} className="p-2 hover:bg-brand-gray-50 rounded-full transition-colors">
          <X className="w-5 h-5 text-brand-gray-400" />
        </button>
        <h1 className="text-xs font-bold uppercase tracking-[0.3em]">Beri Ulasan</h1>
        <div className="w-9"></div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-6 md:p-12 space-y-12">
        {/* Lawyer Summary Card */}
        <section className="bg-white p-8 rounded-[40px] border border-brand-gray-100 shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <img 
              src={lawyer.image} 
              alt={lawyer.name} 
              className="w-24 h-24 rounded-[32px] object-cover grayscale border-4 border-brand-gray-50"
            />
            <div className="absolute -bottom-2 -right-2 bg-brand-black p-2 rounded-xl text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold font-display">{lawyer.name}</h2>
            <p className="text-[10px] font-bold text-brand-gray-400 uppercase tracking-widest mt-1">Konsultasi Selesai • 60 Menit</p>
          </div>
        </section>

        {/* Rating Section */}
        <section className="space-y-8">
          <div className="text-center space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black">Bagaimana pengalaman Anda?</h3>
            <div className="flex items-center justify-center space-x-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform active:scale-90"
                >
                  <Star 
                    className={`w-10 h-10 transition-colors ${
                      (hoverRating || rating) >= star 
                        ? 'fill-brand-black text-brand-black' 
                        : 'text-brand-gray-200'
                    }`} 
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-[10px] font-bold text-brand-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                {['Buruk', 'Cukup', 'Baik', 'Sangat Baik', 'Luar Biasa'][rating - 1]}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400 text-center">Apa yang paling Anda sukai?</h4>
            <div className="flex flex-wrap justify-center gap-3">
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleToggleTag(tag)}
                  className={`px-5 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-brand-black border-brand-black text-white shadow-lg shadow-black/10'
                      : 'bg-white border-brand-gray-100 text-brand-gray-400 hover:border-brand-gray-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Comment Section */}
        <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-black">Tulis Ulasan Anda</h3>
              <span className="text-[9px] font-bold text-brand-gray-300 uppercase tracking-widest">{review.length}/500</span>
            </div>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value.slice(0, 500))}
              placeholder="Ceritakan pengalaman Anda berkonsultasi dengan advokat ini..."
              rows={5}
              className="w-full bg-white border border-brand-gray-100 rounded-[32px] p-6 text-sm font-medium outline-none focus:border-brand-black transition-all resize-none shadow-sm"
            />
        </section>

        {/* Action Button */}
        <div className="pt-4">
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || isSaving}
            className="w-full bg-brand-black text-white py-6 rounded-[32px] font-bold uppercase tracking-widest text-xs flex items-center justify-center space-x-3 shadow-2xl shadow-black/20 hover:translate-y-[-2px] active:translate-y-[0px] disabled:opacity-30 disabled:translate-y-0 transition-all"
          >
            <span>{isSaving ? 'Menyimpan...' : 'Kirim Ulasan'}</span>
            <Send className="w-4 h-4" />
          </button>

          {message && (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-700">
              {message}
            </div>
          )}
          
          <div className="flex items-center justify-center mt-8 space-x-2 text-brand-gray-400">
            <Heart className="w-3 h-3 fill-current" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Dibuat dengan Integritas Hukum</span>
          </div>
        </div>
      </main>
    </div>
  );
};
