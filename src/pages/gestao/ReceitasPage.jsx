import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  listarReceitas,
  salvarReceita,
  excluirReceita,
  listarInsumos,
  listarCopos,
  INITIAL_BEVERAGE_TYPES,
  INITIAL_CATEGORIES,
} from '../../services/firestoreService';
import {
  calcularCustoParcial,
  calcularCMVPercentual,
  calcularPrecoSugerido,
  obterStatusCMV,
  GARNISH_UNITS,
  converterParaUnidadeBase,
  calcularCustoItemReceita,
  normalizeText,
  isGuarnicaoItem,
} from '../../utils/cmvCalculations';
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Edit3,
  Sparkles,
  Martini,
  Check,
  ArrowLeft,
  PieChart,
  DollarSign,
  TrendingUp,
  Layers,
  ListOrdered,
  Upload,
  Image as ImageIcon,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Wine,
  Settings2,
  Copy,
  ArrowLeftRight,
  X,
} from 'lucide-react';
import ModalImportarReceitas from '../../components/gestao/ModalImportarReceitas';
import ModalGerenciarCopos from '../../components/gestao/ModalGerenciarCopos';

const INGREDIENT_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

const EMPTY_RECIPE = {
  id: '',
  nome_coquetel: '',
  categoria: 'Autoral',
  metodo_preparo: 'Batido e Coado duplamente',
  copo: 'Coupé',
  guarnicao: '',
  foto_url: '',
  financeiro: {
    custo_total: 0,
    preco_venda: 38.0,
    cmv_percentual: 0,
    lucro_bruto: 38.0,
  },
  ingredientes: [],
  instrucoes_preparo: [
    'Gelar previamente a taça.',
    'Adicionar todos os ingredientes na coqueteleira com gelo.',
    'Bater vigorosamente e coar para a taça.',
  ],
};

function cleanStepText(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/^\d+[\.\-\)]\s*/, '').trim();
}

