import React, { useState, useEffect, useMemo } from 'react';
import {
  listarReceitas,
} from '../../services/firestoreService';
import { normalizeText, isGuarnicaoItem } from '../../utils/cmvCalculations';
import {
  Search,
  GlassWater,
  Martini,
  CheckSquare,
  Square,
  X,
  CheckCircle2,
  ListChecks,
  Minus,
  Plus,
} from 'lucide-react';

/**
 * Service Mode (<ViewBalcao>)
 * Guia de consulta e preparação operacional:
 * - <CocktailGrid>: Catálogo de coquetéis com busca rápida
 * - <CocktailDetail>: Modal em tela cheia com visualização clara de ingredientes,
 *   método, taça, guarnição, instruções de preparo e checklist de dosagem (zero custos).
 */
export default function BalcaoHome() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');

  // Estado do Modal Full-Screen <CocktailDetail>
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [checkedIngredients, setCheckedIngredients] = useState({});
  const [checkedSteps, setCheckedSteps] = useState({});

  async function carregarReceitas() {
    setLoading(true);
    try {
      const list = await listarReceitas();
      setRecipes(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarReceitas();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(recipes.map((r) => r.categoria).filter(Boolean));
    return ['Todos', ...Array.from(set)];
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const q = normalizeText(search);
    return recipes.filter((r) => {
      const matchesSearch =
        !q ||
        normalizeText(r.nome_coquetel).includes(q) ||
        (r.ingredientes || []).some((i) =>
          normalizeText(i.nome_exibicao).includes(q) ||
          normalizeText(i.marca).includes(q) ||
          normalizeText(i.tipo_bebida).includes(q)
        );
      const matchesCat =
        categoryFilter === 'Todos' || r.categoria === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [recipes, search, categoryFilter]);

  function openCocktailDetail(recipe) {
    setSelectedRecipe(recipe);
    setCheckedIngredients({});
    setCheckedSteps({});
  }

  function closeCocktailDetail() {
    setSelectedRecipe(null);
  }

  function toggleIngredientCheck(idx) {
    setCheckedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  }

  function toggleStepCheck(idx) {
    setCheckedSteps((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  }

  function markAllIngredients() {
    if (!selectedRecipe) return;
    const all = {};
    (selectedRecipe.ingredientes || []).forEach((_, idx) => {
      all[idx] = true;
    });
    setCheckedIngredients(all);
  }

  async function handleConfirmarPreparoEBaixa() {
    if (!selectedRecipe || processingSale) return;
    setProcessingSale(true);
    try {
      const resultado = await processarVenda(selectedRecipe.id, quantidadeVendida);
      setLastTransactionResult(resultado);
      setSalesHistory(listarHistoricoBaixas());
    } catch (err) {
      alert(`Erro ao processar baixa de estoque: ${err.message}`);
    } finally {
      setProcessingSale(false);
    }
  }

  const totalIngredientsCount = selectedRecipe?.ingredientes?.length || 0;
  const completedIngredientsCount = Object.values(checkedIngredients).filter(
    Boolean
  ).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Barra de Busca e Categorias (Mobile-First, Botões Grandes para Toque) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar coquetel ou ingrediente (ex: Margarita, Gin, Limão)..."
            className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-base font-medium text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer shrink-0 ${
                categoryFilter === cat
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* <CocktailGrid>: Grade de Cartões Operacionais (Zero Informações de Custo) */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-lg font-medium">
          Carregando estação de coquetéis...
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="py-16 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
          Nenhum coquetel encontrado para o filtro selecionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => openCocktailDetail(recipe)}
              className="group bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/60 rounded-2xl overflow-hidden shadow-lg transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="h-52 bg-slate-950 relative overflow-hidden flex items-center justify-center">
                  {recipe.foto_url ? (
                    <img
                      src={recipe.foto_url}
                      alt={recipe.nome_coquetel}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : null}

                  {/* Ícone vazio quando não há foto cadastrada */}
                  <div
                    className={`flex flex-col items-center justify-center w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 text-slate-600 pb-12 ${
                      recipe.foto_url ? 'hidden' : ''
                    }`}
                  >
                    <Martini className="w-16 h-16 stroke-[1.2] text-slate-700 group-hover:text-amber-400/80 transition duration-300" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-2">
                      Sem foto
                    </span>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500 text-slate-950">
                      {recipe.categoria}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                      {recipe.nome_coquetel}
                    </h3>
                    <p className="text-xs sm:text-sm text-amber-300 font-semibold mt-0.5">
                      {recipe.metodo_preparo} • Taça {recipe.copo}
                    </p>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(recipe.ingredientes || []).map((ing, idx) => {
                      const isGarnish = isGuarnicaoItem(ing);
                      return (
                        <span
                          key={idx}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                            isGarnish
                              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          {isGarnish ? '🍃 ' : ''}
                          {ing.quantidade_usada}{' '}
                          {ing.unidade_medida === 'meia_un' ? '1/2 un' : ing.unidade_medida} {ing.nome_exibicao}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-800/80 bg-slate-950/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Guarnição: <strong className="text-slate-200">{recipe.guarnicao || 'Padrão'}</strong>
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 group-hover:translate-x-1 transition">
                  Abrir Preparo →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================================================================== */}
      {/* Modal de Detalhes do Coquetel (Modo Balcão)                          */}
      {/* ===================================================================== */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 overflow-y-auto flex flex-col">
          {/* Topbar do Modal Full-Screen */}
          <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold shadow-lg shadow-amber-500/20 overflow-hidden shrink-0 border border-amber-400/40">
                {selectedRecipe.foto_url ? (
                  <img
                    src={selectedRecipe.foto_url}
                    alt={selectedRecipe.nome_coquetel}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : null}
                <div className={`flex items-center justify-center w-full h-full ${selectedRecipe.foto_url ? 'hidden' : ''}`}>
                  <Martini className="w-7 h-7" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {selectedRecipe.categoria}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    Taça: {selectedRecipe.copo}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
                  {selectedRecipe.nome_coquetel}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={closeCocktailDetail}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
              <span>Fechar</span>
            </button>
          </div>

          {/* Corpo do Modal Full-Screen */}
          <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-6">
            {/* Metadados Rápidos de Serviço */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <p className="text-xs uppercase font-bold text-slate-400">
                  Método de Preparo
                </p>
                <p className="text-base sm:text-lg font-extrabold text-white mt-1">
                  {selectedRecipe.metodo_preparo}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <p className="text-xs uppercase font-bold text-slate-400">
                  Serviço / Copo
                </p>
                <p className="text-base sm:text-lg font-extrabold text-amber-400 mt-1">
                  {selectedRecipe.copo}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <p className="text-xs uppercase font-bold text-slate-400">
                  Guarnição Final
                </p>
                <p className="text-base sm:text-lg font-extrabold text-emerald-400 mt-1">
                  {selectedRecipe.guarnicao || 'Padrão'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Coluna Esquerda: Ingredientes */}
              <div className="lg:col-span-7 space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                      <ListChecks className="w-6 h-6 text-amber-400" />
                      <span>Ingredientes e Doses</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                      Marque conforme for adicionando ({completedIngredientsCount}/{totalIngredientsCount} conferidos).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={markAllIngredients}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 transition cursor-pointer"
                  >
                    Marcar Todos
                  </button>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{
                      width: `${
                        totalIngredientsCount > 0
                          ? (completedIngredientsCount / totalIngredientsCount) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>

                {/* Lista de Insumos */}
                <div className="space-y-3 pt-2">
                  {(selectedRecipe.ingredientes || []).map((ing, idx) => {
                    const isChecked = Boolean(checkedIngredients[idx]);
                    const isGarnish = isGuarnicaoItem(ing);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleIngredientCheck(idx)}
                        className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-4 transition cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                            : isGarnish
                            ? 'bg-emerald-950/25 hover:bg-emerald-950/40 border-emerald-500/40 text-emerald-100 shadow-xs'
                            : 'bg-slate-950 hover:bg-slate-950/70 border-slate-800 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {isChecked ? (
                            <CheckSquare className="w-7 h-7 text-emerald-400 shrink-0" />
                          ) : isGarnish ? (
                            <Square className="w-7 h-7 text-emerald-400/80 shrink-0" />
                          ) : (
                            <Square className="w-7 h-7 text-slate-500 shrink-0" />
                          )}
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <p
                              className={`text-lg sm:text-xl font-extrabold ${
                                isChecked
                                  ? 'line-through opacity-75'
                                  : isGarnish
                                  ? 'text-emerald-100'
                                  : 'text-white'
                              }`}
                            >
                              {ing.nome_exibicao}
                            </p>
                            {isGarnish && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                🍃 Guarnição
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          className={`px-4 py-2 rounded-xl text-right shrink-0 border ${
                            isGarnish
                              ? 'bg-emerald-900/40 border-emerald-600/50'
                              : 'bg-slate-900 border-slate-700'
                          }`}
                        >
                          <span
                            className={`text-xl sm:text-2xl font-extrabold ${
                              isGarnish ? 'text-emerald-300' : 'text-amber-400'
                            }`}
                          >
                            {ing.quantidade_usada}
                          </span>
                          <span
                            className={`text-sm font-bold ml-1 ${
                              isGarnish ? 'text-emerald-100' : 'text-slate-300'
                            }`}
                          >
                            {ing.unidade_medida === 'meia_un' ? '1/2 un' : ing.unidade_medida}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Coluna Direita: Modo de Preparo */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg sm:text-xl font-extrabold text-white">
                  Instruções de Preparo
                </h3>

                <div className="space-y-3">
                  {(selectedRecipe.instrucoes_preparo || []).map((step, idx) => {
                    const done = Boolean(checkedSteps[idx]);
                    const stepText = (step || '').trim();
                    const displayStep = /^\d+[\.\-\)]/.test(stepText)
                      ? stepText
                      : `${idx + 1}. ${stepText}`;
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleStepCheck(idx)}
                        className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                          done
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200 line-through opacity-80'
                            : 'bg-slate-950 border-slate-800 text-slate-200'
                        }`}
                      >
                        {done ? (
                          <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                        )}
                        <p className="text-base font-medium leading-relaxed">{displayStep}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
