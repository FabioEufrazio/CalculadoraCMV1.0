/**
 * Motor Matemático de CMV e Rendimento (Seção 5 da Especificação Técnica)
 */

/**
 * Calcula o Yield (Rendimento percentual)
 * Fórmula: (Volume Extraído / Volume Comprado) * 100
 */
export function calcularYield(volumeExtraido, volumeComprado) {
  const extraido = Number(volumeExtraido) || 0;
  const comprado = Number(volumeComprado) || 0;
  if (comprado <= 0) return 0;
  return Number(((extraido / comprado) * 100).toFixed(2));
}

/**
 * Calcula o Volume Final Utilizável a partir do Volume Comprado e Percentual de Yield
 */
export function calcularVolumeUtilizavel(volumeComprado, percentualYield) {
  const comprado = Number(volumeComprado) || 0;
  const yieldPct = Number(percentualYield) || 0;
  if (comprado <= 0 || yieldPct <= 0) return 0;
  return Number(((comprado * yieldPct) / 100).toFixed(2));
}

/**
 * Calcula o Custo por ml/g (Insumo Processado)
 * Fórmula: Preço da Embalagem / Volume Extraído
 */
export function calcularCustoPorUnidadeBase(precoEmbalagem, volumeExtraido) {
  const preco = Number(precoEmbalagem) || 0;
  const extraido = Number(volumeExtraido) || 0;
  if (extraido <= 0) return 0;
  return Number((preco / extraido).toFixed(4));
}

/**
 * Calcula o Custo Parcial da Dose em uma Receita
 * Fórmula: Custo por ml/g * Quantidade Usada
 */
export function calcularCustoParcial(custoPorMlG, quantidadeUsada) {
  const custoUnitario = Number(custoPorMlG) || 0;
  const qtd = Number(quantidadeUsada) || 0;
  return Number((custoUnitario * qtd).toFixed(2));
}

/**
 * Calcula o CMV Percentual de uma Receita
 * Fórmula: (Soma dos Custos Parciais / Preço de Venda do Coquetel) * 100
 */
export function calcularCMVPercentual(custoTotal, precoVenda) {
  const custo = Number(custoTotal) || 0;
  const venda = Number(precoVenda) || 0;
  if (venda <= 0) return 0;
  return Number(((custo / venda) * 100).toFixed(2));
}

/**
 * Calcula a Sugestão de Preço Inteligente baseada na Meta de CMV (%)
 * Fórmula: Custo Total do Coquetel / (Meta de CMV% / 100)
 */
export function calcularPrecoSugerido(custoTotal, metaCMVPercentual = 25) {
  const custo = Number(custoTotal) || 0;
  const meta = Number(metaCMVPercentual) || 0;
  if (meta <= 0) return 0;
  return Number((custo / (meta / 100)).toFixed(2));
}

/**
 * Retorna a configuração de cor e status do CMV (Seção 7.1 da Especificação)
 * - Verde (#10B981): CMV Ideal (<= 25%)
 * - Amarelo (#F59E0B): CMV Aceitável (> 25% e <= 30%)
 * - Vermelho (#EF4444): CMV Crítico (> 30%)
 */
export function obterStatusCMV(cmvPercentual) {
  const cmv = Number(cmvPercentual) || 0;
  if (cmv <= 0) {
    return {
      label: "Aguardando dados",
      hex: "#64748B",
      bgClass: "bg-slate-100 text-slate-700 border-slate-300",
      badgeClass: "bg-slate-500",
    };
  }
  if (cmv <= 25) {
    return {
      label: "CMV Ideal",
      hex: "#10B981",
      bgClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      badgeClass: "bg-emerald-500",
    };
  }
  if (cmv <= 30) {
    return {
      label: "CMV Aceitável",
      hex: "#F59E0B",
      bgClass: "bg-amber-50 text-amber-700 border-amber-200",
      badgeClass: "bg-amber-500",
    };
  }
  return {
    label: "CMV Crítico",
    hex: "#EF4444",
    bgClass: "bg-red-50 text-red-700 border-red-200",
    badgeClass: "bg-red-500",
  };
}

/**
 * Unidades suportadas de guarnições e dosagem na coquetelaria
 */
export const GARNISH_UNITS = [
  { id: 'ml', label: 'ml', tipo: 'liquido' },
  { id: 'g', label: 'g', tipo: 'peso' },
  { id: 'un', label: '1 un', tipo: 'unidade', pesoPadraoG: 80 },
  { id: 'meia_un', label: '½ un', tipo: 'unidade', pesoPadraoG: 40 },
  { id: 'rodela', label: 'rodela', tipo: 'guarnicao', pesoPadraoG: 15 },
  { id: 'fatia', label: 'fatia', tipo: 'guarnicao', pesoPadraoG: 15 },
  { id: 'gomo', label: 'gomo', tipo: 'guarnicao', pesoPadraoG: 20 },
  { id: 'zest', label: 'zest', tipo: 'guarnicao', pesoPadraoG: 3 },
  { id: 'folha', label: 'folha', tipo: 'guarnicao', pesoPadraoG: 1 },
  { id: 'ramo', label: 'ramo', tipo: 'guarnicao', pesoPadraoG: 5 },
  { id: 'dash', label: 'dash', tipo: 'liquido', mlPadrao: 0.8 },
];

