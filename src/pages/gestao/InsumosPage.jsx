import React, { useState, useEffect, useMemo } from 'react';
import {
  listarInsumos,
  salvarInsumo,
  excluirInsumo,
  atualizarEstoqueInsumo,
  listarFornecedores,
  listarCategorias,
  salvarCategoria,
  excluirCategoria,
  listarUnidades,
  salvarUnidade,
  excluirUnidade,
  INITIAL_BEVERAGE_TYPES,
} from '../../services/firestoreService';
import {
  calcularYield,
  calcularVolumeUtilizavel,
  calcularCustoPorUnidadeBase,
  calcularCustoParcial,
  normalizeText,
} from '../../utils/cmvCalculations';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Trash2,
  X,
  Calculator,
  ArrowUpDown,
  Settings2,
  Tag,
  Scale,
  FlaskConical,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

const EMPTY_INGREDIENT = {
  id: '',
  nome: '',
  categoria: 'Destilado',
  tipo_bebida: '',
  marca: '',
  is_padrao_tipo: false,
  tipo: 'simples', // 'simples' ou 'preparado'
  fornecedor_id: '',
  unidade_medida_base: 'ml',
  compra: {
    preco_embalagem: '',
    volume_comprado: '',
    unidade_compra: 'ml',
  },
  rendimento: {
    percentual_yield: 100,
    volume_final_utilizavel: '',
  },
  custos_calculados: {
    custo_por_ml_g: 0,
  },
  estoque: {
    quantidade_atual: '',
    estoque_minimo: '',
  },
  equivalencias: {
    unidade_g: '',
    meia_unidade_g: '',
    rodela_g: '',
    fatia_g: '',
    gomo_g: '',
    zest_g: '',
    folha_g: '',
    ramo_g: '',
  },
  ingredientes_base: [],
  instrucoes_preparo: '',
};

