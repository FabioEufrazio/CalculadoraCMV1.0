import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listarFornecedores,
  listarInsumos,
  listarReceitas,
  listarHistoricoBaixas,
} from '../../services/firestoreService';
import { obterStatusCMV } from '../../utils/cmvCalculations';
import {
  TrendingDown,
  BookOpen,
  Martini,
  Package,
  Truck,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  GlassWater,
} from 'lucide-react';

export default function DashboardGestao() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    suppliers: 0,
    ingredients: 0,
    lowStock: 0,
    recipes: 0,
    avgCMV: 0,
    salesCount: 0,
  });

  useEffect(() => {
    async function loadSummary() {
      const [sup, ing, rec] = await Promise.all([
        listarFornecedores(),
        listarInsumos(),
        listarReceitas(),
      ]);
      const low = ing.filter(
        (i) => (i.estoque?.quantidade_atual ?? 0) <= (i.estoque?.estoque_minimo ?? 0)
      ).length;
      const avg =
        rec.length > 0
          ? rec.reduce((acc, r) => acc + (Number(r.financeiro?.cmv_percentual) || 0), 0) /
            rec.length
          : 0;
      const logs = listarHistoricoBaixas();

      setSummary({
        suppliers: sup.length,
        ingredients: ing.length,
        lowStock: low,
        recipes: rec.length,
        avgCMV: Number(avg.toFixed(2)),
        salesCount: logs.length,
      });
    }
    loadSummary();
  }, []);

  const cmvStatus = obterStatusCMV(summary.avgCMV);

  const cards = [
    {
      title: 'Fichas Técnicas',
      description: 'Crie fichas técnicas completas com cálculo de CMV em tempo real e sugestão de preço.',
      path: '/gestao/receitas',
      icon: Martini,
      stat: `${summary.recipes} ficha(s) técnica(s)`,
      badge: 'Ativo',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Insumos & Estoque',
      description: 'Controle quantidade comprada, rendimento/aproveitamento e custo real por ml ou grama.',
      path: '/gestao/insumos',
      icon: Package,
      stat: `${summary.ingredients} insumos cadastrados`,
      badge: 'Ativo',
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      title: 'Fornecedores & Pedidos',
      description: 'Gerencie distribuidoras, prazos de entrega e dias para fazer pedidos.',
      path: '/gestao/fornecedores',
      icon: Truck,
      stat: `${summary.suppliers} fornecedores ativos`,
      badge: 'Ativo',
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      title: 'Modo Balcão (Barman)',
      description: 'Tela de consulta rápida para o barman com passos de preparo, taça e checklist de ingredientes.',
      path: '/balcao',
      icon: GlassWater,
      stat: 'Disponível no Balcão',
      badge: 'Ativo',
      color: 'text-purple-600 bg-purple-50 border-purple-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Painel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Plataforma de Gestão de Bar
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Painel de Controle Financeiro & CMV
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Visão consolidada do estoque, rendimento dos insumos e fichas técnicas dos coquetéis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {summary.lowStock > 0 && (
            <button
              type="button"
              onClick={() => navigate('/gestao/insumos')}
              className="flex items-center gap-2.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl px-4 py-3 transition cursor-pointer text-left"
            >
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-xs text-red-600 font-semibold">Alerta de Reposição</p>
                <p className="text-sm font-extrabold text-red-800">
                  {summary.lowStock} insumo(s) no mínimo
                </p>
              </div>
            </button>
          )}

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">CMV Médio do Cardápio</p>
              <p
                className="text-lg font-extrabold"
                style={{ color: cmvStatus.hex }}
              >
                {summary.avgCMV}% ({cmvStatus.label})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grade de Módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.path}
              onClick={() => navigate(card.path)}
              className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-emerald-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl border ${card.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    {card.badge}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition">
                  {card.title}
                </h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">{card.stat}</span>
                <span className="text-emerald-600 inline-flex items-center gap-1">
                  Acessar módulo
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