export default function ReceitasPage() {
  const [recipes, setRecipes] = useState([]);
  const [ingredientsCatalog, setIngredientsCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modo: 'list' (Catálogo padrão) ou 'builder' (Split-Screen RecipeBuilder)
  const [viewMode, setViewMode] = useState('list');
  const [recipeForm, setRecipeForm] = useState(EMPTY_RECIPE);
  const [metaCMV, setMetaCMV] = useState(25);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('Todas');
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [glasses, setGlasses] = useState([]);
  const [isGlassesModalOpen, setIsGlassesModalOpen] = useState(false);
  const [swappingIndex, setSwappingIndex] = useState(null);
  const [swapSearch, setSwapSearch] = useState('');
  const topAnchorRef = useRef(null);
  const stepInputRefs = useRef([]);

  function scrollToTop() {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (topAnchorRef.current) {
      topAnchorRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
    const mainScroll = document.querySelector('main .overflow-y-auto');
    if (mainScroll) {
      mainScroll.scrollTop = 0;
    }
  }

  useEffect(() => {
    scrollToTop();
    const timer = setTimeout(scrollToTop, 40);
    return () => clearTimeout(timer);
  }, [viewMode, recipeForm?.id]);

  async function carregarDados() {
    setLoading(true);
    try {
      const [recList, ingList] = await Promise.all([
        listarReceitas(),
        listarInsumos(),
      ]);
      setRecipes(recList);
      setIngredientsCatalog(ingList);
      setGlasses(listarCopos());

      // Se ainda não houver receita carregada no builder, carrega a primeira como exemplo interativo
      if (!recipeForm.nome_coquetel && recList.length > 0) {
        setRecipeForm(recList[0]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  // Mapa rápido de insumos por ID para buscar custos unitários atualizados
  const catalogMap = useMemo(() => {
    const map = {};
    ingredientsCatalog.forEach((ing) => {
      map[ing.id] = ing;
    });
    return map;
  }, [ingredientsCatalog]);

  // Agrupamento inteligente de marcas comerciais por Tipo de Bebida
  const brandsByType = useMemo(() => {
    const map = {};
    ingredientsCatalog.forEach((ing) => {
      const tipo = ing.tipo_bebida || ing.categoria || 'Outros';
      if (!map[tipo]) map[tipo] = [];
      map[tipo].push(ing);
    });
    return map;
  }, [ingredientsCatalog]);

  function getDefaultBrandForType(tipo) {
    if (!tipo) return null;
    const list = brandsByType[tipo] || [];
    return list.find((b) => b.is_padrao_tipo) || list[0] || null;
  }

  function getBrandsForItem(item) {
    if (!item) return { brands: [], defaultBrand: null, hasMultipleBrands: false };

    // 1. Por tipo_bebida explícito
    if (item.tipo_bebida && brandsByType[item.tipo_bebida]?.length > 0) {
      const brands = brandsByType[item.tipo_bebida];
      return {
        brands,
        defaultBrand: getDefaultBrandForType(item.tipo_bebida),
        hasMultipleBrands: brands.length > 1,
      };
    }

    // 2. Por catalogMap do ingredient_id
    const catalogItem = catalogMap[item.ingredient_id];
    if (catalogItem) {
      const tipo = catalogItem.tipo_bebida || catalogItem.categoria;
      if (tipo && brandsByType[tipo]?.length > 0) {
        const brands = brandsByType[tipo];
        return {
          brands,
          defaultBrand: getDefaultBrandForType(tipo),
          hasMultipleBrands: brands.length > 1,
        };
      }
    }

    // 3. Por correspondência inteligente de palavras-chave
    const nomeLower = (item.nome_exibicao || '').toLowerCase();
    for (const [tipo, brands] of Object.entries(brandsByType)) {
      const tipoLower = tipo.toLowerCase();
      if (
        (nomeLower.includes('tequila') && tipoLower.includes('tequila')) ||
        (nomeLower.includes('gin') && tipoLower.includes('gin')) ||
        (nomeLower.includes('vodka') && tipoLower.includes('vodka')) ||
        (nomeLower.includes('rum') && tipoLower.includes('rum')) ||
        (nomeLower.includes('triple sec') && tipoLower.includes('triple sec'))
      ) {
        return {
          brands,
          defaultBrand: getDefaultBrandForType(tipo),
          hasMultipleBrands: brands.length > 1,
        };
      }
    }

    return {
      brands: catalogItem ? [catalogItem] : [],
      defaultBrand: catalogItem || null,
      hasMultipleBrands: false,
    };
  }

  function getActiveInsumo(item) {
    if (item.marca_escolhida_id && item.marca_escolhida_id !== 'padrao') {
      return catalogMap[item.marca_escolhida_id] || catalogMap[item.ingredient_id];
    }
    const info = getBrandsForItem(item);
    return info.defaultBrand || catalogMap[item.ingredient_id];
  }

  // Sugestões inteligentes para o Autocomplete: Tipos de Bebidas (genéricas) + Itens específicos (com/sem acento)
  const autocompleteSuggestions = useMemo(() => {
    const q = normalizeText(ingredientSearch);

    // 1. Tipos de Bebidas (Categorias na Receita)
    const typeResults = [];
    Object.entries(brandsByType).forEach(([tipo, brands]) => {
      const matchTipo = normalizeText(tipo).includes(q);
      const matchBrand = brands.some((b) => normalizeText(b.marca || b.nome).includes(q));

      if (!q || matchTipo || matchBrand) {
        const defaultB = brands.find((b) => b.is_padrao_tipo) || brands[0];
        typeResults.push({
          isTypeOnly: true,
          tipo_bebida: tipo,
          nome: tipo,
          brandsCount: brands.length,
          defaultBrand: defaultB,
          brandsList: brands.map((b) => b.marca || b.nome).filter(Boolean).slice(0, 3).join(', '),
        });
      }
    });

    // 2. Insumos específicos / artesanais / frutas
    const specificResults = ingredientsCatalog.filter(
      (ing) =>
        normalizeText(ing.nome).includes(q) ||
        (ing.marca && normalizeText(ing.marca).includes(q)) ||
        normalizeText(ing.categoria).includes(q)
    );

    return { typeResults, specificResults };
  }, [brandsByType, ingredientsCatalog, ingredientSearch]);

  // Lista unificada e completa de todos os Tipos de Bebida / Categorias disponíveis para troca rápida
  const allBeverageTypes = useMemo(() => {
    const set = new Set(INITIAL_BEVERAGE_TYPES || []);
    (INITIAL_CATEGORIES || []).forEach((c) => set.add(c));
    ingredientsCatalog.forEach((ing) => {
      if (ing.tipo_bebida) set.add(ing.tipo_bebida);
      if (ing.categoria) set.add(ing.categoria);
    });
    (recipeForm.ingredientes || []).forEach((item) => {
      if (item.tipo_bebida) set.add(item.tipo_bebida);
    });
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [ingredientsCatalog, recipeForm.ingredientes]);

  // Sugestões para o modal de troca/substituição de insumo
  const swapSuggestions = useMemo(() => {
    const q = normalizeText(swapSearch);

    const typeResults = [];
    Object.entries(brandsByType).forEach(([tipo, brands]) => {
      const matchTipo = normalizeText(tipo).includes(q);
      const matchBrand = brands.some((b) => normalizeText(b.marca || b.nome).includes(q));

      if (!q || matchTipo || matchBrand) {
        const defaultB = brands.find((b) => b.is_padrao_tipo) || brands[0];
        typeResults.push({
          isTypeOnly: true,
          tipo_bebida: tipo,
          nome: tipo,
          brandsCount: brands.length,
          defaultBrand: defaultB,
          brandsList: brands.map((b) => b.marca || b.nome).filter(Boolean).slice(0, 3).join(', '),
        });
      }
    });

    const specificResults = ingredientsCatalog.filter(
      (ing) =>
        normalizeText(ing.nome).includes(q) ||
        (ing.marca && normalizeText(ing.marca).includes(q)) ||
        normalizeText(ing.categoria).includes(q)
    );

    return { typeResults, specificResults };
  }, [brandsByType, ingredientsCatalog, swapSearch]);

  // Filtro de Coquetéis no Catálogo com busca insensível a acentuação
  const filteredCatalogRecipes = useMemo(() => {
    const q = normalizeText(catalogSearch);
    return recipes.filter((rec) => {
      const matchCat =
        catalogCategoryFilter === 'Todas' || rec.categoria === catalogCategoryFilter;
      if (!q) return matchCat;
      const matchName = normalizeText(rec.nome_coquetel).includes(q);
      const matchGlass = normalizeText(rec.copo).includes(q);
      const matchGarnish = normalizeText(rec.guarnicao).includes(q);
      const matchIngredients = (rec.ingredientes || []).some(
        (ing) =>
          normalizeText(ing.nome_exibicao).includes(q) ||
          normalizeText(ing.marca).includes(q) ||
          normalizeText(ing.tipo_bebida).includes(q)
      );
      return matchCat && (matchName || matchGlass || matchGarnish || matchIngredients);
    });
  }, [recipes, catalogSearch, catalogCategoryFilter]);

  // Cálculos matemáticos em tempo real (Seção 5 da Especificação)
  const liveFinanceiro = useMemo(() => {
    const custoTotal = Number(
      recipeForm.ingredientes
        .reduce((acc, item) => acc + (Number(item.custo_parcial) || 0), 0)
        .toFixed(2)
    );
    const precoVenda = Number(recipeForm.financeiro?.preco_venda) || 0;
    const cmvPercentual = calcularCMVPercentual(custoTotal, precoVenda);
    const lucroBruto = Number((precoVenda - custoTotal).toFixed(2));
    const precoSugerido = calcularPrecoSugerido(custoTotal, metaCMV);
    const statusCMV = obterStatusCMV(cmvPercentual);

    // O volume líquido no copo considera apenas líquidos (ml e dash); guarnições (rodelas, folhas) não distorcem o volume líquido do drinque
    const volumeTotal = Number(
      recipeForm.ingredientes
        .filter((item) => ['ml', 'dash'].includes(item.unidade_medida || 'ml'))
        .reduce((acc, item) => {
          const qtd = Number(item.quantidade_usada) || 0;
          if (item.unidade_medida === 'dash') return acc + qtd * 0.8;
          return acc + qtd;
        }, 0)
        .toFixed(1)
    );

    return {
      custoTotal,
      precoVenda,
      cmvPercentual,
      lucroBruto,
      precoSugerido,
      statusCMV,
      volumeTotal,
    };
  }, [recipeForm.ingredientes, recipeForm.financeiro?.preco_venda, metaCMV]);

  function handleStartNewRecipe() {
    setRecipeForm({
      ...EMPTY_RECIPE,
      id: '',
      nome_coquetel: '',
      ingredientes: [],
      instrucoes_preparo: [
        'Gelar previamente a taça.',
        'Adicionar todos os ingredientes na coqueteleira com gelo.',
        'Bater vigorosamente e coar para a taça.',
      ],
    });
    setViewMode('builder');
    scrollToTop();
  }

  function handleEditRecipe(rec) {
    const rawSteps = Array.isArray(rec.instrucoes_preparo) ? rec.instrucoes_preparo : [];
    const cleanedSteps = rawSteps.map(cleanStepText).filter((s) => s.length > 0);
    setRecipeForm({
      ...rec,
      ingredientes: Array.isArray(rec.ingredientes) ? [...rec.ingredientes] : [],
      instrucoes_preparo: cleanedSteps.length > 0 ? cleanedSteps : [''],
    });
    setViewMode('builder');
    scrollToTop();
  }

  function handleAddIngredientToRecipe(selection) {
    let activeInsumo;
    let tipoBebida = '';
    let nomeExibicao = '';
    let defaultUnit = 'ml';

    if (selection.isTypeOnly) {
      tipoBebida = selection.tipo_bebida;
      nomeExibicao = selection.tipo_bebida;
      activeInsumo = getDefaultBrandForType(selection.tipo_bebida) || selection.defaultBrand;
      defaultUnit = activeInsumo?.unidade_medida_base || 'ml';
    } else {
      activeInsumo = selection;
      tipoBebida = selection.tipo_bebida || selection.categoria || '';
      nomeExibicao = selection.tipo_bebida || selection.nome;
      defaultUnit = selection.unidade_medida_base || 'ml';
    }

    const isCountable = ['un', 'rodela', 'fatia', 'folha', 'ramo', 'gomo', 'zest', 'dash'].includes(defaultUnit);
    const dosePadrao = isCountable
      ? 1
      : defaultUnit === 'g'
      ? 15
      : defaultUnit === 'ml' &&
        ['gin', 'vodka', 'rum', 'tequila', 'whiskey', 'whisky', 'cachaça', 'destilado'].some((t) =>
          tipoBebida.toLowerCase().includes(t)
        )
      ? 50
      : 30;

    const custoParcial = calcularCustoItemReceita(dosePadrao, defaultUnit, activeInsumo);

    setRecipeForm((prev) => {
      return {
        ...prev,
        ingredientes: [
          ...prev.ingredientes,
          {
            item_id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            ingredient_id: activeInsumo?.id || '',
            tipo_bebida: tipoBebida,
            nome_exibicao: nomeExibicao,
            marca_escolhida_id: 'padrao',
            marca_escolhida_nome: activeInsumo?.marca || activeInsumo?.nome || '',
            quantidade_usada: dosePadrao,
            unidade_medida: defaultUnit,
            custo_parcial: custoParcial,
          },
        ],
      };
    });

    setIngredientSearch('');
    setShowAutocomplete(false);
  }

  function handleUpdateIngredientBrand(index, novaMarcaId) {
    setRecipeForm((prev) => {
      const updated = [...prev.ingredientes];
      const item = updated[index];

      let activeInsumo;
      if (novaMarcaId === 'padrao') {
        activeInsumo = getDefaultBrandForType(item.tipo_bebida) || catalogMap[item.ingredient_id];
      } else {
        activeInsumo = catalogMap[novaMarcaId];
      }

      const qtdNum = Number(item.quantidade_usada) || 0;
      const custoParcial = calcularCustoItemReceita(qtdNum, item.unidade_medida, activeInsumo);

      updated[index] = {
        ...item,
        marca_escolhida_id: novaMarcaId,
        marca_escolhida_nome: activeInsumo?.marca || activeInsumo?.nome || '',
        ingredient_id: activeInsumo?.id || item.ingredient_id,
        custo_parcial: custoParcial,
      };
      return { ...prev, ingredientes: updated };
    });
  }

  function handleUpdateIngredientDose(index, novaQuantidade) {
    const rawClean = novaQuantidade === '' ? '' : novaQuantidade;
    const qtdNum = rawClean === '' ? 0 : Math.max(0, Number(rawClean));

    setRecipeForm((prev) => {
      const updated = [...prev.ingredientes];
      const item = updated[index];
      const activeInsumo = getActiveInsumo(item);
      const custoParcial = calcularCustoItemReceita(qtdNum, item.unidade_medida, activeInsumo);

      updated[index] = {
        ...item,
        quantidade_usada: rawClean,
        custo_parcial: custoParcial,
      };
      return { ...prev, ingredientes: updated };
    });
  }

  function handleUpdateIngredientUnit(index, novaUnidade) {
    setRecipeForm((prev) => {
      const updated = [...prev.ingredientes];
      const item = updated[index];
      const activeInsumo = getActiveInsumo(item);

      // Sugestão de dose inteligente ao trocar para/de guarnição
      let novaQtd = item.quantidade_usada;
      const isCurrentCountable = ['rodela', 'fatia', 'gomo', 'zest', 'folha', 'ramo', 'un', 'meia_un', 'dash'].includes(item.unidade_medida);
      const isNewCountable = ['rodela', 'fatia', 'gomo', 'zest', 'folha', 'ramo', 'un', 'meia_un', 'dash'].includes(novaUnidade);

      if (!isCurrentCountable && isNewCountable) {
        novaQtd = novaUnidade === 'folha' ? 6 : 1;
      } else if (isCurrentCountable && !isNewCountable) {
        novaQtd = novaUnidade === 'ml' ? 30 : 25;
      }

      const qtdNum = Number(novaQtd) || 0;
      const custoParcial = calcularCustoItemReceita(qtdNum, novaUnidade, activeInsumo);

      updated[index] = {
        ...item,
        unidade_medida: novaUnidade,
        quantidade_usada: novaQtd,
        custo_parcial: custoParcial,
      };
      return { ...prev, ingredientes: updated };
    });
  }

  function handleRemoveIngredient(index) {
    setRecipeForm((prev) => ({
      ...prev,
      ingredientes: prev.ingredientes.filter((_, idx) => idx !== index),
    }));
  }

  function handleChangeIngredientType(index, newType) {
    setRecipeForm((prev) => {
      const updated = [...prev.ingredientes];
      const item = updated[index];
      if (!item) return prev;

      // 1. Localiza a marca/insumo padrão para esse novo tipo
      const matchingBrands = ingredientsCatalog.filter(
        (ing) =>
          (ing.tipo_bebida && ing.tipo_bebida.toLowerCase() === newType.toLowerCase()) ||
          (ing.categoria && ing.categoria.toLowerCase() === newType.toLowerCase())
      );

      const newDefaultInsumo =
        getDefaultBrandForType(newType) ||
        matchingBrands[0] ||
        catalogMap[item.ingredient_id];

      // 2. Se o nome do item for igual ao tipo anterior ou genérico, atualiza
      const currentNome = item.nome_exibicao || '';
      const isGeneric =
        !currentNome ||
        currentNome.toLowerCase() === (item.tipo_bebida || '').toLowerCase() ||
        ['cítrico', 'xarope', 'destilado', 'licor', 'outros', 'guarnição'].includes(
          currentNome.toLowerCase()
        );

      const newNomeExibicao = isGeneric ? newType : currentNome;
      const newUnit =
        newDefaultInsumo?.unidade_medida_base || item.unidade_medida || 'ml';
      const qtdNum = Number(item.quantidade_usada) || 0;
      const novoCusto = calcularCustoItemReceita(qtdNum, newUnit, newDefaultInsumo);

      updated[index] = {
        ...item,
        tipo_bebida: newType,
        nome_exibicao: newNomeExibicao,
        ingredient_id: newDefaultInsumo?.id || item.ingredient_id,
        marca_escolhida_id: 'padrao',
        marca_escolhida_nome:
          newDefaultInsumo?.marca || newDefaultInsumo?.nome || '',
        unidade_medida: newUnit,
        custo_parcial: novoCusto,
      };

      return { ...prev, ingredientes: updated };
    });
  }

  function handleConfirmSwap(selection) {
    if (swappingIndex === null) return;
    const index = swappingIndex;

    let activeInsumo;
    let tipoBebida = '';
    let nomeExibicao = '';
    let defaultUnit = 'ml';

    if (selection.isTypeOnly) {
      tipoBebida = selection.tipo_bebida;
      nomeExibicao = selection.tipo_bebida;
      activeInsumo = getDefaultBrandForType(selection.tipo_bebida) || selection.defaultBrand;
      defaultUnit = activeInsumo?.unidade_medida_base || 'ml';
    } else {
      activeInsumo = selection;
      tipoBebida = selection.tipo_bebida || selection.categoria || '';
      nomeExibicao = selection.nome || selection.tipo_bebida;
      defaultUnit = selection.unidade_medida_base || 'ml';
    }

    setRecipeForm((prev) => {
      const updated = [...prev.ingredientes];
      const prevItem = updated[index];
      const qtdUsada = prevItem ? Number(prevItem.quantidade_usada) || 0 : 30;
      const unit = defaultUnit || prevItem?.unidade_medida || 'ml';
      const custoParcial = calcularCustoItemReceita(qtdUsada, unit, activeInsumo);

      updated[index] = {
        item_id: prevItem?.item_id || `item_${Date.now()}`,
        ingredient_id: activeInsumo?.id || '',
        tipo_bebida: tipoBebida,
        nome_exibicao: nomeExibicao,
        marca_escolhida_id: 'padrao',
        marca_escolhida_nome: activeInsumo?.marca || activeInsumo?.nome || '',
        quantidade_usada: qtdUsada,
        unidade_medida: unit,
        custo_parcial: custoParcial,
      };

      return { ...prev, ingredientes: updated };
    });

    setSwappingIndex(null);
    setSwapSearch('');
  }

  const [draggedIndex, setDraggedIndex] = useState(null);

  function handleMoveIngredient(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= recipeForm.ingredientes.length) return;
    setRecipeForm((prev) => {
      const items = [...prev.ingredientes];
      const [movedItem] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, movedItem);
      return {
        ...prev,
        ingredientes: items,
      };
    });
  }

  function handleDragStart(e, index) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e, targetIndex) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    handleMoveIngredient(draggedIndex, targetIndex);
    setDraggedIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  function handleApplySuggestedPrice() {
    if (liveFinanceiro.precoSugerido <= 0) return;
    setRecipeForm((prev) => ({
      ...prev,
      financeiro: {
        ...prev.financeiro,
        preco_venda: liveFinanceiro.precoSugerido,
      },
    }));
  }

  function handleStepChange(index, value) {
    const clean = value.replace(/^\d+[\.\-\)]\s*/, '');
    setRecipeForm((prev) => {
      const steps = [...prev.instrucoes_preparo];
      steps[index] = clean;
      return { ...prev, instrucoes_preparo: steps };
    });
  }

  function handleInsertStepAfter(index) {
    setRecipeForm((prev) => {
      const steps = [...prev.instrucoes_preparo];
      steps.splice(index + 1, 0, '');
      return { ...prev, instrucoes_preparo: steps };
    });
    setTimeout(() => {
      const nextInput = stepInputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }, 40);
  }

  function handleStepKeyDown(e, index) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInsertStepAfter(index);
    } else if (
      e.key === 'Backspace' &&
      !recipeForm.instrucoes_preparo[index]?.trim() &&
      recipeForm.instrucoes_preparo.length > 1
    ) {
      e.preventDefault();
      handleRemoveStep(index);
      setTimeout(() => {
        const prevInput = stepInputRefs.current[Math.max(0, index - 1)];
        if (prevInput) {
          prevInput.focus();
        }
      }, 40);
    }
  }

  function handleAddStep() {
    setRecipeForm((prev) => ({
      ...prev,
      instrucoes_preparo: [...prev.instrucoes_preparo, ''],
    }));
    setTimeout(() => {
      const lastIndex = recipeForm.instrucoes_preparo.length;
      const lastInput = stepInputRefs.current[lastIndex];
      if (lastInput) {
        lastInput.focus();
      }
    }, 40);
  }

  function handleRemoveStep(index) {
    setRecipeForm((prev) => {
      const filtered = prev.instrucoes_preparo.filter((_, idx) => idx !== index);
      return {
        ...prev,
        instrucoes_preparo: filtered.length > 0 ? filtered : [''],
      };
    });
  }

  function handleImageFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Redimensiona/otimiza para caber perfeitamente no Firestore e armazenamento local
        const MAX_SIZE = 800;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

        setRecipeForm((prev) => ({
          ...prev,
          foto_url: compressedDataUrl,
        }));
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveRecipe(e) {
    e.preventDefault();
    if (!recipeForm.nome_coquetel.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...recipeForm,
        instrucoes_preparo: (recipeForm.instrucoes_preparo || [])
          .map((s) => (typeof s === 'string' ? s.replace(/^\d+[\.\-\)]\s*/, '').trim() : ''))
          .filter(Boolean)
          .map((clean, idx) => `${idx + 1}. ${clean}`),
        financeiro: {
          custo_total: liveFinanceiro.custoTotal,
          preco_venda: liveFinanceiro.precoVenda,
          cmv_percentual: liveFinanceiro.cmvPercentual,
          lucro_bruto: liveFinanceiro.lucroBruto,
        },
      };
      const saved = await salvarReceita(payload);
      setRecipeForm({
        ...saved,
        instrucoes_preparo: (saved.instrucoes_preparo || []).map(cleanStepText),
      });
      await carregarDados();
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRecipe(rec) {
    if (!window.confirm(`Deseja excluir a ficha técnica "${rec.nome_coquetel}"?`)) return;
    await excluirReceita(rec.id);
    await carregarDados();
  }

  async function handleDuplicateRecipe(rec, e) {
    if (e) e.stopPropagation();
    try {
      const duplicated = {
        ...rec,
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        nome_coquetel: `${rec.nome_coquetel} (Cópia)`,
        ingredientes: Array.isArray(rec.ingredientes)
          ? rec.ingredientes.map((item) => ({ ...item }))
          : [],
        instrucoes_preparo: Array.isArray(rec.instrucoes_preparo)
          ? [...rec.instrucoes_preparo]
          : [],
        financeiro: { ...(rec.financeiro || {}) },
      };

      await salvarReceita(duplicated);
      await carregarDados();
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 3000);
    } catch (err) {
      console.error('Erro ao duplicar receita:', err);
      alert('Não foi possível duplicar a ficha técnica.');
    }
  }

  // Segmentos do Gráfico em Anel (SVG Donut Chart)
  const donutSegments = useMemo(() => {
    const total = liveFinanceiro.custoTotal;
    if (total <= 0 || recipeForm.ingredientes.length === 0) return [];
    let cumulativePercent = 0;

    return recipeForm.ingredientes.map((item, idx) => {
      const pct = (Number(item.custo_parcial) / total) * 100;
      const startOffset = 100 - cumulativePercent + 25;
      cumulativePercent += pct;
      return {
        ...item,
        pct: Number(pct.toFixed(1)),
        color: INGREDIENT_COLORS[idx % INGREDIENT_COLORS.length],
        strokeDasharray: `${pct} ${100 - pct}`,
        strokeDashoffset: startOffset,
      };
    });
  }, [recipeForm.ingredientes, liveFinanceiro.custoTotal]);

  return (
    <div ref={topAnchorRef} className="space-y-6">
      {/* Cabeçalho com alternância entre Catálogo e Ficha Técnica */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <BookOpen className="w-4 h-4" />
            <span>Fichas Técnicas & Cardápio</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            {viewMode === 'builder'
              ? (recipeForm.nome_coquetel ? `Ficha Técnica: ${recipeForm.nome_coquetel}` : 'Nova Ficha Técnica')
              : 'Fichas Técnicas'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {viewMode === 'builder' ? (
            <button
              type="button"
              onClick={() => {
                setViewMode('list');
                scrollToTop();
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-sm flex items-center gap-2 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Fichas Técnicas</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsGlassesModalOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-sm flex items-center gap-2 transition cursor-pointer"
                title="Adicionar ou editar copos e taças"
              >
                <Wine className="w-4 h-4 text-slate-500" />
                <span>Copos & Taças</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBatchModal(true)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-sm flex items-center gap-2 transition cursor-pointer"
              >
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Importar em Lote</span>
              </button>

              <button
                type="button"
                onClick={handleStartNewRecipe}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Ficha Técnica</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* MODO 1: CATÁLOGO DE FICHAS TÉCNICAS */}
      {viewMode === 'list' ? (
        <div className="space-y-5">
          {/* Barra de Busca de Fichas Técnicas & Filtros de Categoria */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar ficha técnica por nome, ingrediente ou taça (ex: margarita, limao, negroni)..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {['Todas', 'Clássico', 'Autoral'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatalogCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    catalogCategoryFilter === cat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredCatalogRecipes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
              <Martini className="w-12 h-12 stroke-[1.25] text-slate-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-800">Nenhuma ficha técnica encontrada</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tente buscar com outro termo ou limpe o filtro de busca.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredCatalogRecipes.map((rec) => {
                const status = obterStatusCMV(rec.financeiro?.cmv_percentual);
                return (
                  <div
                    key={rec.id}
                    onClick={() => handleEditRecipe(rec)}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between cursor-pointer group"
                  >
                <div>
                  <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {rec.foto_url ? (
                      <img
                        src={rec.foto_url}
                        alt={rec.nome_coquetel}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : null}

                    {/* Ícone vazio quando não há foto */}
                    <div
                      className={`flex flex-col items-center justify-center w-full h-full bg-slate-100 text-slate-300 ${
                        rec.foto_url ? 'hidden' : ''
                      }`}
                    >
                      <Martini className="w-12 h-12 stroke-[1.25] text-slate-300 mb-1" />
                      <span className="text-[11px] font-semibold text-slate-400">
                        Sem foto cadastrada
                      </span>
                    </div>

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                        {rec.categoria}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 text-slate-800 backdrop-blur-xs">
                        {rec.copo}
                      </span>
                    </div>
                    <div
                      className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-extrabold text-white shadow-sm"
                      style={{ backgroundColor: status.hex }}
                    >
                      CMV {Number(rec.financeiro?.cmv_percentual || 0).toFixed(1)}%
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-bold text-slate-900 text-lg">
                      {rec.nome_coquetel}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {rec.metodo_preparo} • Guarnição: {rec.guarnicao || 'Padrão'}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {(rec.ingredientes || []).slice(0, 3).map((ing, i) => {
                        const isGarnish = isGuarnicaoItem(ing);
                        return (
                          <span
                            key={i}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                              isGarnish
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200/60'
                            }`}
                          >
                            {isGarnish ? '🍃 ' : ''}
                            {ing.nome_exibicao}
                          </span>
                        );
                      })}
                      {(rec.ingredientes || []).length > 3 && (
                        <span className="text-[10px] text-slate-400 self-center font-medium">
                          +{(rec.ingredientes || []).length - 3}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Custo Total
                        </p>
                        <p className="text-sm font-extrabold text-slate-800">
                          R$ {Number(rec.financeiro?.custo_total || 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Preço Venda
                        </p>
                        <p className="text-sm font-extrabold text-emerald-700">
                          R$ {Number(rec.financeiro?.preco_venda || 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Lucro Bruto
                        </p>
                        <p className="text-sm font-extrabold text-blue-700">
                          R$ {Number(rec.financeiro?.lucro_bruto || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    {(rec.ingredientes || []).length} ingrediente(s)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleDuplicateRecipe(rec, e)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200/80 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                      title="Duplicar este coquetel"
                    >
                      <Copy className="w-3.5 h-3.5 text-blue-500" />
                      <span>Duplicar</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditRecipe(rec);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRecipe(rec);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      title="Excluir este coquetel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
            </div>
          )}
        </div>
      ) : (
        /* MODO 2: <BuilderReceita> SPLIT-SCREEN (Seção 7.2 da Especificação) */
        <form
          onSubmit={handleSaveRecipe}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* ================================================================= */}
          {/* COLUNA ESQUERDA (7 Colunas): Dados, Search/Autocomplete & Passos  */}
          {/* ================================================================= */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: Identificação do Coquetel */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Martini className="w-4 h-4 text-emerald-600" />
                <span>1. Identificação & Especificação do Coquetel</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Nome do Coquetel *
                  </label>
                  <input
                    type="text"
                    required
                    value={recipeForm.nome_coquetel}
                    onChange={(e) =>
                      setRecipeForm({ ...recipeForm, nome_coquetel: e.target.value })
                    }
                    placeholder="Ex: Margarita Clarificada"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Categoria
                  </label>
                  <select
                    value={recipeForm.categoria}
                    onChange={(e) =>
                      setRecipeForm({ ...recipeForm, categoria: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    <option value="Autoral">Autoral</option>
                    <option value="Clássico">Clássico</option>
                    <option value="Releitura">Releitura</option>
                    <option value="Highball & Spritz">Highball & Spritz</option>
                    <option value="Mocktail (Sem Álcool)">Mocktail (Sem Álcool)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Método de Preparo
                  </label>
                  <select
                    value={recipeForm.metodo_preparo}
                    onChange={(e) =>
                      setRecipeForm({ ...recipeForm, metodo_preparo: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900"
                  >
                    <option value="Batido e Coado duplamente">
                      Batido e Coado duplamente
                    </option>
                    <option value="Batido e Coado">Batido e Coado</option>
                    <option value="Mexido (Stirred)">Mexido (Stirred)</option>
                    <option value="Montado no Copo (Built)">
                      Montado no Copo (Built)
                    </option>
                    <option value="Clarificado (Milk Punch)">
                      Clarificado (Milk Punch)
                    </option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Taça / Copo
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsGlassesModalOpen(true)}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition"
                      title="Adicionar ou editar copos e taças"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>Gerenciar Copos</span>
                    </button>
                  </div>
                  <select
                    value={recipeForm.copo}
                    onChange={(e) => {
                      if (e.target.value === '__MANAGE_GLASSES__') {
                        setIsGlassesModalOpen(true);
                      } else {
                        setRecipeForm({ ...recipeForm, copo: e.target.value });
                      }
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    {/* Caso o copo atual da receita não esteja na lista, exibe para não perder */}
                    {recipeForm.copo && !glasses.includes(recipeForm.copo) && (
                      <option value={recipeForm.copo}>{recipeForm.copo}</option>
                    )}
                    {glasses.map((glassName) => (
                      <option key={glassName} value={glassName}>
                        {glassName}
                      </option>
                    ))}
                    <option
                      value="__MANAGE_GLASSES__"
                      className="text-emerald-700 font-bold bg-emerald-50"
                    >
                      ⚙️ + Adicionar ou Editar Copos...
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Guarnição
                  </label>
                  <input
                    type="text"
                    value={recipeForm.guarnicao}
                    onChange={(e) =>
                      setRecipeForm({ ...recipeForm, guarnicao: e.target.value })
                    }
                    placeholder="Ex: Borda de sal negro"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Foto do Coquetel (Selecionar do Computador)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-3.5 rounded-xl bg-slate-50 border border-dashed border-slate-300 hover:border-emerald-500 transition">
                  {/* Miniatura da Foto Atual / Ícone Vazio */}
                  <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-300 flex items-center justify-center relative group">
                    {recipeForm.foto_url ? (
                      <>
                        <img
                          src={recipeForm.foto_url}
                          alt="Preview do Coquetel"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setRecipeForm((prev) => ({ ...prev, foto_url: '' }))}
                          title="Remover foto"
                          className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition text-[10px] font-bold cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mb-0.5 text-red-400" />
                          <span>Remover</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300">
                        <Martini className="w-8 h-8 stroke-[1.25] text-slate-300" />
                        <span className="text-[9px] font-bold text-slate-400 mt-0.5">Sem foto</span>
                      </div>
                    )}
                  </div>

                  {/* Botão que abre o explorador de arquivos do PC */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition cursor-pointer">
                        <Upload className="w-4 h-4" />
                        <span>Escolher Imagem no Computador</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileSelect}
                          className="hidden"
                        />
                      </label>

                      {recipeForm.foto_url && (
                        <button
                          type="button"
                          onClick={() => setRecipeForm((prev) => ({ ...prev, foto_url: '' }))}
                          className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover Foto</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Clique no botão acima para selecionar um arquivo JPG, PNG ou WebP direto do seu PC. Se não selecionar nenhuma, o drinque ficará com o ícone padrão vazio.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Adição de Insumos via Search / Autocomplete */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-600" />
                  <span>2. Composição da Receita (Insumos & Doses)</span>
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  Volume Total: <strong>{liveFinanceiro.volumeTotal} ml</strong>
                </span>
              </div>

              {/* Campo de Autocomplete */}
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ingredientSearch}
                    onFocus={() => setShowAutocomplete(true)}
                    onChange={(e) => {
                      setIngredientSearch(e.target.value);
                      setShowAutocomplete(true);
                    }}
                    placeholder="Pesquisar insumo no estoque para adicionar à receita (ex: Limão, Tequila, Gin)..."
                    className="w-full pl-10 pr-24 py-2.5 bg-emerald-50/40 border border-emerald-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                  />
                  {showAutocomplete && (
                    <button
                      type="button"
                      onClick={() => setShowAutocomplete(false)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                    >
                      Fechar
                    </button>
                  )}
                </div>

                {/* Dropdown Autocomplete */}
                {showAutocomplete && (
                  <div className="absolute z-20 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {autocompleteSuggestions.typeResults.length === 0 &&
                    autocompleteSuggestions.specificResults.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        Nenhum insumo ou tipo de bebida encontrado.
                      </div>
                    ) : (
                      <>
                        {/* Seção 1: Tipos de Bebidas (Para montar a receita genérica) */}
                        {autocompleteSuggestions.typeResults.length > 0 && (
                          <div>
                            <div className="px-3.5 py-1.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-blue-900">
                              <span>🍸 Tipos de Bebidas (Ficha Técnica por Categoria)</span>
                              <span className="text-blue-600 font-medium">Recomendado</span>
                            </div>
                            {autocompleteSuggestions.typeResults.map((typeItem) => (
                              <button
                                key={`type_${typeItem.tipo_bebida}`}
                                type="button"
                                onClick={() => handleAddIngredientToRecipe(typeItem)}
                                className="w-full px-4 py-2.5 text-left hover:bg-blue-50/80 flex items-center justify-between transition cursor-pointer border-b border-slate-50"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-blue-950">
                                      {typeItem.tipo_bebida}
                                    </p>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                                      {typeItem.brandsCount} marca{typeItem.brandsCount > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    Padrão da Casa:{' '}
                                    <strong className="text-slate-700">
                                      {typeItem.defaultBrand?.marca || typeItem.defaultBrand?.nome}
                                    </strong>{' '}
                                    {typeItem.brandsList ? `• Marcas: ${typeItem.brandsList}` : ''}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-extrabold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-lg border border-blue-200">
                                    Padrão R${' '}
                                    {Number(
                                      typeItem.defaultBrand?.custos_calculados?.custo_por_ml_g || 0
                                    ).toFixed(4)}
                                    /ml
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Seção 2: Insumos Específicos e Artesanais */}
                        {autocompleteSuggestions.specificResults.length > 0 && (
                          <div>
                            <div className="px-3.5 py-1.5 bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                              📦 Rótulos Comerciais, Artesanais & Outros Insumos
                            </div>
                            {autocompleteSuggestions.specificResults.map((ing) => (
                              <button
                                key={ing.id}
                                type="button"
                                onClick={() => handleAddIngredientToRecipe(ing)}
                                className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 flex items-center justify-between transition cursor-pointer"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-900">{ing.nome}</p>
                                    {ing.tipo === 'preparado' && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                                        🧪 Artesanal
                                      </span>
                                    )}
                                    {ing.marca && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                        Rótulo: {ing.marca}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500">
                                    {ing.tipo_bebida ? `Tipo: ${ing.tipo_bebida} • ` : ''}
                                    Estoque: {ing.estoque?.quantidade_atual} {ing.unidade_medida_base}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                    + R${' '}
                                    {Number(ing.custos_calculados?.custo_por_ml_g || 0).toFixed(4)}
                                    /{ing.unidade_medida_base}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Lista de Ingredientes Adicionados */}
              <div className="space-y-2.5 pt-2">
                {recipeForm.ingredientes.length === 0 ? (
                  <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-sm">
                    Clique na barra de busca acima para adicionar os insumos deste coquetel.
                  </div>
                ) : (
                  recipeForm.ingredientes.map((item, idx) => {
                    const color = INGREDIENT_COLORS[idx % INGREDIENT_COLORS.length];
                    const sharePct =
                      liveFinanceiro.custoTotal > 0
                        ? (
                            (Number(item.custo_parcial) / liveFinanceiro.custoTotal) *
                            100
                          ).toFixed(1)
                        : '0.0';

                    return (
                      <div
                        key={`${item.ingredient_id}_${idx}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-2.5 transition ${
                          draggedIndex === idx
                            ? 'opacity-40 border-dashed border-emerald-500 bg-emerald-50/50'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Controles de Ordenação (Subir/Descer e Arrastar) */}
                          <div className="flex flex-col items-center justify-center shrink-0 -my-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveIngredient(idx, idx - 1)}
                              className="p-0.5 rounded text-slate-400 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-200 transition cursor-pointer"
                              title="Subir posição na receita"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <div
                              className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 py-0.5"
                              title="Arraste para reposicionar a ordem"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>
                            <button
                              type="button"
                              disabled={idx === recipeForm.ingredientes.length - 1}
                              onClick={() => handleMoveIngredient(idx, idx + 1)}
                              className="p-0.5 rounded text-slate-400 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-200 transition cursor-pointer"
                              title="Descer posição na receita"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span
                            className="w-3 h-10 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-slate-900 text-sm truncate">
                                {item.nome_exibicao}
                              </p>
                              {/* Seletor Dropdown do Tipo de Insumo / Bebida */}
                              <div
                                className="relative inline-flex items-center"
                                title="Clique para trocar a categoria / tipo deste insumo"
                              >
                                <select
                                  value={item.tipo_bebida || 'Outros'}
                                  onChange={(e) =>
                                    handleChangeIngredientType(idx, e.target.value)
                                  }
                                  className="appearance-none pl-5 pr-5 py-0.5 rounded text-[10px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-200/80 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                                >
                                  {allBeverageTypes.map((t) => (
                                    <option key={t} value={t}>
                                      🍸 {t}
                                    </option>
                                  ))}
                                </select>
                                <span className="absolute left-1.5 pointer-events-none text-[10px]">
                                  🍸
                                </span>
                                <ChevronDown className="w-2.5 h-2.5 text-blue-700 absolute right-1.5 pointer-events-none" />
                              </div>
                              {catalogMap[item.ingredient_id]?.tipo === 'preparado' && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-700 shrink-0">
                                  🧪 Artesanal
                                </span>
                              )}
                              {item.unidade_medida === 'meia_un' && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">
                                  🍃 1/2 un
                                </span>
                              )}
                              {item.unidade_medida === 'un' && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">
                                  🍃 1 un
                                </span>
                              )}
                              {item.unidade_medida === 'g' && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 shrink-0">
                                  ⚖️ g
                                </span>
                              )}
                              {isGuarnicaoItem(item) ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shrink-0">
                                  🍃 Guarnição
                                </span>
                              ) : null}
                              {['rodela', 'fatia', 'gomo', 'zest', 'folha', 'ramo'].includes(item.unidade_medida) && !isGuarnicaoItem(item) && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">
                                  🍃 Guarnição
                                </span>
                              )}
                            </div>

                            {/* Seletor da Marca / Rótulo Comercial em uso (Apenas quando houver mais de uma marca) */}
                            {(() => {
                              const { brands, defaultBrand, hasMultipleBrands } = getBrandsForItem(item);
                              if (!hasMultipleBrands) return null;

                              return (
                                <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                                    Marca:
                                  </span>
                                  <select
                                    value={item.marca_escolhida_id || 'padrao'}
                                    onChange={(e) => handleUpdateIngredientBrand(idx, e.target.value)}
                                    className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-2 py-0.5 focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer max-w-[240px] truncate"
                                  >
                                    <option value="padrao">
                                      ⭐ Padrão ({defaultBrand?.marca || defaultBrand?.nome || 'Padrão'} - R$ {Number(defaultBrand?.custos_calculados?.custo_por_ml_g || 0).toFixed(4)}/ml)
                                    </option>
                                    {brands.map((b) => (
                                      <option key={b.id} value={b.id}>
                                        {b.marca || b.nome} (R$ {Number(b.custos_calculados?.custo_por_ml_g || 0).toFixed(4)}/{b.unidade_medida_base})
                                        {b.is_padrao_tipo ? ' [Padrão]' : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })()}

                            <p className="text-[11px] text-slate-500 mt-1">
                              Impacto no custo: <strong>{sharePct}%</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                          {/* Seletor Combinado: Quantidade + Unidade / Forma de Uso */}
                          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:border-emerald-500 shadow-2xs">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.quantidade_usada}
                              onChange={(e) =>
                                handleUpdateIngredientDose(idx, e.target.value)
                              }
                              className="w-14 text-right font-bold text-sm text-slate-900 focus:outline-none"
                            />
                            <select
                              value={item.unidade_medida || 'ml'}
                              onChange={(e) => handleUpdateIngredientUnit(idx, e.target.value)}
                              className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer border-l border-slate-200 pl-2 ml-1.5 py-0.5"
                              title="Forma de uso: ml, rodela, folha, fatia, etc."
                            >
                              {GARNISH_UNITS.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-20 text-right shrink-0">
                            <p className="text-sm font-extrabold text-slate-900">
                              R$ {Number(item.custo_parcial || 0).toFixed(2)}
                            </p>
                            <p className="text-[10px] text-slate-400">Custo</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSwappingIndex(idx);
                              setSwapSearch('');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer shrink-0"
                            title="Trocar este insumo por outro do estoque"
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer shrink-0"
                            title="Remover ingrediente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Card 3: Instruções Passo a Passo (para o Bartender no Service Mode) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-emerald-600" />
                  <span>3. Passos de Preparo (Exibidos no Balcão)</span>
                </h2>
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Passo
                </button>
              </div>

              <div className="space-y-2.5">
                {recipeForm.instrucoes_preparo.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    {/* Badge numérico gerado automaticamente */}
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold flex items-center justify-center shrink-0 select-none shadow-2xs">
                      {idx + 1}
                    </span>
                    <input
                      ref={(el) => (stepInputRefs.current[idx] = el)}
                      type="text"
                      value={step}
                      onChange={(e) => handleStepChange(idx, e.target.value)}
                      onKeyDown={(e) => handleStepKeyDown(e, idx)}
                      placeholder={`Passo ${idx + 1} (Ex: Gelar a taça, bater coqueteleira...)`}
                      className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx)}
                      disabled={recipeForm.instrucoes_preparo.length <= 1 && !step}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                      title="Excluir este passo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                <span className="inline-block text-xs">💡</span>
                <span>Pressione <strong>ENTER</strong> para adicionar um novo passo automaticamente logo abaixo.</span>
              </p>
            </div>
          </div>

          {/* ================================================================= */}
          {/* COLUNA DIREITA (5 Colunas): Preview do Copo + Donut + CMV Engine  */}
          {/* ================================================================= */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
            {/* Painel Visual: Preview do Copo & Gráfico em Anel Dinâmico */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Simulador Financeiro em Tempo Real
                  </span>
                  <h3 className="font-bold text-slate-900 text-lg">
                    {recipeForm.nome_coquetel || 'Novo Coquetel'}
                  </h3>
                </div>
                <span
                  className="px-3 py-1 rounded-full text-xs font-extrabold text-white shadow-xs"
                  style={{ backgroundColor: liveFinanceiro.statusCMV.hex }}
                >
                  {liveFinanceiro.statusCMV.label}
                </span>
              </div>

              {/* Grid: Preview do Copo (Esquerda) + Gráfico em Anel (Direita) */}
              <div className="grid grid-cols-2 gap-4 items-center">
                {/* Preview Dinâmico do Copo em Camadas */}
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Preview: {recipeForm.copo}
                  </p>

                  {/* Representação visual do copo com camadas proporcionais ao volume líquido */}
                  <div className="w-28 h-36 border-4 border-slate-300 border-t-0 rounded-b-3xl bg-white overflow-hidden flex flex-col-reverse shadow-inner relative">
                    {recipeForm.ingredientes.filter((item) => ['ml', 'dash'].includes(item.unidade_medida || 'ml')).length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-[11px] text-slate-300 font-semibold">
                        Vazio
                      </div>
                    ) : (
                      recipeForm.ingredientes
                        .filter((item) => ['ml', 'dash'].includes(item.unidade_medida || 'ml'))
                        .map((item, idx) => {
                          const heightPct =
                            liveFinanceiro.volumeTotal > 0
                              ? Math.max(
                                  10,
                                  (Number(item.quantidade_usada) /
                                    liveFinanceiro.volumeTotal) *
                                    100
                                )
                              : 25;
                          return (
                            <div
                              key={idx}
                              style={{
                                height: `${heightPct}%`,
                                backgroundColor:
                                  INGREDIENT_COLORS[idx % INGREDIENT_COLORS.length],
                              }}
                              className="w-full transition-all duration-300 flex items-center justify-center text-[10px] font-extrabold text-white/95 truncate px-1"
                              title={`${item.nome_exibicao}: ${item.quantidade_usada} ${item.unidade_medida}`}
                            >
                              {item.quantidade_usada} {item.unidade_medida}
                            </div>
                          );
                        })
                    )}
                  </div>

                  <p className="text-xs font-bold text-slate-700 mt-2.5">
                    {liveFinanceiro.volumeTotal} ml líquidos
                  </p>

                  {/* Guarnições adicionadas no coquetel (rodelas, folhas, zests) */}
                  {(() => {
                    const guarnicoes = recipeForm.ingredientes.filter(
                      (item) => !['ml', 'dash'].includes(item.unidade_medida || 'ml')
                    );
                    if (guarnicoes.length === 0) {
                      return (
                        <p className="text-[11px] text-slate-400 truncate max-w-full">
                          {recipeForm.guarnicao || 'Sem guarnição'}
                        </p>
                      );
                    }
                    return (
                      <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                        {guarnicoes.map((g, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200"
                          >
                            🍃 {g.quantidade_usada} {g.unidade_medida} de {g.nome_exibicao}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Gráfico em Anel Dinâmico (Donut Chart SVG) */}
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                    <PieChart className="w-3.5 h-3.5" /> Impacto no Custo
                  </p>

                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg viewBox="0 0 42 42" className="w-full h-full">
                      <circle
                        cx="21"
                        cy="21"
                        r="15.91549430918954"
                        fill="transparent"
                        stroke="#E2E8F0"
                        strokeWidth="5"
                      />
                      {donutSegments.map((seg, idx) => (
                        <circle
                          key={idx}
                          cx="21"
                          cy="21"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke={seg.color}
                          strokeWidth="5"
                          strokeDasharray={seg.strokeDasharray}
                          strokeDashoffset={seg.strokeDashoffset}
                        />
                      ))}
                    </svg>

                    {/* Centro do Anel: CMV % com Cor de Status */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        CMV Atual
                      </span>
                      <span
                        className="text-xl font-extrabold leading-none mt-0.5"
                        style={{ color: liveFinanceiro.statusCMV.hex }}
                      >
                        {liveFinanceiro.cmvPercentual.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-700 mt-2">
                    Custo: R$ {liveFinanceiro.custoTotal.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Calculadora de Preço Sugerido */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Sugestão Inteligente de Preço
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-emerald-800">Meta CMV:</span>
                    <div className="flex items-center bg-white border border-emerald-300 rounded-lg px-2 py-0.5">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        step="any"
                        value={metaCMV}
                        onChange={(e) => setMetaCMV(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-14 text-center text-xs font-extrabold text-emerald-900 focus:outline-none"
                      />
                      <span className="text-xs font-bold text-emerald-700">%</span>
                    </div>
                  </div>
                </div>

                {/* Botões Rápidos de Meta de CMV */}
                <div className="flex items-center gap-1.5">
                  {[18, 20, 22, 25, 28, 30].map((meta) => (
                    <button
                      key={meta}
                      type="button"
                      onClick={() => setMetaCMV(meta)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        Number(metaCMV) === meta
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {meta}%
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-emerald-200/70">
                  <div>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      Preço Sugerido (Custo / {metaCMV || 25}%):
                    </p>
                    <p className="text-xl font-extrabold text-emerald-900">
                      R$ {liveFinanceiro.precoSugerido.toFixed(2)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplySuggestedPrice}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    Aplicar Preço Sugerido
                  </button>
                </div>
              </div>

              {/* Bloco de Precificação Final e Lucro Bruto */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Preço de Venda no Cardápio (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                      R$
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={recipeForm.financeiro.preco_venda}
                      onChange={(e) =>
                        setRecipeForm({
                          ...recipeForm,
                          financeiro: {
                            ...recipeForm.financeiro,
                            preco_venda: e.target.value === '' ? '' : Number(e.target.value),
                          },
                        })
                      }
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-extrabold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Resumo Executivo: Custo Total | CMV (%) | Lucro Bruto */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] font-semibold text-slate-500">
                      Custo Insumos
                    </p>
                    <p className="text-base font-extrabold text-slate-900 mt-0.5">
                      R$ {liveFinanceiro.custoTotal.toFixed(2)}
                    </p>
                  </div>

                  <div
                    className="p-3 rounded-xl border"
                    style={{
                      borderColor: `${liveFinanceiro.statusCMV.hex}55`,
                      backgroundColor: `${liveFinanceiro.statusCMV.hex}12`,
                    }}
                  >
                    <p className="text-[11px] font-semibold text-slate-600">CMV Real</p>
                    <p
                      className="text-base font-extrabold mt-0.5"
                      style={{ color: liveFinanceiro.statusCMV.hex }}
                    >
                      {liveFinanceiro.cmvPercentual.toFixed(2)}%
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200">
                    <p className="text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Lucro Bruto
                    </p>
                    <p className="text-base font-extrabold text-blue-900 mt-0.5">
                      R$ {liveFinanceiro.lucroBruto.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Botão de Salvar Ficha Técnica */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                {savedFeedback ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">
                      Ficha Técnica Salva no Firestore!
                    </span>
                  </>
                ) : (
                  <span>
                    {saving ? 'Salvando Ficha...' : 'Salvar Ficha Técnica'}
                  </span>
                )}
              </button>

              {/* Botão de Duplicar dentro do Builder (para criar variações de fichas existentes) */}
              {Boolean(recipeForm.id) && (
                <button
                  type="button"
                  onClick={() => {
                    const cleanName = (recipeForm.nome_coquetel || 'Coquetel').replace(
                      /\s*\(Cópia.*\)/i,
                      ''
                    );
                    setRecipeForm((prev) => ({
                      ...prev,
                      id: '',
                      nome_coquetel: `${cleanName} (Cópia)`,
                    }));
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                  title="Cria uma nova ficha técnica desvinculada baseada nesta receita"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-500" />
                  <span>Salvar como Cópia (Duplicar)</span>
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Modal de Importação de Fichas em Lote */}
      <ModalImportarReceitas
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        existingRecipes={recipes}
        catalogIngredients={ingredientsCatalog}
        onImportSuccess={async (count) => {
          await carregarDados();
          setSavedFeedback(true);
          setTimeout(() => setSavedFeedback(false), 4000);
        }}
      />

      {/* Modal de Gerenciamento de Taças & Copos */}
      <ModalGerenciarCopos
        isOpen={isGlassesModalOpen}
        onClose={() => setIsGlassesModalOpen(false)}
        glasses={glasses}
        onGlassesChange={(updated) => {
          setGlasses(updated);
          carregarDados();
        }}
        currentSelectedGlass={recipeForm.copo}
        onSelectGlass={(selected) => {
          setRecipeForm((prev) => ({ ...prev, copo: selected }));
        }}
      />

      {/* Modal para Trocar / Substituir Insumo no Drinque */}
      {swappingIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Trocar / Substituir Insumo
                  </h2>
                  <p className="text-xs text-slate-500">
                    Substituindo{' '}
                    <strong className="text-slate-800">
                      {recipeForm.ingredientes[swappingIndex]?.nome_exibicao}
                    </strong>{' '}
                    (mantém a dose de{' '}
                    {recipeForm.ingredientes[swappingIndex]?.quantidade_usada}{' '}
                    {recipeForm.ingredientes[swappingIndex]?.unidade_medida})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSwappingIndex(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-slate-50/40">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={swapSearch}
                  onChange={(e) => setSwapSearch(e.target.value)}
                  placeholder="Pesquisar substituto (ex: Vodka, Xarope, Limão)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-2xs"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 max-h-96">
              {/* Tipos de Bebida / Categorias */}
              {swapSuggestions.typeResults.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Tipos de Bebida / Categorias
                  </p>
                  <div className="space-y-1">
                    {swapSuggestions.typeResults.map((t) => (
                      <button
                        key={`swap_type_${t.tipo_bebida}`}
                        type="button"
                        onClick={() => handleConfirmSwap(t)}
                        className="w-full p-2.5 rounded-xl hover:bg-blue-50 border border-slate-100 text-left flex items-center justify-between transition cursor-pointer"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            🍸 {t.tipo_bebida}
                          </p>
                          <p className="text-xs text-slate-400">
                            {t.brandsCount} marca(s) • Ex: {t.brandsList}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-100/60 px-2.5 py-1 rounded-lg">
                          Escolher Tipo
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Insumos Específicos do Estoque */}
              {swapSuggestions.specificResults.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Insumos Específicos do Estoque
                  </p>
                  <div className="space-y-1">
                    {swapSuggestions.specificResults.slice(0, 20).map((ing) => (
                      <button
                        key={`swap_ing_${ing.id}`}
                        type="button"
                        onClick={() => handleConfirmSwap(ing)}
                        className="w-full p-2.5 rounded-xl hover:bg-emerald-50 border border-slate-100 text-left flex items-center justify-between transition cursor-pointer"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {ing.nome}
                          </p>
                          <p className="text-xs text-slate-400">
                            {ing.marca ? `Marca: ${ing.marca} • ` : ''}
                            R$ {Number(ing.custos_calculados?.custo_por_ml_g || 0).toFixed(4)}/{ing.unidade_medida_base}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100/60 px-2.5 py-1 rounded-lg">
                          Substituir
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {swapSuggestions.typeResults.length === 0 &&
                swapSuggestions.specificResults.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-6">
                    Nenhum insumo encontrado para "{swapSearch}".
                  </p>
                )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSwappingIndex(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