export default function InsumosPage() {
  const [ingredients, setIngredients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [typeFilter, setTypeFilter] = useState('todos'); // 'todos', 'simples', 'preparado'
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [expandedRecipeId, setExpandedRecipeId] = useState(null);

  // Modal de Criação / Edição do Insumo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_INGREDIENT);
  const [saving, setSaving] = useState(false);

  // Modal de Gerenciamento de Categorias & Unidades
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configTab, setConfigTab] = useState('categorias'); // 'categorias' ou 'unidades'
  const [newCatName, setNewCatName] = useState('');
  const [newUnitLabel, setNewUnitLabel] = useState('');
  const [newUnitAbbr, setNewUnitAbbr] = useState('');

  async function carregarDados() {
    setLoading(true);
    try {
      const [ingList, supList] = await Promise.all([
        listarInsumos(),
        listarFornecedores(),
      ]);
      setIngredients(ingList);
      setSuppliers(supList);
      setCategories(listarCategorias());
      setUnits(listarUnidades());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const suppliersMap = useMemo(() => {
    const map = {};
    suppliers.forEach((s) => {
      map[s.id] = s.nome_empresa;
    });
    return map;
  }, [suppliers]);

  const ingredientsMap = useMemo(() => {
    const map = {};
    ingredients.forEach((i) => {
      map[i.id] = i;
    });
    return map;
  }, [ingredients]);

  const counts = useMemo(() => {
    const total = ingredients.length;
    const simples = ingredients.filter((i) => (i.tipo || 'simples') === 'simples').length;
    const preparados = ingredients.filter((i) => i.tipo === 'preparado').length;
    const lowStock = ingredients.filter(
      (i) => (Number(i.estoque?.quantidade_atual) || 0) <= (Number(i.estoque?.estoque_minimo) || 0)
    ).length;
    return { total, simples, preparados, lowStock };
  }, [ingredients]);

  const filteredIngredients = useMemo(() => {
    const q = normalizeText(search);
    return ingredients.filter((ing) => {
      const matchesSearch =
        !q ||
        normalizeText(ing.nome).includes(q) ||
        normalizeText(ing.categoria).includes(q) ||
        normalizeText(ing.marca).includes(q) ||
        normalizeText(ing.tipo_bebida).includes(q);
      const matchesCategory =
        categoryFilter === 'Todas' || ing.categoria === categoryFilter;
      const ingTipo = ing.tipo || 'simples';
      const matchesType =
        typeFilter === 'todos' || ingTipo === typeFilter;
      const isLow =
        (Number(ing.estoque?.quantidade_atual) || 0) <= (Number(ing.estoque?.estoque_minimo) || 0);
      const matchesLowStock = !onlyLowStock || isLow;

      return matchesSearch && matchesCategory && matchesType && matchesLowStock;
    });
  }, [ingredients, search, categoryFilter, typeFilter, onlyLowStock]);

  function openNewModal(tipo = 'simples') {
    const defaultCat =
      tipo === 'preparado'
        ? categories.find((c) => c.toLowerCase().includes('xarope')) || 'Xarope'
        : categories[0] || 'Destilado';

    setFormData({
      ...EMPTY_INGREDIENT,
      tipo,
      categoria: defaultCat,
      tipo_bebida: '',
      marca: '',
      is_padrao_tipo: false,
      unidade_medida_base: 'ml',
      compra: {
        preco_embalagem: '',
        volume_comprado: '',
        unidade_compra: 'ml',
      },
      rendimento: {
        percentual_yield: 100,
        volume_final_utilizavel: '',
      },
      fornecedor_id: tipo === 'simples' ? suppliers[0]?.id || '' : '',
      ingredientes_base: tipo === 'preparado' ? [] : [],
      instrucoes_preparo: '',
      equivalencias: {
        unidade_g: '',
        meia_unidade_g: '',
        rodela_g: '',
        fatia_g: '',
        gomo_g: '',
        zest_g: '',
        folha_g: '',
        ramo_g: '',
      },
    });
    setIsModalOpen(true);
  }

  function openEditModal(ing) {
    const isPrep = ing.tipo === 'preparado' || (ing.ingredientes_base && ing.ingredientes_base.length > 0);
    setFormData({
      id: ing.id,
      nome: ing.nome || '',
      categoria: ing.categoria || categories[0] || 'Destilado',
      tipo_bebida: ing.tipo_bebida || '',
      marca: ing.marca || '',
      is_padrao_tipo: Boolean(ing.is_padrao_tipo),
      tipo: isPrep ? 'preparado' : 'simples',
      fornecedor_id: ing.fornecedor_id || '',
      unidade_medida_base: ing.unidade_medida_base || 'ml',
      compra: {
        preco_embalagem: ing.compra?.preco_embalagem ?? '',
        volume_comprado: ing.compra?.volume_comprado ?? '',
        unidade_compra: ing.compra?.unidade_compra || 'ml',
      },
      rendimento: {
        percentual_yield: ing.rendimento?.percentual_yield ?? 100,
        volume_final_utilizavel: ing.rendimento?.volume_final_utilizavel ?? '',
      },
      custos_calculados: {
        custo_por_ml_g: ing.custos_calculados?.custo_por_ml_g ?? 0,
      },
      estoque: {
        quantidade_atual: ing.estoque?.quantidade_atual ?? '',
        estoque_minimo: ing.estoque?.estoque_minimo ?? '',
      },
      equivalencias: {
        unidade_g: ing.equivalencias?.unidade_g ?? '',
        meia_unidade_g: ing.equivalencias?.meia_unidade_g ?? '',
        rodela_g: ing.equivalencias?.rodela_g ?? '',
        fatia_g: ing.equivalencias?.fatia_g ?? '',
        gomo_g: ing.equivalencias?.gomo_g ?? '',
        zest_g: ing.equivalencias?.zest_g ?? '',
        folha_g: ing.equivalencias?.folha_g ?? '',
        ramo_g: ing.equivalencias?.ramo_g ?? '',
      },
      ingredientes_base: Array.isArray(ing.ingredientes_base) ? ing.ingredientes_base : [],
      instrucoes_preparo: ing.instrucoes_preparo || '',
    });
    setIsModalOpen(true);
  }

  // Tratamento de cálculo financeiro para Insumo Simples
  function handleFinancialChange(field, rawValue) {
    const rawClean = rawValue === '' ? '' : rawValue;
    const numValue = rawClean === '' ? 0 : Number(rawClean);

    setFormData((prev) => {
      let preco = prev.compra.preco_embalagem;
      let volComprado = prev.compra.volume_comprado;
      let yieldPct = prev.rendimento.percentual_yield;
      let volExtraido = prev.rendimento.volume_final_utilizavel;

      if (field === 'preco_embalagem') {
        preco = rawClean;
      } else if (field === 'volume_comprado') {
        volComprado = rawClean;
        if (numValue > 0 && Number(yieldPct) > 0) {
          volExtraido = calcularVolumeUtilizavel(numValue, Number(yieldPct));
        }
      } else if (field === 'volume_final_utilizavel') {
        volExtraido = rawClean;
        if (numValue > 0 && Number(volComprado) > 0) {
          yieldPct = calcularYield(numValue, Number(volComprado));
        }
      } else if (field === 'percentual_yield') {
        yieldPct = rawClean;
        if (numValue > 0 && Number(volComprado) > 0) {
          volExtraido = calcularVolumeUtilizavel(Number(volComprado), numValue);
        }
      }

      const nPreco = Number(preco) || 0;
      const nExtraido = Number(volExtraido) || 0;
      const custoUnitario = calcularCustoPorUnidadeBase(nPreco, nExtraido);

      return {
        ...prev,
        compra: {
          ...prev.compra,
          preco_embalagem: preco,
          volume_comprado: volComprado,
        },
        rendimento: {
          percentual_yield: yieldPct,
          volume_final_utilizavel: volExtraido,
        },
        custos_calculados: {
          custo_por_ml_g: custoUnitario,
        },
      };
    });
  }

  // Funções para Insumos Compostos / Artesanais (Xaropes, Pré-mixes)
  function handleAddBaseItem() {
    // Escolhe primeiro ingrediente disponível que não seja o próprio insumo
    const available = ingredients.filter((i) => i.id !== formData.id);
    const first = available[0];
    if (!first) {
      alert('Cadastre primeiro alguns insumos simples (ex: açúcar, água, frutas) para utilizá-los na composição.');
      return;
    }

    const defaultCusto = Number(first.custos_calculados?.custo_por_ml_g || 0);

    setFormData((prev) => {
      const novos = [
        ...prev.ingredientes_base,
        {
          insumo_id: first.id,
          nome: first.nome,
          quantidade: '',
          unidade: first.unidade_medida_base || 'ml',
          custo_unitario: defaultCusto,
          custo_parcial: 0,
        },
      ];
      return recalculatePreparedBatch(prev, novos, prev.rendimento.volume_final_utilizavel);
    });
  }

  function handleUpdateBaseItem(index, field, value) {
    setFormData((prev) => {
      const novos = [...prev.ingredientes_base];
      const item = { ...novos[index] };

      if (field === 'insumo_id') {
        const found = ingredientsMap[value];
        if (found) {
          item.insumo_id = found.id;
          item.nome = found.nome;
          item.unidade = found.unidade_medida_base || 'ml';
          item.custo_unitario = Number(found.custos_calculados?.custo_por_ml_g || 0);
          const qtd = Number(item.quantidade) || 0;
          item.custo_parcial = qtd * item.custo_unitario;
        }
      } else if (field === 'quantidade') {
        item.quantidade = value;
        const qtd = value === '' ? 0 : Number(value);
        item.custo_parcial = qtd * Number(item.custo_unitario || 0);
      }

      novos[index] = item;
      return recalculatePreparedBatch(prev, novos, prev.rendimento.volume_final_utilizavel);
    });
  }

  function handleRemoveBaseItem(index) {
    setFormData((prev) => {
      const novos = prev.ingredientes_base.filter((_, i) => i !== index);
      return recalculatePreparedBatch(prev, novos, prev.rendimento.volume_final_utilizavel);
    });
  }

  function handleBatchYieldChange(rawValue) {
    const rawClean = rawValue === '' ? '' : rawValue;
    setFormData((prev) => recalculatePreparedBatch(prev, prev.ingredientes_base, rawClean));
  }

  function recalculatePreparedBatch(prev, baseList, volumeRendimento) {
    const totalCustoBatelada = baseList.reduce(
      (acc, item) => acc + (Number(item.custo_parcial) || 0),
      0
    );
    const volNum = volumeRendimento === '' ? 0 : Number(volumeRendimento);
    const custoPorUnidade = volNum > 0 ? totalCustoBatelada / volNum : 0;

    return {
      ...prev,
      ingredientes_base: baseList,
      compra: {
        preco_embalagem: totalCustoBatelada,
        volume_comprado: volumeRendimento,
        unidade_compra: prev.unidade_medida_base || 'ml',
      },
      rendimento: {
        percentual_yield: 100,
        volume_final_utilizavel: volumeRendimento,
      },
      custos_calculados: {
        custo_por_ml_g: custoPorUnidade,
      },
    };
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!formData.nome.trim()) return;

    if (formData.tipo === 'preparado' && formData.ingredientes_base.length === 0) {
      alert('Adicione pelo menos um ingrediente base na composição deste preparo artesanal.');
      return;
    }

    setSaving(true);
    try {
      await salvarInsumo({
        ...formData,
        tipo: formData.tipo,
        compra: {
          ...formData.compra,
          preco_embalagem: Number(formData.compra.preco_embalagem) || 0,
          volume_comprado: Number(formData.compra.volume_comprado) || 0,
        },
        rendimento: {
          percentual_yield: Number(formData.rendimento.percentual_yield) || 100,
          volume_final_utilizavel: Number(formData.rendimento.volume_final_utilizavel) || 0,
        },
        estoque: {
          quantidade_atual: Number(formData.estoque.quantidade_atual) || 0,
          estoque_minimo: Number(formData.estoque.estoque_minimo) || 0,
        },
        custos_calculados: {
          custo_por_ml_g: Number(formData.custos_calculados.custo_por_ml_g) || 0,
        },
        equivalencias: formData.equivalencias || {},
      });
      await carregarDados();
      setIsModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ing) {
    if (!window.confirm(`Deseja realmente excluir o insumo "${ing.nome}"?`)) return;
    await excluirInsumo(ing.id);
    await carregarDados();
  }

  async function handleQuickStockAdjust(ing, delta) {
    const atual = Number(ing.estoque?.quantidade_atual) || 0;
    const novo = Math.max(0, atual + delta);
    await atualizarEstoqueInsumo(ing.id, novo);
    await carregarDados();
  }

  function handleAddCategory(e) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const updated = salvarCategoria(newCatName.trim());
    setCategories(updated);
    setNewCatName('');
  }

  function handleDeleteCategory(catName) {
    if (!window.confirm(`Deseja remover a categoria "${catName}"?`)) return;
    const updated = excluirCategoria(catName);
    setCategories(updated);
  }

  function handleAddUnit(e) {
    e.preventDefault();
    if (!newUnitLabel.trim() || !newUnitAbbr.trim()) return;
    const updated = salvarUnidade({
      label: newUnitLabel.trim(),
      abreviacao: newUnitAbbr.trim(),
    });
    setUnits(updated);
    setNewUnitLabel('');
    setNewUnitAbbr('');
  }

  function handleDeleteUnit(unitId) {
    if (!window.confirm(`Deseja remover esta unidade de medida?`)) return;
    const updated = excluirUnidade(unitId);
    setUnits(updated);
  }

  const isPrepared = formData.tipo === 'preparado';
  const totalBatchCost = isPrepared
    ? formData.ingredientes_base.reduce((sum, item) => sum + (Number(item.custo_parcial) || 0), 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <Package className="w-4 h-4" />
            <span>Estoque & Ingredientes</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Gestão de Insumos, Rendimento & Estoque
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cadastre insumos comprados ou crie preparos artesanais (xaropes, cordiais, pré-mixes) com cálculo automático de custo por ml/g.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-sm flex items-center gap-2 transition cursor-pointer"
            title="Categorias e Unidades de Medida"
          >
            <Settings2 className="w-4 h-4 text-slate-500" />
            <span>Categorias & Unidades</span>
          </button>

          <button
            type="button"
            onClick={() => openNewModal('preparado')}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <FlaskConical className="w-4 h-4" />
            <span>+ Insumo Artesanal / Xarope</span>
          </button>

          <button
            type="button"
            onClick={() => openNewModal('simples')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Insumo Comprado</span>
          </button>
        </div>
      </div>

      {/* Filtros e Abas de Tipo */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar insumo por nome ou categoria..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
          />
        </div>

        {/* Segmented Filtro por Tipo */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 shrink-0">
          <button
            type="button"
            onClick={() => setTypeFilter('todos')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              typeFilter === 'todos' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            Todos ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('simples')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              typeFilter === 'simples' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-slate-500" />
            <span>Comprados ({counts.simples})</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('preparado')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              typeFilter === 'preparado' ? 'bg-white text-purple-700 shadow-xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
            <span>Artesanais ({counts.preparados})</span>
          </button>
        </div>

        {/* Categoria & Alerta de Baixo Estoque */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="Todas">Todas as Categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
              onlyLowStock
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Abaixo do Mínimo ({counts.lowStock})</span>
          </button>
        </div>
      </div>

      {/* Tabela Densa de Insumos */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Insumo / Categoria</th>
                <th className="py-3.5 px-4">Fornecedor / Origem</th>
                <th className="py-3.5 px-4">Compra / Batelada</th>
                <th className="py-3.5 px-4">Rendimento & Volume Útil</th>
                <th className="py-3.5 px-4">Custo / ml ou g</th>
                <th className="py-3.5 px-4">Estoque Atual</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Carregando insumos e estoque...
                  </td>
                </tr>
              ) : filteredIngredients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Nenhum insumo encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredIngredients.map((ing) => {
                  const qtdAtual = Number(ing.estoque?.quantidade_atual) || 0;
                  const qtdMin = Number(ing.estoque?.estoque_minimo) || 0;
                  const isLowStock = qtdAtual <= qtdMin;
                  const custoUnit = Number(ing.custos_calculados?.custo_por_ml_g || 0);
                  const isItemPrepared = ing.tipo === 'preparado';
                  const baseIngredientsCount = ing.ingredientes_base?.length || 0;
                  const isExpanded = expandedRecipeId === ing.id;

                  return (
                    <React.Fragment key={ing.id}>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900">{ing.nome}</p>
                            {isItemPrepared ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                                <FlaskConical className="w-3 h-3" />
                                Artesanal
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                Comprado
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {ing.tipo_bebida && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                🍸 Tipo: {ing.tipo_bebida}
                              </span>
                            )}
                            {ing.marca && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                Rótulo: {ing.marca}
                              </span>
                            )}
                            {ing.is_padrao_tipo && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                                ⭐ Padrão da Casa
                              </span>
                            )}
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {ing.categoria}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              Base: {ing.unidade_medida_base}
                            </span>

                            {isItemPrepared && baseIngredientsCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedRecipeId(isExpanded ? null : ing.id)}
                                className="text-[11px] text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <span>{baseIngredientsCount} ingredientes base</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                          {isItemPrepared ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold">
                              🏠 Produção Própria (Bar)
                            </span>
                          ) : (
                            suppliersMap[ing.fornecedor_id] || 'Não vinculado'
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          {isItemPrepared ? (
                            <div>
                              <p className="font-bold text-slate-800">
                                Batelada: R$ {Number(ing.compra?.preco_embalagem || 0).toFixed(2)}
                              </p>
                              <p className="text-slate-500">
                                rende {ing.rendimento?.volume_final_utilizavel} {ing.unidade_medida_base}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-bold text-slate-800">
                                R$ {Number(ing.compra?.preco_embalagem || 0).toFixed(2)}
                              </p>
                              <p className="text-slate-500">
                                por {ing.compra?.volume_comprado} {ing.compra?.unidade_compra}
                              </p>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          {isItemPrepared ? (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Lote Útil: {ing.rendimento?.volume_final_utilizavel} {ing.unidade_medida_base}
                              </span>
                              <p className="text-slate-500 mt-1">100% aproveitamento</p>
                            </div>
                          ) : (
                            <div>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold ${
                                  (Number(ing.rendimento?.percentual_yield) || 100) < 100
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                Rendimento: {ing.rendimento?.percentual_yield}%
                              </span>
                              <p className="text-slate-500 mt-1">
                                Aproveitamento: <strong>{ing.rendimento?.volume_final_utilizavel}</strong>{' '}
                                {ing.unidade_medida_base}
                              </p>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className={`inline-flex flex-col px-2.5 py-1 rounded-xl border ${
                            isItemPrepared
                              ? 'bg-purple-50/80 border-purple-200'
                              : 'bg-emerald-50/80 border-emerald-200'
                          }`}>
                            <span className={`text-xs font-extrabold ${isItemPrepared ? 'text-purple-800' : 'text-emerald-800'}`}>
                              R$ {custoUnit.toFixed(4)} / {ing.unidade_medida_base}
                            </span>
                            <span className={`text-[10px] font-medium ${isItemPrepared ? 'text-purple-600' : 'text-emerald-600'}`}>
                              Dose 20{ing.unidade_medida_base}: R$ {calcularCustoParcial(custoUnit, 20).toFixed(2)}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                {isLowStock ? (
                                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                )}
                                <span
                                  className={`font-bold text-xs ${
                                    isLowStock ? 'text-red-600' : 'text-slate-900'
                                  }`}
                                >
                                  {qtdAtual} {ing.unidade_medida_base}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                Mín: {qtdMin} {ing.unidade_medida_base}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 ml-1">
                              <button
                                type="button"
                                onClick={() => handleQuickStockAdjust(ing, -100)}
                                title="Baixar 100 unidades"
                                className="px-1.5 py-0.5 text-[11px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                              >
                                -100
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickStockAdjust(ing, 500)}
                                title="Adicionar 500 unidades"
                                className="px-1.5 py-0.5 text-[11px] font-bold rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 cursor-pointer"
                              >
                                +500
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(ing)}
                              title="Editar insumo"
                              className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(ing)}
                              title="Excluir insumo"
                              className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Linha expansível para insumos artesanais detalhando a receita */}
                      {isExpanded && isItemPrepared && (
                        <tr className="bg-purple-50/40">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="p-4 rounded-xl bg-white border border-purple-200 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                                  <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                                  Receita e Ingredientes da Batelada ({ing.nome})
                                </h4>
                                <span className="text-xs font-bold text-slate-600">
                                  Volume Produzido: {ing.rendimento?.volume_final_utilizavel} {ing.unidade_medida_base}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {ing.ingredientes_base?.map((base, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                                  >
                                    <div>
                                      <p className="font-bold text-slate-800">{base.nome}</p>
                                      <p className="text-[11px] text-slate-500">
                                        {base.quantidade} {base.unidade}
                                      </p>
                                    </div>
                                    <span className="font-extrabold text-slate-700">
                                      R$ {Number(base.custo_parcial || 0).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {ing.instrucoes_preparo && (
                                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                                  <strong className="text-slate-800">Modo de preparo / Armazenamento:</strong> {ing.instrucoes_preparo}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição do Insumo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  {formData.id ? 'Editar Insumo' : 'Cadastrar Insumo'}
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    isPrepared ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {isPrepared ? '🧪 Artesanal / Preparado' : '📦 Comprado'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  {isPrepared
                    ? 'Combine insumos existentes (açúcar, água, frutas) para calcular o custo exato do preparo da casa.'
                    : 'Configure o preço de compra e rendimento de garrafas e matérias-primas adquiridas de fornecedores.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alternador de Tipo de Insumo (Comprado vs Artesanal) */}
            <div className="px-6 pt-4 shrink-0">
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, tipo: 'simples' }))}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    !isPrepared
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Insumo Comprado (Garrafa / Fornecedor)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, tipo: 'preparado' }))}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    isPrepared
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FlaskConical className="w-4 h-4" />
                  <span>Insumo Artesanal (Xarope, Pré-mix, Cordial)</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Bloco 1: Identificação e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Nome Completo do Insumo (comercial) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder={
                      isPrepared
                        ? 'Ex: Xarope Simples 1:1, Cordial de Gengibre, Pré-mix Sour'
                        : "Ex: Gin Tanqueray London Dry 750ml, Vodka Absolut 1L, Limão Tahiti"
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Categoria Geral
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setConfigTab('categorias');
                        setIsConfigModalOpen(true);
                      }}
                      className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Gerenciar
                    </button>
                  </div>
                  <select
                    value={formData.categoria}
                    onChange={(e) =>
                      setFormData({ ...formData, categoria: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bloco de Associação: Tipo de Bebida na Receita vs Rótulo Comercial */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    🍸 Tipo de Bebida na Receita vs Rótulo Comercial
                  </span>
                  <span className="text-[11px] text-blue-700 font-medium">
                    Na Ficha Técnica vai o <strong>Tipo</strong>, o bar escolhe o <strong>Rótulo</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipo de Bebida (Usado na Receita do Drinque) *
                    </label>
                    <input
                      type="text"
                      list="tipos-bebidas-list"
                      value={formData.tipo_bebida || ''}
                      onChange={(e) => setFormData({ ...formData, tipo_bebida: e.target.value })}
                      placeholder="Ex: Gin London Dry, Vodka, Rum Branco, Tequila..."
                      className="w-full px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <datalist id="tipos-bebidas-list">
                      {INITIAL_BEVERAGE_TYPES.map((tipo) => (
                        <option key={tipo} value={tipo} />
                      ))}
                    </datalist>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Ex: se for Gin, coloque <strong>Gin London Dry</strong>. Na receita você chamará por este Tipo.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Marca / Rótulo Comercial
                    </label>
                    <input
                      type="text"
                      value={formData.marca || ''}
                      onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                      placeholder="Ex: Tanqueray, Gordon's, Absolut, Smirnoff, Bacardi..."
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                    <div className="mt-2.5">
                      <label className="flex items-center gap-2 text-xs font-bold text-blue-950 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(formData.is_padrao_tipo)}
                          onChange={(e) =>
                            setFormData({ ...formData, is_padrao_tipo: e.target.checked })
                          }
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        />
                        <span>⭐ Definir como Marca Padrão da Casa (Speed Rail)</span>
                      </label>
                      <p className="text-[10px] text-blue-700 mt-0.5 pl-6">
                        Ao selecionar este Tipo de bebida em uma receita, este rótulo será usado por padrão para o CMV.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Se for Comprado: Seleção de Fornecedor e Unidade Base */}
              {!isPrepared ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Fornecedor Principal
                    </label>
                    <select
                      value={formData.fornecedor_id}
                      onChange={(e) =>
                        setFormData({ ...formData, fornecedor_id: e.target.value })
                      }
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    >
                      <option value="">Selecione um fornecedor...</option>
                      {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.nome_empresa}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Unidade Base na Receita (Uso)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setConfigTab('unidades');
                          setIsConfigModalOpen(true);
                        }}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> Gerenciar
                      </button>
                    </div>
                    <select
                      value={formData.unidade_medida_base}
                      onChange={(e) =>
                        setFormData({ ...formData, unidade_medida_base: e.target.value })
                      }
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    >
                      {units.map((u) => (
                        <option key={u.id} value={u.abreviacao}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Origem / Produção
                    </label>
                    <div className="px-3.5 py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-800 flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-purple-600" />
                      <span>Produção Própria / Preparado da Casa</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Unidade Base Produzida
                      </label>
                    </div>
                    <select
                      value={formData.unidade_medida_base}
                      onChange={(e) =>
                        setFormData({ ...formData, unidade_medida_base: e.target.value })
                      }
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    >
                      {units.map((u) => (
                        <option key={u.id} value={u.abreviacao}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* BLOCO ESPECÍFICO: PREPARO ARTESANAL (COMPOSIÇÃO DE INSUMOS) */}
              {/* ========================================================= */}
              {isPrepared && (
                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                        <FlaskConical className="w-4 h-4 text-purple-600" />
                        Composição da Batelada (Ingredientes que compõem este preparo)
                      </span>
                      <p className="text-[11px] text-purple-700 mt-0.5">
                        Selecione os insumos que você usa e a quantidade para produzir uma receita completa deste xarope ou pré-mix.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddBaseItem}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Ingrediente</span>
                    </button>
                  </div>

                  {formData.ingredientes_base.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-purple-300 text-center text-purple-600 text-xs bg-white">
                      Nenhum ingrediente adicionado à batelada ainda. Clique em <strong>"+ Adicionar Ingrediente"</strong> acima para montar a receita do xarope.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {formData.ingredientes_base.map((item, idx) => {
                        const available = ingredients.filter((i) => i.id !== formData.id);
                        return (
                          <div
                            key={idx}
                            className="p-3 bg-white rounded-xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                          >
                            {/* Insumo selector */}
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Insumo Base #{idx + 1}
                              </label>
                              <select
                                value={item.insumo_id}
                                onChange={(e) =>
                                  handleUpdateBaseItem(idx, 'insumo_id', e.target.value)
                                }
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500"
                              >
                                {available.map((av) => (
                                  <option key={av.id} value={av.id}>
                                    {av.nome} ({av.unidade_medida_base}) - R${' '}
                                    {Number(av.custos_calculados?.custo_por_ml_g || 0).toFixed(4)}/
                                    {av.unidade_medida_base}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Quantidade */}
                            <div className="w-32">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Qtd. Usada ({item.unidade})
                              </label>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                required
                                value={item.quantidade}
                                onChange={(e) =>
                                  handleUpdateBaseItem(idx, 'quantidade', e.target.value)
                                }
                                placeholder="Ex: 500"
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500"
                              />
                            </div>

                            {/* Subtotal */}
                            <div className="w-28 text-right">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Custo Parcial
                              </label>
                              <p className="text-xs font-extrabold text-purple-900">
                                R$ {Number(item.custo_parcial || 0).toFixed(2)}
                              </p>
                            </div>

                            {/* Remover */}
                            <button
                              type="button"
                              onClick={() => handleRemoveBaseItem(idx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer self-end sm:self-center"
                              title="Remover da batelada"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Resumo da Batelada e Rendimento Final */}
                  <div className="pt-3 border-t border-purple-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Custo Total da Batelada:</p>
                      <p className="text-xl font-extrabold text-purple-900">
                        R$ {totalBatchCost.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-500">Soma de todos os insumos base</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Volume Produzido na Batelada ({formData.unidade_medida_base}) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        required
                        value={formData.rendimento.volume_final_utilizavel}
                        onChange={(e) => handleBatchYieldChange(e.target.value)}
                        placeholder="Ex: 750"
                        className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-0.5">Rendimento final utilizável</p>
                    </div>

                    <div className="bg-purple-700 text-white rounded-xl p-3 flex flex-col justify-center">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-purple-200">
                        Custo Real Calculado
                      </span>
                      <span className="text-lg font-extrabold leading-tight mt-0.5">
                        R$ {Number(formData.custos_calculados.custo_por_ml_g || 0).toFixed(4)}{' '}
                        <span className="text-xs font-normal">/ {formData.unidade_medida_base}</span>
                      </span>
                      <span className="text-[10px] text-purple-200 mt-0.5">
                        Dose 20{formData.unidade_medida_base}: R${' '}
                        {(Number(formData.custos_calculados.custo_por_ml_g || 0) * 20).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Modo de Preparo e Notas */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Instruções de Preparo & Armazenamento (Opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.instrucoes_preparo}
                      onChange={(e) => setFormData({ ...formData, instrucoes_preparo: e.target.value })}
                      placeholder="Ex: Dissolver o açúcar na água aquecida. Guardar em garrafa vedada na geladeira com validade de 15 dias..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* BLOCO PADRÃO: INSUMO COMPRADO (CÁLCULO DE RENDIMENTO)     */}
              {/* ========================================================= */}
              {!isPrepared && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                      <Calculator className="w-4 h-4" /> Cálculo de Custo e Rendimento
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <ArrowUpDown className="w-3 h-3" /> Atualização Automática
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Preço Pago na Compra (R$)
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={formData.compra.preco_embalagem}
                        onChange={(e) =>
                          handleFinancialChange('preco_embalagem', e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Quantidade Comprada
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={formData.compra.volume_comprado}
                        onChange={(e) =>
                          handleFinancialChange('volume_comprado', e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Unidade de Compra
                      </label>
                      <select
                        value={formData.compra.unidade_compra}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            compra: {
                              ...formData.compra,
                              unidade_compra: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900"
                      >
                        {units.map((u) => (
                          <option key={u.id} value={u.abreviacao}>
                            {u.abreviacao}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200/80">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Quantidade Útil Aproveitada ({formData.unidade_medida_base})
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={formData.rendimento.volume_final_utilizavel}
                        onChange={(e) =>
                          handleFinancialChange('volume_final_utilizavel', e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Rendimento Aproveitado (%)
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={formData.rendimento.percentual_yield}
                        onChange={(e) =>
                          handleFinancialChange('percentual_yield', e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-bold text-slate-900"
                      />
                    </div>

                    <div className="bg-emerald-600 text-white rounded-xl p-3 flex flex-col justify-center">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-100">
                        Custo Real por Dose ({formData.unidade_medida_base})
                      </span>
                      <span className="text-lg font-extrabold leading-tight mt-0.5">
                        R$ {Number(formData.custos_calculados.custo_por_ml_g).toFixed(4)}{' '}
                        <span className="text-xs font-normal">
                          / {formData.unidade_medida_base}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bloco de Equivalências de Guarnições, Unidades & Cortes */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    🍃 Equivalências de Guarnições, Unidades & Cortes (Grama, 1/2 Unidade, Rodelas)
                  </span>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Configure o peso estimado em gramas para quando você usar este insumo por grama, em 1/2 unidade, fruta inteira, rodelas, folhas ou zests na receita.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5 pt-1 items-end">
                  {[
                    { key: 'unidade_g', label: '1 Unidade (g)', placeholder: '80', isHighlight: true },
                    { key: 'meia_unidade_g', label: '½ Unidade (g)', placeholder: '40', isHighlight: true },
                    { key: 'rodela_g', label: '1 Rodela (g)', placeholder: '15' },
                    { key: 'fatia_g', label: '1 Fatia (g)', placeholder: '15' },
                    { key: 'gomo_g', label: '1 Gomo (g)', placeholder: '20' },
                    { key: 'zest_g', label: '1 Zest / Casca (g)', placeholder: '3' },
                    { key: 'folha_g', label: '1 Folha (g)', placeholder: '1' },
                    { key: 'ramo_g', label: '1 Ramo (g)', placeholder: '5' },
                  ].map((field) => (
                    <div key={field.key} className="flex flex-col justify-end">
                      <label
                        className={`block text-[11px] leading-tight min-h-[30px] flex items-end mb-1.5 ${
                          field.isHighlight ? 'font-bold text-amber-950' : 'font-semibold text-slate-700'
                        }`}
                      >
                        {field.label}
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder={field.placeholder}
                        value={formData.equivalencias?.[field.key] ?? ''}
                        onChange={(e) => {
                          let raw = e.target.value;
                          if (raw.length > 1 && raw.startsWith('0') && !raw.startsWith('0.')) {
                            raw = String(Number(raw));
                            e.target.value = raw;
                          }
                          const val = raw === '' ? '' : Number(raw);
                          setFormData((prev) => {
                            const updated = {
                              ...prev.equivalencias,
                              [field.key]: val,
                            };
                            if (
                              field.key === 'unidade_g' &&
                              (!prev.equivalencias?.meia_unidade_g || prev.equivalencias?.meia_unidade_g === '') &&
                              val !== ''
                            ) {
                              updated.meia_unidade_g = Number((Number(val) / 2).toFixed(1));
                            }
                            return {
                              ...prev,
                              equivalencias: updated,
                            };
                          });
                        }}
                        onBlur={(e) => {
                          if (e.target.value && !isNaN(e.target.value)) {
                            e.target.value = String(Number(e.target.value));
                          }
                        }}
                        className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                          field.isHighlight ? 'border-amber-300' : 'border-slate-200'
                        }`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-amber-700 italic">
                  * Deixe vazio para usar os pesos padrões de coquetelaria (ex: 80g unidade inteira, 40g meia unidade, 15g por rodela, 1g por folha, 3g por zest).
                </p>
              </div>

              {/* Bloco 3: Controle de Estoque */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Quantidade Atual em Estoque ({formData.unidade_medida_base})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.estoque.quantidade_atual}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estoque: {
                          ...formData.estoque,
                          quantidade_atual: e.target.value === '' ? '' : Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Estoque Mínimo de Segurança ({formData.unidade_medida_base})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.estoque.estoque_minimo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estoque: {
                          ...formData.estoque,
                          estoque_minimo: e.target.value === '' ? '' : Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-5 py-2 rounded-xl text-white text-sm font-semibold shadow-sm transition cursor-pointer disabled:opacity-50 ${
                    isPrepared ? 'bg-purple-600 hover:bg-purple-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {saving ? 'Salvando...' : isPrepared ? 'Salvar Insumo Artesanal' : 'Salvar Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Categorias & Unidades de Medida */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  Configurações de Insumos
                </h3>
                <p className="text-xs text-slate-500">
                  Adicione ou remova categorias e unidades de medida personalizadas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Abas */}
            <div className="flex border-b border-slate-200 px-6 pt-3 gap-4">
              <button
                type="button"
                onClick={() => setConfigTab('categorias')}
                className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  configTab === 'categorias'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Categorias ({categories.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setConfigTab('unidades')}
                className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  configTab === 'unidades'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Unidades de Medida ({units.length})</span>
              </button>
            </div>

            <div className="p-6">
              {configTab === 'categorias' ? (
                <div className="space-y-4">
                  <form onSubmit={handleAddCategory} className="flex gap-2">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Nova categoria (ex: Infusões, Especiarias)..."
                      className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
                    >
                      Adicionar
                    </button>
                  </form>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                    {categories.map((cat) => (
                      <div
                        key={cat}
                        className="px-3.5 py-2.5 flex items-center justify-between text-sm hover:bg-slate-50"
                      >
                        <span className="font-semibold text-slate-800">{cat}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          title="Excluir categoria"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <form onSubmit={handleAddUnit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newUnitLabel}
                        onChange={(e) => setNewUnitLabel(e.target.value)}
                        placeholder="Nome completo (ex: Gotas)"
                        className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        value={newUnitAbbr}
                        onChange={(e) => setNewUnitAbbr(e.target.value)}
                        placeholder="Abreviação (ex: gts)"
                        className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Cadastrar Nova Unidade
                    </button>
                  </form>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                    {units.map((u) => (
                      <div
                        key={u.id}
                        className="px-3.5 py-2.5 flex items-center justify-between text-sm hover:bg-slate-50"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{u.label}</p>
                          <p className="text-xs text-slate-400">
                            Abreviação: <strong className="text-slate-600">{u.abreviacao}</strong>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteUnit(u.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          title="Excluir unidade"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}