import React, { useState } from 'react';
import { ShieldCheck, X, Delete } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminPinModalProps {
  title?: string;
  reason?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  title = 'Admin Authorization Required',
  reason = 'This action requires Master Admin PIN verification.',
  onSuccess,
  onClose,
}) => {
  const { verifyAdminPin } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const handleDigit = (d: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + d);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleVerify = async () => {
    if (!pin) {
      setError('Please enter admin PIN.');
      return;
    }
    setIsVerifying(true);
    setError(null);

    const isValid = await verifyAdminPin(pin);
    setIsVerifying(false);

    if (isValid) {
      onSuccess();
    } else {
      setError('Incorrect Admin PIN. Access Denied.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xs w-full shadow-2xl overflow-hidden flex flex-col p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">{reason}</p>

        {/* PIN Dots */}
        <div className="flex justify-center items-center space-x-3 my-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                pin.length > idx
                  ? 'bg-emerald-600 border-emerald-600 scale-110'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
              }`}
            />
          ))}
        </div>

        {error && <p className="text-center text-xs font-bold text-rose-500 my-2">{error}</p>}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(String(num))}
              className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-lg flex items-center justify-center active:scale-95 transition-transform"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center active:scale-95"
          >
            CLEAR
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-lg flex items-center justify-center active:scale-95 transition-transform"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-95"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={handleVerify}
          disabled={isVerifying || pin.length === 0}
          className="mt-4 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-500/20"
        >
          {isVerifying ? 'Verifying...' : 'Authorize Action'}
        </button>
      </div>
    </div>
  );
};
