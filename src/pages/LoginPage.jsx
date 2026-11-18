import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isFirebaseConfigured } from '../firebase/firebaseConfig';
import {
  Martini,
  Lock,
  Mail,
  ShieldAlert,
  Briefcase,
  GlassWater,
  ArrowRight,
  Database,
} from 'lucide-react';

export default function LoginPage() {
  const { login, loginQuickProfile, authError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError('');
    setSubmitting(true);
    try {
      const loggedUser = await login(email, password);
      navigate(loggedUser.role === 'gestor' ? '/gestao' : '/balcao', { replace: true });
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleQuickLogin(role) {
    const loggedUser = loginQuickProfile(role);
    navigate(loggedUser.role === 'gestor' ? '/gestao' : '/balcao', { replace: true });
  }

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decorativo sutil */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
        {/* Cabeçalho da Marca */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
            <Martini className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Calculadora CMV <span className="text-emerald-400">1.0</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Plataforma de Gestão de Bar, Estoque & Fichas Técnicas
          </p>
        </div>

        {/* Alerta de erro */}
        {displayError && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-xs leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{displayError}</span>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              E-mail Corporativo
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gestor@bar.com ou carlos@bar.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <span>{submitting ? 'Autenticando...' : 'Entrar na Plataforma'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Seletor rápido de perfis para teste imediato das Views (Gestor vs Bartender) */}
        <div className="mt-7 pt-6 border-t border-slate-800/80">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center mb-3">
            Acesso Rápido por Perfil (Homologação)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleQuickLogin('gestor')}
              className="flex flex-col items-center p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 hover:border-emerald-500/50 transition text-left group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Modo Gestor</span>
              <span className="text-[11px] text-slate-400">Financeiro & CMV</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('bartender')}
              className="flex flex-col items-center p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 hover:border-amber-500/50 transition text-left group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
                <GlassWater className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Modo Bartender</span>
              <span className="text-[11px] text-slate-400">Service Mode (Dark)</span>
            </button>
          </div>
        </div>

        {/* Rodapé de status do Firebase */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <Database className="w-3.5 h-3.5 text-emerald-500" />
          <span>
            {isFirebaseConfigured
              ? 'Firebase Auth & Firestore Conectados'
              : 'Ambiente Híbrido Ativo (Firebase SDK + Demo Local)'}
          </span>
        </div>
      </div>
    </div>
  );
}

