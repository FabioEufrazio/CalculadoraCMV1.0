import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { GlassWater, LogOut, ArrowLeft, UserCheck } from 'lucide-react';

/**
 * <ViewBalcao> (Seção 7.1 e 7.2 da Especificação)
 * Modo Serviço (Bartender): Dark Mode obrigatório, tipografia grande (sans-serif),
 * interface baseada em cartões e zero exposição de custos.
 */
export default function ViewBalcaoLayout() {
  const { user, isGestor, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Operacional Mobile-First Dark Mode */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <GlassWater className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                MODO SERVIÇO · BALCÃO
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Operacional Ativo
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{user?.nome || 'Bartender'}</span>
              <span className="text-slate-600">•</span>
              <span className="uppercase text-[11px] font-semibold text-slate-400">
                Ficha Operacional (Sem Custos)
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isGestor && (
            <button
              type="button"
              onClick={() => navigate('/gestao')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar à Gestão</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal do Balcão */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}

