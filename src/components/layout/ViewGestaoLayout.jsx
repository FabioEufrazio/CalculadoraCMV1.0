import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  Package,
  Truck,
  GlassWater,
  LogOut,
  Martini,
  ShieldCheck,
} from 'lucide-react';

/**
 * <ViewGestao> (Seção 7.1 e 7.2 da Especificação)
 * Interface clara, tabelas densas para análise de dados, sidebar esquerda.
 */
export default function ViewGestaoLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/gestao', label: 'Painel Geral CMV', icon: LayoutDashboard, end: true },
    { to: '/gestao/receitas', label: 'Fichas Técnicas', icon: BookOpen, end: false },
    { to: '/gestao/insumos', label: 'Insumos (Estoque)', icon: Package, end: false },
    { to: '/gestao/fornecedores', label: 'Fornecedores', icon: Truck, end: false },
  ];

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Sidebar Esquerda */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <div>
          {/* Topo da Sidebar */}
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Martini className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm leading-tight">
                Calculadora CMV
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
                <ShieldCheck className="w-3 h-3" /> Visão Gestor
              </span>
            </div>
          </div>

          {/* Navegação Principal */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Modo Balcão & Perfil posicionados diretamente abaixo dos itens de menu (campo indicado no print) */}
          <div className="p-3 pt-2 space-y-2.5 border-t border-slate-100 mx-3 mt-1">
            <button
              type="button"
              onClick={() => navigate('/balcao')}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <GlassWater className="w-3.5 h-3.5 text-amber-400" />
              <span>Abrir Modo Balcão</span>
            </button>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="truncate pr-2">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {user?.nome || 'Gestor'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sair da conta"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Área Principal de Conteúdo */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar de Contexto e Indicadores de CMV */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Ambiente Financeiro & Engenharia de Cardápio
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Ideal: &lt; 25%
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Aceitável: 25%–30%
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Crítico: &gt; 30%
            </span>
          </div>
        </header>

        <div className="p-6 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

