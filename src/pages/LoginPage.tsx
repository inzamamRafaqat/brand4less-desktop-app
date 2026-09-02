import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, KeyRound, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'PIN' | 'PASSWORD'>('PIN');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithPin } = useAuth();

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter your cashier PIN');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await loginWithPin(pin);
    } catch (err: any) {
      setError(err.message || 'Invalid cashier PIN code');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 4) {
        setTimeout(() => {
          loginWithPin(nextPin).catch((err) => {
            setError(err.message || 'Invalid cashier PIN');
            setPin('');
          });
        }, 100);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleKeypadClear = () => {
    setPin('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4 selection:bg-black selection:text-white font-sans">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl p-8 soft-shadow-md relative">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <div className="grid grid-cols-2 gap-1">
              <span className="w-1.5 h-1.5 rounded-xs bg-white"></span>
              <span className="w-1.5 h-1.5 rounded-xs bg-white"></span>
              <span className="w-1.5 h-1.5 rounded-xs bg-white"></span>
              <span className="w-1.5 h-1.5 rounded-xs bg-white"></span>
            </div>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Brand 4 Less</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">Retail Management & POS Suite</p>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('PIN');
              setError('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
              mode === 'PIN' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Cashier PIN</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('PASSWORD');
              setError('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
              mode === 'PASSWORD' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Admin Login</span>
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-2.5 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PIN MODE */}
        {mode === 'PIN' ? (
          <div>
            <div className="mb-5 text-center">
              <div className="h-14 bg-gray-50 border border-gray-200/80 rounded-2xl flex items-center justify-center tracking-[0.7em] text-3xl font-mono text-gray-950 font-black shadow-inner">
                {pin ? '●'.repeat(pin.length) : <span className="text-gray-400 tracking-normal text-xs font-sans font-bold">Enter 4-digit PIN</span>}
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="py-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-95 text-gray-900 font-black text-xl transition border border-gray-200/70 shadow-2xs"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadClear}
                className="py-3.5 rounded-2xl bg-gray-50 hover:bg-rose-50 text-gray-500 hover:text-rose-600 font-bold text-xs transition border border-gray-200/70"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="py-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-95 text-gray-900 font-black text-xl transition border border-gray-200/70 shadow-2xs"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="py-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-black font-bold text-sm transition border border-gray-200/70"
              >
                ⌫
              </button>
            </div>

            <p className="text-[11px] text-center text-gray-400">
              Demo PINs: Admin (<span className="text-gray-900 font-mono font-bold">1234</span>) | Manager (<span className="text-gray-900 font-mono font-bold">5678</span>) | Cashier (<span className="text-gray-900 font-mono font-bold">0000</span>)
            </p>
          </div>
        ) : (
          /* USERNAME & PASSWORD FORM */
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin, manager, or cashier"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 text-xs focus:outline-none focus:border-black font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 text-xs focus:outline-none focus:border-black font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-black hover:bg-gray-850 text-white font-extrabold text-xs transition shadow-md disabled:opacity-50 mt-2 flex items-center justify-center space-x-2"
            >
              {loading ? <span>Authenticating...</span> : <span>Sign In &rarr;</span>}
            </button>

            <p className="text-[11px] text-center text-gray-400 pt-2">
              Default Login: <span className="text-gray-900 font-mono font-bold">admin</span> / <span className="text-gray-900 font-mono font-bold">admin123</span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