/**
 * Converte qualquer quantidade e unidade de guarnição para a unidade base do insumo (g, ml, un)
 */
export function converterParaUnidadeBase(quantidade, unidadeEscolhida, insumo) {
  const qtd = Number(quantidade) || 0;
  if (qtd <= 0) return 0;
  const baseUnit = insumo?.unidade_medida_base || 'ml';

  if (unidadeEscolhida === baseUnit) {
    return qtd;
  }

  const equiv = insumo?.equivalencias || {};

  switch (unidadeEscolhida) {
    case 'rodela':
      return qtd * (Number(equiv.rodela_g) || 15);
    case 'fatia':
      return qtd * (Number(equiv.fatia_g) || 15);
    case 'gomo':
      return qtd * (Number(equiv.gomo_g) || 20);
    case 'zest':
      return qtd * (Number(equiv.zest_g) || 3);
    case 'folha':
      return qtd * (Number(equiv.folha_g) || 1);
    case 'ramo':
      return qtd * (Number(equiv.ramo_g) || 5);
    case 'dash':
      return qtd * (Number(equiv.dash_ml) || 0.8);
    case 'un':
      if (baseUnit === 'un') return qtd;
      return qtd * (Number(equiv.unidade_g) || 80);
    case 'meia_un':
      if (baseUnit === 'un') return qtd * 0.5;
      const pesoMeia = Number(equiv.meia_unidade_g) || (Number(equiv.unidade_g) ? Number(equiv.unidade_g) / 2 : 40);
      return qtd * pesoMeia;
    case 'ml':
    case 'g':
    default:
      return qtd;
  }
}

/**
 * Calcula o custo parcial de um ingrediente considerando conversões de guarnição
 */
export function calcularCustoItemReceita(quantidade, unidadeEscolhida, insumo) {
  const custoUnitario = Number(insumo?.custos_calculados?.custo_por_ml_g || 0);
  const qtdBase = converterParaUnidadeBase(quantidade, unidadeEscolhida, insumo);
  return Number((custoUnitario * qtdBase).toFixed(2));
}

/**
 * Remove acentos e converte para minúsculas para buscas insensíveis a acentuação
 * Ex: 'Açúcar' -> 'acucar', 'Limão' -> 'limao', 'Cachaça' -> 'cachaca'
 */
export function normalizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Identifica se um ingrediente é classificado como Guarnição
 * (por unidade de corte/adorno, categoria, tipo ou palavras-chave comuns de coquetelaria)
 */
export function isGuarnicaoItem(ing) {
  if (!ing) return false;
  const unit = (ing.unidade_medida || '').toLowerCase().trim();
  const tipo = (ing.tipo_bebida || ing.categoria || '').toLowerCase().trim();
  const name = (ing.nome_exibicao || ing.nome || '').toLowerCase().trim();

  // 1. Unidades exclusivas de guarnições / cortes
  if (['rodela', 'fatia', 'gomo', 'zest', 'folha', 'ramo'].includes(unit)) {
    return true;
  }
  // 2. Classificação explícita por tipo ou categoria
  if (tipo.includes('guarniç') || tipo.includes('guarnic')) {
    return true;
  }
  // 3. Palavras-chave no nome do insumo
  if (
    name.includes('guarniç') ||
    name.includes('guarnic') ||
    name.includes('cereja') ||
    name.includes('hortaliça') ||
    name.includes('hortalica') ||
    name.includes('hortelã') ||
    name.includes('hortela') ||
    name.includes('manjericão') ||
    name.includes('manjericao') ||
    name.includes('alecrim') ||
    name.includes('zest') ||
    name.includes('casca') ||
    name.includes('borda de sal') ||
    name.includes('sal negro') ||
    name.includes('especiaria') ||
    name.includes('espeto') ||
    name.includes('twist')
  ) {
    return true;
  }
  // 4. Frutas in natura inteiras ou fracionadas usadas como adorno
  if (
    (unit === 'un' || unit === 'meia_un') &&
    (name.includes('limão') ||
      name.includes('limao') ||
      name.includes('laranja') ||
      name.includes('uva') ||
      name.includes('amora') ||
      name.includes('morango') ||
      name.includes('framboesa') ||
      name.includes('abacaxi'))
  ) {
    return true;
  }

  return false;
}



