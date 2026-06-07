import { X, CheckCircle2 } from 'lucide-react';

export const ActionModal = ({
  title,
  description,
  primaryLabel = 'Mengerti',
  onClose
}: {
  title: string;
  description: string;
  primaryLabel?: string;
  onClose: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-black/20 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[32px] border border-brand-gray-100 bg-white p-8 shadow-2xl shadow-black/20">
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="rounded-2xl bg-brand-gray-50 p-3">
              <CheckCircle2 className="h-6 w-6 text-brand-black" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold">{title}</h3>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">YDA LAW OFFICE & Partners Action</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-brand-gray-300 transition-colors hover:bg-brand-gray-50 hover:text-brand-black">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm font-medium leading-7 text-brand-gray-500">{description}</p>

        <button onClick={onClose} className="mt-8 w-full rounded-2xl bg-brand-black py-4 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:scale-[1.01]">
          {primaryLabel}
        </button>
      </div>
    </div>
  );
};
