import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Lock, User, KeyRound, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginWithPin } = useAuth();
  const [mode, setMode] = useState<'PASSWORD' | 'PIN'>('PIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setError(null);
    setIsLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);
      if (newPin.length === 4) {
        triggerPinLogin(newPin);
      }
    }
  };

  const triggerPinLogin = async (enteredPin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await loginWithPin(enteredPin);
    } catch (err: any) {
      setError(err.message || 'Invalid PIN code');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-slate-100 p-4 font-sans relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl" />

      <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-8 shadow-2xl relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-3">
            <ShoppingBag className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">OmniRetail</h2>
          <p className="text-xs text-slate-400 mt-1">Universal Customizable Retail ERP & POS</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-900/60 p-1 rounded-2xl mb-6 border border-slate-700/50">
          <button
            onClick={() => { setMode('PIN'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              mode === 'PIN' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Quick Numpad PIN</span>
          </button>
          <button
            onClick={() => { setMode('PASSWORD'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              mode === 'PASSWORD' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>User & Password</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {mode === 'PIN' ? (
          <div>
            {/* PIN Indicator */}
            <div className="flex justify-center items-center space-x-4 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    pin.length > i
                      ? 'bg-emerald-500 border-emerald-500 scale-110 shadow-md shadow-emerald-500/50'
                      : 'border-slate-600 bg-slate-900/40'
                  }`}
                />
              ))}
            </div>

            {/* Quick PIN Grid */}
            <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  onClick={() => handlePinDigit(String(n))}
                  disabled={isLoading}
                  className="h-14 bg-slate-700/60 hover:bg-slate-700 text-slate-100 rounded-2xl text-xl font-bold flex items-center justify-center active:scale-95 transition-all shadow-sm"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPin('')}
                disabled={isLoading}
                className="h-14 bg-slate-700/30 hover:bg-slate-700/60 text-slate-400 text-xs font-bold rounded-2xl flex items-center justify-center active:scale-95"
              >
                CLEAR
              </button>
              <button
                onClick={() => handlePinDigit('0')}
                disabled={isLoading}
                className="h-14 bg-slate-700/60 hover:bg-slate-700 text-slate-100 rounded-2xl text-xl font-bold flex items-center justify-center active:scale-95"
              >
                0
              </button>
              <button
                onClick={() => setPin((p) => p.slice(0, -1))}
                disabled={isLoading}
                className="h-14 bg-slate-700/30 hover:bg-slate-700/60 text-slate-400 text-xs font-bold rounded-2xl flex items-center justify-center active:scale-95"
              >
                DEL
              </button>
            </div>

            <p className="text-[11px] text-slate-500 text-center mt-5">
              Default PINs: Admin: <span className="font-mono text-emerald-400">9999</span> | Manager: <span className="font-mono text-emerald-400">5555</span> | Cashier: <span className="font-mono text-emerald-400">1234</span>
            </p>
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all mt-2"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
