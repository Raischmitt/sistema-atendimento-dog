'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, autenticado } = useAuthStore();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  // Se já estiver logado, redireciona para a home (PDV)
  useEffect(() => {
    if (autenticado) {
      router.push('/');
    }
  }, [autenticado, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!email.trim() || !senha.trim()) {
      setErro('Preencha seu e-mail e sua senha.');
      return;
    }

    setCarregando(true);

    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const data = await res.json();

      if (!res.ok || !data.sucesso) {
        setErro(data.mensagem || 'Falha ao autenticar.');
        setCarregando(false);
        return;
      }

      // Salva na store e cookies
      login(data.token, data.usuario);
      router.push('/');
    } catch (err) {
      console.error(err);
      setErro('Não foi possível conectar ao servidor. Verifique se o backend está ligado na porta 4000.');
      setCarregando(false);
    }
  };

  const preencherAdmin = () => {
    setEmail('admin@doghouse.com');
    setSenha('admin123');
    setErro('');
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-zinc-950 px-4 font-sans text-zinc-100">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-md">
        
        {/* Logo / Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-3xl shadow-lg shadow-amber-600/30">
            🌭
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">DOG HOUSE</h1>
          <p className="text-xs text-zinc-400">Sistema Integrado de PDV, Delivery & Gestão</p>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
          <div className="mb-6 rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-xs font-semibold text-red-400 animate-in fade-in">
            ⚠️ {erro}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              E-mail de Acesso
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@doghouse.com"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-3 text-xs font-medium text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-3 text-xs font-medium text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-3 text-xs text-zinc-400 hover:text-zinc-200"
              >
                {mostrarSenha ? '👁️' : '🔒'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-amber-600/30 transition hover:from-amber-500 hover:to-amber-400 active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {carregando ? 'Validando Acesso...' : 'Entrar no Sistema'}
          </button>
        </form>

        {/* Botão de Preenchimento Rápido do Admin para Testes */}
        <div className="mt-6 pt-6 border-t border-zinc-800/80 text-center">
          <button
            type="button"
            onClick={preencherAdmin}
            className="text-[11px] font-semibold text-zinc-400 hover:text-amber-400 underline decoration-zinc-700 underline-offset-4 transition"
          >
            🔑 Usar credenciais de Administrador de teste
          </button>
        </div>

      </div>
    </div>
  );
}