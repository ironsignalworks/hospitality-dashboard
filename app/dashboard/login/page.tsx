'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getBrand } from '@/lib/brand';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
  const brand = getBrand();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('Email ou password incorretos.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-8 h-8 bg-[#DAA520] rounded-sm shadow-sm" aria-hidden />
            <span className="font-serif text-2xl font-bold text-[#4A4A4A]">
              {brand.name}
            </span>
          </div>
          <p className="text-sm text-[#888]">Painel de gestão · acesso privado</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-[#E0DBCF] shadow-sm p-8 space-y-5"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#4A4A4A] mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#E0DBCF] px-3 py-2.5 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] focus:border-transparent"
              placeholder="manager@property.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#4A4A4A] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#E0DBCF] px-3 py-2.5 pr-10 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520] focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#4A4A4A]"
                aria-label={showPass ? 'Esconder password' : 'Mostrar password'}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#DAA520] hover:bg-[#B8860B] disabled:opacity-60 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4A4A] focus-visible:ring-offset-2"
          >
            <LogIn size={16} aria-hidden />
            {loading ? 'A entrar…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
