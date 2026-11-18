import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/firebaseConfig';

const STORAGE_KEYS = {
  suppliers: 'cmv_bar_suppliers_v1',
  ingredients: 'cmv_bar_ingredients_v1',
  recipes: 'cmv_bar_recipes_v1',
  salesLog: 'cmv_bar_sales_log_v1',
  categories: 'cmv_bar_categories_v1',
  units: 'cmv_bar_units_v1',
  glasses: 'cmv_bar_glasses_v1',
};

export const INITIAL_CATEGORIES = [
  'Destilado',
  'Licor',
  'Cítrico',
  'Xarope',
  'Amargo / Bitter',
  'Espumante / Vinho',
  'Guarnição',
  'Refrigerante / Suco',
  'Outros',
];

export const INITIAL_BEVERAGE_TYPES = [
  'Gin London Dry',
  'Vodka',
  'Rum Branco',
  'Rum Ouro / Envelhecido',
  'Tequila Blanco',
  'Tequila Reposado',
  'Bourbon Whiskey',
  'Scotch Whisky',
  'Cachaça Branca',
  'Cachaça Envelhecida',
  'Vermute Tinto Doce',
  'Vermute Seco',
  'Licor Triple Sec / Laranja',
  'Bitter Italiano (Campari/Aperol)',
  'Espumante Brut / Prosecco',
  'Vinho Branco',
  'Vinho Tinto',
  'Cerveja / Água Tônica',
  'Cítrico',
  'Xarope',
  'Outros',
];

export const INITIAL_UNITS = [
  { id: 'ml', label: 'Mililitros (ml)', abreviacao: 'ml' },
  { id: 'g', label: 'Gramas (g)', abreviacao: 'g' },
  { id: 'rodela', label: 'Rodela(s)', abreviacao: 'rodela' },
  { id: 'fatia', label: 'Fatia(s)', abreviacao: 'fatia' },
  { id: 'gomo', label: 'Gomo(s)', abreviacao: 'gomo' },
  { id: 'zest', label: 'Zest / Casca', abreviacao: 'zest' },
  { id: 'folha', label: 'Folha(s)', abreviacao: 'folha' },
  { id: 'ramo', label: 'Ramo(s)', abreviacao: 'ramo' },
  { id: 'un', label: 'Unidade (un)', abreviacao: 'un' },
  { id: 'dash', label: 'Lances / Dash (dash)', abreviacao: 'dash' },
];

export function listarCategorias() {
  return getLocalData(STORAGE_KEYS.categories, INITIAL_CATEGORIES);
}

export function salvarCategoria(nome) {
  const limpo = nome.trim();
  if (!limpo) return listarCategorias();
  const list = listarCategorias();
  if (!list.includes(limpo)) {
    list.push(limpo);
    setLocalData(STORAGE_KEYS.categories, list);
  }
  return list;
}

export function excluirCategoria(nome) {
  const list = listarCategorias().filter((c) => c !== nome);
  setLocalData(STORAGE_KEYS.categories, list);
  return list;
}

export function listarUnidades() {
  return getLocalData(STORAGE_KEYS.units, INITIAL_UNITS);
}

export function salvarUnidade(unidade) {
  const list = listarUnidades();
  const id = (unidade.id || unidade.abreviacao || '').toLowerCase().trim();
  if (!id) return list;
  const item = {
    id,
    label: unidade.label.trim(),
    abreviacao: (unidade.abreviacao || id).trim(),
  };
  const idx = list.findIndex((u) => u.id === id);
  if (idx >= 0) {
    list[idx] = item;
  } else {
    list.push(item);
  }
  setLocalData(STORAGE_KEYS.units, list);
  return list;
}

export function excluirUnidade(id) {
  const list = listarUnidades().filter((u) => u.id !== id);
  setLocalData(STORAGE_KEYS.units, list);
  return list;
}

export const INITIAL_GLASSES = [
  'Coupé',
  'Rocks / Old Fashioned',
  'Highball (Longo)',
  'Nick & Nora',
  'Taça Balão / Gin',
  'Martini / Cocktail',
  'Collins',
  'Caneca Moscow Mule',
  'Shot / Dose',
  'Cálice',
];

export function listarCopos() {
  return getLocalData(STORAGE_KEYS.glasses, INITIAL_GLASSES);
}

export function salvarCopo(nome) {
  const limpo = (nome || '').trim();
  if (!limpo) return listarCopos();
  const list = listarCopos();
  const existe = list.some((g) => g.toLowerCase() === limpo.toLowerCase());
  if (!existe) {
    list.push(limpo);
    setLocalData(STORAGE_KEYS.glasses, list);
  }
  return list;
}

export function editarCopo(antigoNome, novoNome) {
  const limpo = (novoNome || '').trim();
  if (!limpo || antigoNome === limpo) return listarCopos();
  const list = listarCopos().map((g) => (g === antigoNome ? limpo : g));
  setLocalData(STORAGE_KEYS.glasses, list);

  // Sincroniza o novo nome nas receitas já existentes
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.recipes);
    if (raw) {
      const recipes = JSON.parse(raw);
      let alterou = false;
      const atualizadas = recipes.map((r) => {
        if (r.copo === antigoNome) {
          alterou = true;
          return { ...r, copo: limpo };
        }
        return r;
      });
      if (alterou) {
        setLocalData(STORAGE_KEYS.recipes, atualizadas);
      }
    }
  } catch (err) {
    console.warn('Aviso ao sincronizar copo nas receitas:', err);
  }

  return list;
}

export function excluirCopo(nome) {
  const list = listarCopos().filter((g) => g !== nome);
  const finalList = list.length > 0 ? list : ['Coupé'];
  setLocalData(STORAGE_KEYS.glasses, finalList);
  return finalList;
}

export function restaurarCoposPadrao() {
  setLocalData(STORAGE_KEYS.glasses, INITIAL_GLASSES);
  return [...INITIAL_GLASSES];
}

/**
 * Dados iniciais (Seed) fiéis aos exemplos da Especificação Técnica (Seção 3.2, 3.3 e 3.4)
 */
const INITIAL_SUPPLIERS = [
  {
    id: 'sup_01',
    nome_empresa: 'Distribuidora de Bebidas X',
    contato: '+5511999999999',
    prazo_entrega_dias: 2,
    dias_pedido: ['Segunda', 'Quinta'],
  },
  {
    id: 'sup_02',
    nome_empresa: 'Hortifruti Premium Sabor',
    contato: '+5511988887777',
    prazo_entrega_dias: 1,
    dias_pedido: ['Segunda', 'Quarta', 'Sexta'],
  },
  {
    id: 'sup_03',
    nome_empresa: 'Importadora Spirits & Co.',
    contato: '+5511977776666',
    prazo_entrega_dias: 3,
    dias_pedido: ['Terça'],
  },
];

const INITIAL_INGREDIENTS = [
  {
    id: 'ing_01',
    nome: 'Limão Tahiti (Suco)',
    categoria: 'Cítrico',
    tipo_bebida: 'Cítrico',
    marca: 'Hortifruti Fresco',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_02',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 10.0,
      volume_comprado: 1000,
      unidade_compra: 'g',
    },
    rendimento: {
      percentual_yield: 40,
      volume_final_utilizavel: 400,
    },
    custos_calculados: {
      custo_por_ml_g: 0.025,
    },
    estoque: {
      quantidade_atual: 1500,
      estoque_minimo: 500,
    },
    equivalencias: {
      unidade_g: 80,
      meia_unidade_g: 40,
      rodela_g: 15,
      fatia_g: 15,
      gomo_g: 20,
      zest_g: 3,
      folha_g: 1,
      ramo_g: 5,
    },
  },
  {
    id: 'ing_02',
    nome: 'Tequila José Cuervo Tradicional Silver 750ml',
    categoria: 'Destilado',
    tipo_bebida: 'Tequila Blanco',
    marca: 'José Cuervo Tradicional Silver',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 105.0,
      volume_comprado: 750,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 750,
    },
    custos_calculados: {
      custo_por_ml_g: 0.14,
    },
    estoque: {
      quantidade_atual: 2250,
      estoque_minimo: 750,
    },
  },
  {
    id: 'ing_tequila_1800',
    nome: 'Tequila 1800 Blanco 750ml',
    categoria: 'Destilado',
    tipo_bebida: 'Tequila Blanco',
    marca: '1800 Tequila Blanco',
    is_padrao_tipo: false,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 210.0,
      volume_comprado: 750,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 750,
    },
    custos_calculados: {
      custo_por_ml_g: 0.28,
    },
    estoque: {
      quantidade_atual: 1500,
      estoque_minimo: 750,
    },
  },
  {
    id: 'ing_03',
    nome: 'Licor Stock Triple Sec 700ml',
    categoria: 'Licor',
    tipo_bebida: 'Licor Triple Sec / Laranja',
    marca: 'Stock Triple Sec',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_01',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 63.0,
      volume_comprado: 700,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 700,
    },
    custos_calculados: {
      custo_por_ml_g: 0.09,
    },
    estoque: {
      quantidade_atual: 450,
      estoque_minimo: 500,
    },
  },
  {
    id: 'ing_cointreau',
    nome: 'Licor Cointreau L’Unique 700ml',
    categoria: 'Licor',
    tipo_bebida: 'Licor Triple Sec / Laranja',
    marca: 'Cointreau L’Unique',
    is_padrao_tipo: false,
    fornecedor_id: 'sup_01',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 140.0,
      volume_comprado: 700,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 700,
    },
    custos_calculados: {
      custo_por_ml_g: 0.20,
    },
    estoque: {
      quantidade_atual: 700,
      estoque_minimo: 350,
    },
  },
  {
    id: 'ing_04',
    nome: 'Xarope de Agave / Simples',
    categoria: 'Xarope',
    tipo: 'preparado',
    tipo_bebida: 'Xarope',
    marca: 'Artesanal da Casa',
    is_padrao_tipo: true,
    fornecedor_id: '',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 18.0,
      volume_comprado: 1000,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 1000,
    },
    custos_calculados: {
      custo_por_ml_g: 0.018,
    },
    estoque: {
      quantidade_atual: 1200,
      estoque_minimo: 400,
    },
    ingredientes_base: [
      {
        insumo_id: 'ing_06',
        nome: 'Açúcar Refinado',
        quantidade: 500,
        unidade: 'g',
        custo_unitario: 0.005,
        custo_parcial: 2.5,
      },
      {
        insumo_id: 'ing_07',
        nome: 'Água Mineral / Filtrada',
        quantidade: 500,
        unidade: 'ml',
        custo_unitario: 0.002,
        custo_parcial: 1.0,
      },
    ],
    instrucoes_preparo: 'Aquecer 500ml de água até perto da fervura, adicionar 500g de açúcar refinado e misturar com fouet até total dissolução. Engarrafar em garrafa esterilizada e manter sob refrigeração.',
  },
  {
    id: 'ing_05',
    nome: "Gin Gordon's London Dry 750ml",
    categoria: 'Destilado',
    tipo: 'simples',
    tipo_bebida: 'Gin London Dry',
    marca: "Gordon's London Dry",
    is_padrao_tipo: true,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 52.0,
      volume_comprado: 750,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 750,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0693,
    },
    estoque: {
      quantidade_atual: 2250,
      estoque_minimo: 750,
    },
  },
  {
    id: 'ing_gin_tanqueray',
    nome: 'Gin Tanqueray London Dry 750ml',
    categoria: 'Destilado',
    tipo: 'simples',
    tipo_bebida: 'Gin London Dry',
    marca: 'Tanqueray London Dry',
    is_padrao_tipo: false,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 95.0,
      volume_comprado: 750,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 750,
    },
    custos_calculados: {
      custo_por_ml_g: 0.1267,
    },
    estoque: {
      quantidade_atual: 1500,
      estoque_minimo: 750,
    },
  },
  {
    id: 'ing_gin_beefeater',
    nome: 'Gin Beefeater London Dry 750ml',
    categoria: 'Destilado',
    tipo: 'simples',
    tipo_bebida: 'Gin London Dry',
    marca: 'Beefeater London Dry',
    is_padrao_tipo: false,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 82.0,
      volume_comprado: 750,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 750,
    },
    custos_calculados: {
      custo_por_ml_g: 0.1093,
    },
    estoque: {
      quantidade_atual: 1500,
      estoque_minimo: 750,
    },
  },
  {
    id: 'ing_vodka_smirnoff',
    nome: 'Vodka Smirnoff No. 21 Red 998ml',
    categoria: 'Destilado',
    tipo: 'simples',
    tipo_bebida: 'Vodka',
    marca: 'Smirnoff No. 21 Red',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 42.0,
      volume_comprado: 998,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 998,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0421,
    },
    estoque: {
      quantidade_atual: 2994,
      estoque_minimo: 998,
    },
  },
  {
    id: 'ing_vodka_absolut',
    nome: 'Vodka Absolut Original 1000ml',
    categoria: 'Destilado',
    tipo: 'simples',
    tipo_bebida: 'Vodka',
    marca: 'Absolut Original',
    is_padrao_tipo: false,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 89.0,
      volume_comprado: 1000,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 1000,
    },
    custos_calculados: {
      custo_por_ml_g: 0.089,
    },
    estoque: {
      quantidade_atual: 2000,
      estoque_minimo: 1000,
    },
  },
  {
    id: 'ing_rum_bacardi',
    nome: 'Rum Bacardi Carta Blanca 980ml',
    categoria: 'Destilado',
    tipo: 'simples',
    tipo_bebida: 'Rum Branco',
    marca: 'Bacardi Carta Blanca',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 48.0,
      volume_comprado: 980,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 980,
    },
    custos_calculados: {
      custo_por_ml_g: 0.049,
    },
    estoque: {
      quantidade_atual: 1960,
      estoque_minimo: 980,
    },
  },
  {
    id: 'ing_rum_havana',
    nome: 'Rum Havana Club 3 Anos 750ml',
    categoria: 'Destilado',
    tipo: 'simples',
    tipo_bebida: 'Rum Branco',
    marca: 'Havana Club 3 Anos',
    is_padrao_tipo: false,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 68.0,
      volume_comprado: 750,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 750,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0907,
    },
    estoque: {
      quantidade_atual: 1500,
      estoque_minimo: 750,
    },
  },
  {
    id: 'ing_06',
    nome: 'Açúcar Refinado',
    categoria: 'Outros',
    tipo: 'simples',
    tipo_bebida: 'Outros',
    marca: 'União',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_02',
    unidade_medida_base: 'g',
    compra: {
      preco_embalagem: 5.0,
      volume_comprado: 1000,
      unidade_compra: 'g',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 1000,
    },
    custos_calculados: {
      custo_por_ml_g: 0.005,
    },
    estoque: {
      quantidade_atual: 5000,
      estoque_minimo: 1000,
    },
  },
  {
    id: 'ing_07',
    nome: 'Água Mineral / Filtrada',
    categoria: 'Outros',
    tipo: 'simples',
    tipo_bebida: 'Outros',
    marca: 'Fonte Natural',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_02',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 2.0,
      volume_comprado: 1000,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 1000,
    },
    custos_calculados: {
      custo_por_ml_g: 0.002,
    },
    estoque: {
      quantidade_atual: 10000,
      estoque_minimo: 2000,
    },
  },
  {
    id: 'ing_gin_lassaleti',
    nome: 'Gin Lassaleti London Dry 700ml',
    categoria: 'Destilado',
    tipo: 'simples',
    tipo_bebida: 'Gin London Dry',
    marca: 'Lassaleti London Dry',
    is_padrao_tipo: false,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 89.90,
      volume_comprado: 700,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 700,
    },
    custos_calculados: {
      custo_por_ml_g: 0.1284,
    },
    estoque: {
      quantidade_atual: 1400,
      estoque_minimo: 700,
    },
  },
  {
    id: 'ing_rum_bacardi_oro',
    nome: 'Rum Bacardi Carta Oro 980ml',
    categoria: 'Destilado',
    tipo: 'simples',
    tipo_bebida: 'Rum Ouro / Envelhecido',
    marca: 'Bacardi Carta Oro',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 52.0,
      volume_comprado: 980,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 980,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0531,
    },
    estoque: {
      quantidade_atual: 1960,
      estoque_minimo: 980,
    },
  },
  {
    id: 'ing_campari',
    nome: 'Bitter Campari 900ml',
    categoria: 'Amargo / Bitter',
    tipo: 'simples',
    tipo_bebida: 'Bitter Italiano (Campari/Aperol)',
    marca: 'Campari',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 54.90,
      volume_comprado: 900,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 900,
    },
    custos_calculados: {
      custo_por_ml_g: 0.061,
    },
    estoque: {
      quantidade_atual: 1800,
      estoque_minimo: 900,
    },
  },
  {
    id: 'ing_aperol',
    nome: 'Aperol Aperitivo 750ml',
    categoria: 'Amargo / Bitter',
    tipo: 'simples',
    tipo_bebida: 'Bitter Italiano (Campari/Aperol)',
    marca: 'Aperol',
    is_padrao_tipo: false,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 58.0,
      volume_comprado: 750,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 750,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0773,
    },
    estoque: {
      quantidade_atual: 1500,
      estoque_minimo: 750,
    },
  },
  {
    id: 'ing_vermouth_rosso',
    nome: 'Vermouth Martini Rosso 750ml',
    categoria: 'Espumante / Vinho',
    tipo: 'simples',
    tipo_bebida: 'Vermute Tinto Doce',
    marca: 'Martini Rosso',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 44.0,
      volume_comprado: 750,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 750,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0587,
    },
    estoque: {
      quantidade_atual: 1500,
      estoque_minimo: 750,
    },
  },
  {
    id: 'ing_whisky_black_label',
    nome: 'Whisky Johnnie Walker Black Label 1L',
    categoria: 'Destilado',
    tipo: 'simples',
    tipo_bebida: 'Scotch Whisky',
    marca: 'Johnnie Walker Black Label',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 189.0,
      volume_comprado: 1000,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 1000,
    },
    custos_calculados: {
      custo_por_ml_g: 0.189,
    },
    estoque: {
      quantidade_atual: 2000,
      estoque_minimo: 1000,
    },
  },
  {
    id: 'ing_bourbon_jim_beam',
    nome: 'Bourbon Whiskey Jim Beam White 1L',
    categoria: 'Destilado',
    tipo: 'simples',
    tipo_bebida: 'Bourbon Whiskey',
    marca: 'Jim Beam White',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 109.0,
      volume_comprado: 1000,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 1000,
    },
    custos_calculados: {
      custo_por_ml_g: 0.109,
    },
    estoque: {
      quantidade_atual: 2000,
      estoque_minimo: 1000,
    },
  },
  {
    id: 'ing_cachaca_sagatiba',
    nome: 'Cachaça Sagatiba Branca 700ml',
    categoria: 'Destilado',
    tipo: 'simples',
    tipo_bebida: 'Cachaça Branca',
    marca: 'Sagatiba Branca',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_01',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 34.90,
      volume_comprado: 700,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 700,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0499,
    },
    estoque: {
      quantidade_atual: 1400,
      estoque_minimo: 700,
    },
  },
  {
    id: 'ing_bitter_angostura',
    nome: 'Bitter Angostura Aromatic 100ml',
    categoria: 'Amargo / Bitter',
    tipo: 'simples',
    tipo_bebida: 'Amargo / Bitter',
    marca: 'Angostura Aromatic',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_03',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 119.0,
      volume_comprado: 100,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 100,
    },
    custos_calculados: {
      custo_por_ml_g: 1.19,
    },
    estoque: {
      quantidade_atual: 200,
      estoque_minimo: 100,
    },
  },
  {
    id: 'ing_prosecco_salton',
    nome: 'Espumante Salton Prosecco Brut 750ml',
    categoria: 'Espumante / Vinho',
    tipo: 'simples',
    tipo_bebida: 'Espumante Brut / Prosecco',
    marca: 'Salton Prosecco',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_01',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 42.90,
      volume_comprado: 750,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 750,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0572,
    },
    estoque: {
      quantidade_atual: 1500,
      estoque_minimo: 750,
    },
  },
  {
    id: 'ing_monin_amora',
    nome: 'Xarope Monin Amora (Blackberry) 700ml',
    categoria: 'Xarope',
    tipo: 'simples',
    tipo_bebida: 'Xarope',
    marca: 'Monin Amora',
    is_padrao_tipo: false,
    fornecedor_id: 'sup_01',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 69.90,
      volume_comprado: 700,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 700,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0999,
    },
    estoque: {
      quantidade_atual: 700,
      estoque_minimo: 350,
    },
  },
  {
    id: 'ing_monin_cranberry',
    nome: 'Xarope Monin Cranberry 700ml',
    categoria: 'Xarope',
    tipo: 'simples',
    tipo_bebida: 'Xarope',
    marca: 'Monin Cranberry',
    is_padrao_tipo: false,
    fornecedor_id: 'sup_01',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 69.90,
      volume_comprado: 700,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 700,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0999,
    },
    estoque: {
      quantidade_atual: 700,
      estoque_minimo: 350,
    },
  },
  {
    id: 'ing_monin_amendoas',
    nome: 'Xarope Monin Amêndoas (Orgeat) 700ml',
    categoria: 'Xarope',
    tipo: 'simples',
    tipo_bebida: 'Xarope',
    marca: 'Monin Amêndoas (Orgeat)',
    is_padrao_tipo: false,
    fornecedor_id: 'sup_01',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 69.90,
      volume_comprado: 700,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 700,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0999,
    },
    estoque: {
      quantidade_atual: 700,
      estoque_minimo: 350,
    },
  },
  {
    id: 'ing_monin_tangerina',
    nome: 'Xarope Monin Tangerina 700ml',
    categoria: 'Xarope',
    tipo: 'simples',
    tipo_bebida: 'Xarope',
    marca: 'Monin Tangerina',
    is_padrao_tipo: false,
    fornecedor_id: 'sup_01',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 69.90,
      volume_comprado: 700,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 700,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0999,
    },
    estoque: {
      quantidade_atual: 700,
      estoque_minimo: 350,
    },
  },
  {
    id: 'ing_monin_framboesa',
    nome: 'Xarope Monin Framboesa 700ml',
    categoria: 'Xarope',
    tipo: 'simples',
    tipo_bebida: 'Xarope',
    marca: 'Monin Framboesa',
    is_padrao_tipo: false,
    fornecedor_id: 'sup_01',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 69.90,
      volume_comprado: 700,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 700,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0999,
    },
    estoque: {
      quantidade_atual: 700,
      estoque_minimo: 350,
    },
  },
  {
    id: 'ing_agua_gas',
    nome: 'Água Mineral com Gás 500ml',
    categoria: 'Refrigerante / Suco',
    tipo: 'simples',
    tipo_bebida: 'Outros',
    marca: 'Crystal / Minalba',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_02',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 2.50,
      volume_comprado: 500,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 500,
    },
    custos_calculados: {
      custo_por_ml_g: 0.005,
    },
    estoque: {
      quantidade_atual: 5000,
      estoque_minimo: 1500,
    },
  },
  {
    id: 'ing_agua_tonica',
    nome: 'Água Tônica Schweppes 350ml',
    categoria: 'Refrigerante / Suco',
    tipo: 'simples',
    tipo_bebida: 'Cerveja / Água Tônica',
    marca: 'Schweppes',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_01',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 3.80,
      volume_comprado: 350,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 350,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0109,
    },
    estoque: {
      quantidade_atual: 4200,
      estoque_minimo: 1400,
    },
  },
  {
    id: 'ing_limao_siciliano',
    nome: 'Limão Siciliano Fresco (Suco & Guarnição)',
    categoria: 'Cítrico',
    tipo: 'simples',
    tipo_bebida: 'Cítrico',
    marca: 'Hortifruti Fresco',
    is_padrao_tipo: false,
    fornecedor_id: 'sup_02',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 14.0,
      volume_comprado: 1000,
      unidade_compra: 'g',
    },
    rendimento: {
      percentual_yield: 35,
      volume_final_utilizavel: 350,
    },
    custos_calculados: {
      custo_por_ml_g: 0.040,
    },
    estoque: {
      quantidade_atual: 2000,
      estoque_minimo: 500,
    },
    equivalencias: {
      unidade_g: 100,
      meia_unidade_g: 50,
      rodela_g: 15,
      fatia_g: 15,
      gomo_g: 20,
      zest_g: 3,
      folha_g: 1,
      ramo_g: 5,
    },
  },
  {
    id: 'ing_laranja_bahia',
    nome: 'Laranja Bahia Fresca (Guarnições & Rodelas)',
    categoria: 'Guarnição',
    tipo: 'simples',
    tipo_bebida: 'Cítrico',
    marca: 'Hortifruti Fresco',
    is_padrao_tipo: false,
    fornecedor_id: 'sup_02',
    unidade_medida_base: 'g',
    compra: {
      preco_embalagem: 8.50,
      volume_comprado: 1000,
      unidade_compra: 'g',
    },
    rendimento: {
      percentual_yield: 60,
      volume_final_utilizavel: 600,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0142,
    },
    estoque: {
      quantidade_atual: 3000,
      estoque_minimo: 1000,
    },
    equivalencias: {
      unidade_g: 180,
      meia_unidade_g: 90,
      rodela_g: 25,
      fatia_g: 20,
      gomo_g: 30,
      zest_g: 4,
      folha_g: 1,
      ramo_g: 5,
    },
  },
  {
    id: 'ing_hortela',
    nome: 'Hortelã Fresca (Maço)',
    categoria: 'Guarnição',
    tipo: 'simples',
    tipo_bebida: 'Guarnição',
    marca: 'Hortifruti Fresco',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_02',
    unidade_medida_base: 'g',
    compra: {
      preco_embalagem: 3.50,
      volume_comprado: 100,
      unidade_compra: 'g',
    },
    rendimento: {
      percentual_yield: 70,
      volume_final_utilizavel: 70,
    },
    custos_calculados: {
      custo_por_ml_g: 0.050,
    },
    estoque: {
      quantidade_atual: 200,
      estoque_minimo: 50,
    },
    equivalencias: {
      unidade_g: 1,
      meia_unidade_g: 0.5,
      rodela_g: 1,
      fatia_g: 1,
      gomo_g: 1,
      zest_g: 1,
      folha_g: 0.5,
      ramo_g: 3,
    },
  },
  {
    id: 'ing_manjericao',
    nome: 'Manjericão Fresco (Maço)',
    categoria: 'Guarnição',
    tipo: 'simples',
    tipo_bebida: 'Guarnição',
    marca: 'Hortifruti Fresco',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_02',
    unidade_medida_base: 'g',
    compra: {
      preco_embalagem: 3.50,
      volume_comprado: 100,
      unidade_compra: 'g',
    },
    rendimento: {
      percentual_yield: 70,
      volume_final_utilizavel: 70,
    },
    custos_calculados: {
      custo_por_ml_g: 0.050,
    },
    estoque: {
      quantidade_atual: 200,
      estoque_minimo: 50,
    },
    equivalencias: {
      unidade_g: 1,
      meia_unidade_g: 0.5,
      rodela_g: 1,
      fatia_g: 1,
      gomo_g: 1,
      zest_g: 1,
      folha_g: 0.5,
      ramo_g: 3,
    },
  },
  {
    id: 'ing_gengibre',
    nome: 'Gengibre Fresco In Natura 1kg',
    categoria: 'Outros',
    tipo: 'simples',
    tipo_bebida: 'Outros',
    marca: 'Hortifruti Fresco',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_02',
    unidade_medida_base: 'g',
    compra: {
      preco_embalagem: 16.0,
      volume_comprado: 1000,
      unidade_compra: 'g',
    },
    rendimento: {
      percentual_yield: 80,
      volume_final_utilizavel: 800,
    },
    custos_calculados: {
      custo_por_ml_g: 0.020,
    },
    estoque: {
      quantidade_atual: 2000,
      estoque_minimo: 500,
    },
  },
  {
    id: 'ing_maracuja',
    nome: 'Polpa de Maracujá Fresca 1kg',
    categoria: 'Refrigerante / Suco',
    tipo: 'simples',
    tipo_bebida: 'Outros',
    marca: 'Hortifruti Fresco',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_02',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 24.0,
      volume_comprado: 1000,
      unidade_compra: 'g',
    },
    rendimento: {
      percentual_yield: 90,
      volume_final_utilizavel: 900,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0267,
    },
    estoque: {
      quantidade_atual: 1800,
      estoque_minimo: 500,
    },
  },
  {
    id: 'ing_uvas_verdes',
    nome: 'Uvas Verdes Thompson (Bandeja 500g)',
    categoria: 'Guarnição',
    tipo: 'simples',
    tipo_bebida: 'Guarnição',
    marca: 'Hortifruti Fresco',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_02',
    unidade_medida_base: 'un',
    compra: {
      preco_embalagem: 11.50,
      volume_comprado: 500,
      unidade_compra: 'g',
    },
    rendimento: {
      percentual_yield: 95,
      volume_final_utilizavel: 475,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0242,
    },
    estoque: {
      quantidade_atual: 950,
      estoque_minimo: 200,
    },
    equivalencias: {
      unidade_g: 7,
      meia_unidade_g: 3.5,
      rodela_g: 3.5,
      fatia_g: 3.5,
      gomo_g: 7,
      zest_g: 1,
      folha_g: 1,
      ramo_g: 7,
    },
  },
  {
    id: 'ing_albumina',
    nome: 'Albumina em Pó 500g',
    categoria: 'Outros',
    tipo: 'simples',
    tipo_bebida: 'Outros',
    marca: 'Naturovos',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_02',
    unidade_medida_base: 'g',
    compra: {
      preco_embalagem: 38.0,
      volume_comprado: 500,
      unidade_compra: 'g',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 500,
    },
    custos_calculados: {
      custo_por_ml_g: 0.076,
    },
    estoque: {
      quantidade_atual: 1000,
      estoque_minimo: 250,
    },
  },
  {
    id: 'ing_capsula_n2o',
    nome: 'Cápsula de Gás N₂O para Sifão (1 un)',
    categoria: 'Outros',
    tipo: 'simples',
    tipo_bebida: 'Outros',
    marca: 'iSi / BestWhip',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_01',
    unidade_medida_base: 'un',
    compra: {
      preco_embalagem: 65.0,
      volume_comprado: 10,
      unidade_compra: 'un',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 10,
    },
    custos_calculados: {
      custo_por_ml_g: 6.50,
    },
    estoque: {
      quantidade_atual: 20,
      estoque_minimo: 5,
    },
  },
  {
    id: 'ing_emulsificante',
    nome: 'Emulsificante Emustab 200g',
    categoria: 'Outros',
    tipo: 'simples',
    tipo_bebida: 'Outros',
    marca: 'Selecta / Emustab',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_02',
    unidade_medida_base: 'g',
    compra: {
      preco_embalagem: 9.80,
      volume_comprado: 200,
      unidade_compra: 'g',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 200,
    },
    custos_calculados: {
      custo_por_ml_g: 0.049,
    },
    estoque: {
      quantidade_atual: 400,
      estoque_minimo: 100,
    },
  },
  {
    id: 'ing_acucar_cristal',
    nome: 'Açúcar Cristal 1kg',
    categoria: 'Outros',
    tipo: 'simples',
    tipo_bebida: 'Outros',
    marca: 'União / Caravelas',
    is_padrao_tipo: false,
    fornecedor_id: 'sup_02',
    unidade_medida_base: 'g',
    compra: {
      preco_embalagem: 4.50,
      volume_comprado: 1000,
      unidade_compra: 'g',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 1000,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0045,
    },
    estoque: {
      quantidade_atual: 5000,
      estoque_minimo: 1000,
    },
  },
  {
    id: 'ing_especiarias',
    nome: 'Mix de Especiarias para Gin Tônica',
    categoria: 'Guarnição',
    tipo: 'simples',
    tipo_bebida: 'Guarnição',
    marca: 'Artesanal',
    is_padrao_tipo: true,
    fornecedor_id: 'sup_02',
    unidade_medida_base: 'un',
    compra: {
      preco_embalagem: 15.0,
      volume_comprado: 50,
      unidade_compra: 'un',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 50,
    },
    custos_calculados: {
      custo_por_ml_g: 0.30,
    },
    estoque: {
      quantidade_atual: 100,
      estoque_minimo: 20,
    },
  },
  {
    id: 'ing_xarope_gengibre',
    nome: 'Xarope de Gengibre Artesanal',
    categoria: 'Xarope',
    tipo: 'preparado',
    tipo_bebida: 'Xarope',
    marca: 'Artesanal da Casa',
    is_padrao_tipo: false,
    fornecedor_id: '',
    unidade_medida_base: 'ml',
    compra: {
      preco_embalagem: 23.50,
      volume_comprado: 2200,
      unidade_compra: 'ml',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 2200,
    },
    custos_calculados: {
      custo_por_ml_g: 0.0107,
    },
    estoque: {
      quantidade_atual: 2200,
      estoque_minimo: 500,
    },
  },
  {
    id: 'ing_espuma_gengibre',
    nome: 'Espuma de Gengibre para Sifão',
    categoria: 'Outros',
    tipo: 'preparado',
    tipo_bebida: 'Outros',
    marca: 'Artesanal da Casa',
    is_padrao_tipo: true,
    fornecedor_id: '',
    unidade_medida_base: 'un',
    compra: {
      preco_embalagem: 14.50,
      volume_comprado: 10,
      unidade_compra: 'un',
    },
    rendimento: {
      percentual_yield: 100,
      volume_final_utilizavel: 10,
    },
    custos_calculados: {
      custo_por_ml_g: 1.45,
    },
    estoque: {
      quantidade_atual: 10,
      estoque_minimo: 2,
    },
  },
];

const INITIAL_RECIPES = [
  {
    id: 'rec_01',
    nome_coquetel: 'Margarita Clarificada',
    categoria: 'Autoral',
    metodo_preparo: 'Batido e Coado duplamente',
    copo: 'Coupé',
    guarnicao: 'Borda de sal negro',
    foto_url:
      'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
    financeiro: {
      custo_total: 9.45,
      preco_venda: 38.0,
      cmv_percentual: 24.87,
      lucro_bruto: 28.55,
    },
    ingredientes: [
      {
        ingredient_id: 'ing_02',
        nome_exibicao: 'Tequila Blanco 100% Agave',
        quantidade_usada: 50,
        unidade_medida: 'ml',
        custo_parcial: 7.0,
      },
      {
        ingredient_id: 'ing_03',
        nome_exibicao: 'Licor Triple Sec (Laranja)',
        quantidade_usada: 15,
        unidade_medida: 'ml',
        custo_parcial: 1.35,
      },
      {
        ingredient_id: 'ing_01',
        nome_exibicao: 'Suco de Limão',
        quantidade_usada: 30,
        unidade_medida: 'ml',
        custo_parcial: 0.75,
      },
      {
        ingredient_id: 'ing_04',
        nome_exibicao: 'Xarope de Agave / Simples',
        quantidade_usada: 19.44,
        unidade_medida: 'ml',
        custo_parcial: 0.35,
      },
    ],
    instrucoes_preparo: [
      '1. Gelar previamente a taça Coupé e fazer a borda de sal negro.',
      '2. Adicionar todos os ingredientes na coqueteleira com bastante gelo.',
      '3. Bater vigorosamente por 12 segundos e coar duplamente para a taça.',
    ],
  },
  {
    id: 'rec_02',
    nome_coquetel: 'Fitzgerald Clássico',
    categoria: 'Clássico',
    metodo_preparo: 'Batido e Coado',
    copo: 'Rocks / Old Fashioned',
    guarnicao: 'Zest de limão siciliano',
    foto_url:
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80',
    financeiro: {
      custo_total: 8.11,
      preco_venda: 34.0,
      cmv_percentual: 23.85,
      lucro_bruto: 25.89,
    },
    ingredientes: [
      {
        ingredient_id: 'ing_05',
        nome_exibicao: 'Gin London Dry',
        quantidade_usada: 60,
        unidade_medida: 'ml',
        custo_parcial: 7.2,
      },
      {
        ingredient_id: 'ing_01',
        nome_exibicao: 'Limão Tahiti (Suco)',
        quantidade_usada: 25,
        unidade_medida: 'ml',
        custo_parcial: 0.63,
      },
      {
        ingredient_id: 'ing_04',
        nome_exibicao: 'Xarope de Agave / Simples',
        quantidade_usada: 15,
        unidade_medida: 'ml',
        custo_parcial: 0.27,
      },
    ],
    instrucoes_preparo: [
      '1. Adicionar o Gin, o suco de limão fresco e o xarope na coqueteleira.',
      '2. Completar com cubos de gelo inteiros e bater por 10 segundos.',
      '3. Coar para copo baixo com gelo novo e finalizar com zest cítrico.',
    ],
  },
];

function getLocalData(key, initialFallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(initialFallback));
      return [...initialFallback];
    }
    return JSON.parse(raw);
  } catch (e) {
    return [...initialFallback];
  }
}

function setLocalData(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

// ============================================================================
// FORNECEDORES (Coleção: suppliers)
// ============================================================================

export async function listarFornecedores() {
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, 'suppliers'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (list.length > 0) {
        setLocalData(STORAGE_KEYS.suppliers, list);
        return list;
      }
    } catch (err) {
      console.warn('Fallback para armazenamento local (suppliers):', err.message);
    }
  }
  return getLocalData(STORAGE_KEYS.suppliers, INITIAL_SUPPLIERS);
}

export async function salvarFornecedor(fornecedor) {
  const list = getLocalData(STORAGE_KEYS.suppliers, INITIAL_SUPPLIERS);
  const id = fornecedor.id || `sup_${Date.now()}`;
  const payload = {
    id,
    nome_empresa: fornecedor.nome_empresa.trim(),
    contato: fornecedor.contato.trim(),
    prazo_entrega_dias: Number(fornecedor.prazo_entrega_dias) || 1,
    dias_pedido: Array.isArray(fornecedor.dias_pedido) ? fornecedor.dias_pedido : [],
  };

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'suppliers', id), payload, { merge: true });
    } catch (err) {
      console.warn('Salvo localmente (Firebase indisponível):', err.message);
    }
  }

  const index = list.findIndex((item) => item.id === id);
  if (index >= 0) {
    list[index] = payload;
  } else {
    list.push(payload);
  }
  setLocalData(STORAGE_KEYS.suppliers, list);
  return payload;
}

export async function excluirFornecedor(id) {
  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'suppliers', id));
    } catch (err) {
      console.warn('Excluído localmente (Firebase indisponível):', err.message);
    }
  }
  const list = getLocalData(STORAGE_KEYS.suppliers, INITIAL_SUPPLIERS).filter(
    (item) => item.id !== id
  );
  setLocalData(STORAGE_KEYS.suppliers, list);
  return true;
}

// ============================================================================
// INSUMOS / ESTOQUE (Coleção: ingredients)
// ============================================================================

export async function listarInsumos() {
  let list = [];
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, 'ingredients'));
      list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (list.length > 0) {
        setLocalData(STORAGE_KEYS.ingredients, list);
      }
    } catch (err) {
      console.warn('Fallback para armazenamento local (ingredients):', err.message);
    }
  }
  if (!list || list.length === 0) {
    list = getLocalData(STORAGE_KEYS.ingredients, INITIAL_INGREDIENTS);
  }

  // Auto-migração e enriquecimento inteligente de tipos e marcas para itens existentes
  let needsSave = false;
  const existingIds = new Set(list.map((i) => i.id));
  INITIAL_INGREDIENTS.forEach((seed) => {
    if (!existingIds.has(seed.id)) {
      list.push(seed);
      needsSave = true;
    }
  });

  list = list.map((item) => {
    let changed = false;
    let tipo_bebida = item.tipo_bebida;
    let marca = item.marca;
    let is_padrao_tipo = item.is_padrao_tipo;

    if (!tipo_bebida) {
      const nomeLower = (item.nome || '').toLowerCase();
      if (nomeLower.includes('gin')) {
        tipo_bebida = 'Gin London Dry';
        marca = marca || (nomeLower.includes('tanqueray') ? 'Tanqueray London Dry' : "Gordon's London Dry");
        is_padrao_tipo = is_padrao_tipo ?? !nomeLower.includes('tanqueray');
        changed = true;
      } else if (nomeLower.includes('tequila')) {
        tipo_bebida = 'Tequila Blanco';
        marca = marca || (nomeLower.includes('1800') ? '1800 Tequila Blanco' : 'José Cuervo Tradicional Silver');
        is_padrao_tipo = is_padrao_tipo ?? !nomeLower.includes('1800');
        changed = true;
      } else if (nomeLower.includes('vodka')) {
        tipo_bebida = 'Vodka';
        marca = marca || (nomeLower.includes('absolut') ? 'Absolut Original' : 'Smirnoff No. 21 Red');
        is_padrao_tipo = is_padrao_tipo ?? !nomeLower.includes('absolut');
        changed = true;
      } else if (nomeLower.includes('rum')) {
        tipo_bebida = 'Rum Branco';
        marca = marca || (nomeLower.includes('havana') ? 'Havana Club 3 Anos' : 'Bacardi Carta Blanca');
        is_padrao_tipo = is_padrao_tipo ?? !nomeLower.includes('havana');
        changed = true;
      } else if (nomeLower.includes('triple sec') || nomeLower.includes('cointreau')) {
        tipo_bebida = 'Licor Triple Sec / Laranja';
        marca = marca || (nomeLower.includes('cointreau') ? 'Cointreau L’Unique' : 'Stock Triple Sec');
        is_padrao_tipo = is_padrao_tipo ?? !nomeLower.includes('cointreau');
        changed = true;
      } else if (nomeLower.includes('limão')) {
        tipo_bebida = 'Cítrico';
        marca = marca || 'Tahiti Fresco';
        is_padrao_tipo = is_padrao_tipo ?? true;
        changed = true;
      } else if (nomeLower.includes('xarope')) {
        tipo_bebida = 'Xarope';
        marca = marca || 'Artesanal da Casa';
        is_padrao_tipo = is_padrao_tipo ?? true;
        changed = true;
      }
    }

    if (changed) {
      needsSave = true;
      return {
        ...item,
        tipo_bebida: tipo_bebida || item.categoria || 'Outros',
        marca: marca || item.nome,
        is_padrao_tipo: is_padrao_tipo ?? false,
        tipo: item.tipo || (item.ingredientes_base?.length > 0 ? 'preparado' : 'simples'),
        ingredientes_base: Array.isArray(item.ingredientes_base) ? item.ingredientes_base : [],
      };
    }

    return {
      ...item,
      tipo_bebida: item.tipo_bebida || item.categoria || 'Outros',
      marca: item.marca || item.nome,
      is_padrao_tipo: item.is_padrao_tipo ?? false,
      tipo: item.tipo || (item.ingredientes_base?.length > 0 ? 'preparado' : 'simples'),
      ingredientes_base: Array.isArray(item.ingredientes_base) ? item.ingredientes_base : [],
    };
  });

  if (needsSave) {
    setLocalData(STORAGE_KEYS.ingredients, list);
  }

  return list;
}

export async function salvarInsumo(insumo) {
  const list = getLocalData(STORAGE_KEYS.ingredients, INITIAL_INGREDIENTS);
  const id = insumo.id || `ing_${Date.now()}`;

  const payload = {
    id,
    nome: insumo.nome.trim(),
    categoria: insumo.categoria.trim(),
    tipo_bebida: (insumo.tipo_bebida || insumo.categoria || 'Outros').trim(),
    marca: (insumo.marca || '').trim(),
    is_padrao_tipo: Boolean(insumo.is_padrao_tipo),
    tipo: insumo.tipo || (insumo.ingredientes_base?.length > 0 ? 'preparado' : 'simples'), // 'simples' (comprado) ou 'preparado' (produzido)
    fornecedor_id: insumo.fornecedor_id || '',
    unidade_medida_base: insumo.unidade_medida_base || 'ml',
    compra: {
      preco_embalagem: Number(insumo.compra?.preco_embalagem) || 0,
      volume_comprado: Number(insumo.compra?.volume_comprado) || 0,
      unidade_compra: insumo.compra?.unidade_compra || 'ml',
    },
    rendimento: {
      percentual_yield: Number(insumo.rendimento?.percentual_yield) || 0,
      volume_final_utilizavel: Number(insumo.rendimento?.volume_final_utilizavel) || 0,
    },
    custos_calculados: {
      custo_por_ml_g: Number(insumo.custos_calculados?.custo_por_ml_g) || 0,
    },
    estoque: {
      quantidade_atual: Number(insumo.estoque?.quantidade_atual) || 0,
      estoque_minimo: Number(insumo.estoque?.estoque_minimo) || 0,
    },
    ingredientes_base: Array.isArray(insumo.ingredientes_base) ? insumo.ingredientes_base : [],
    instrucoes_preparo: insumo.instrucoes_preparo || '',
    equivalencias: insumo.equivalencias || {},
  };

  // Se este insumo for marcado como padrão do seu tipo, desmarca os outros do mesmo tipo
  if (payload.is_padrao_tipo && payload.tipo_bebida) {
    list.forEach((item) => {
      if (item.id !== id && (item.tipo_bebida || '').toLowerCase() === payload.tipo_bebida.toLowerCase()) {
        item.is_padrao_tipo = false;
      }
    });
  }

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'ingredients', id), payload, { merge: true });
    } catch (err) {
      console.warn('Insumo salvo localmente (Firebase indisponível):', err.message);
    }
  }

  const index = list.findIndex((item) => item.id === id);
  if (index >= 0) {
    list[index] = payload;
  } else {
    list.push(payload);
  }
  setLocalData(STORAGE_KEYS.ingredients, list);
  return payload;
}

export async function atualizarEstoqueInsumo(id, novaQuantidade) {
  const qtd = Number(novaQuantidade) || 0;
  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'ingredients', id), {
        'estoque.quantidade_atual': qtd,
      });
    } catch (err) {
      console.warn('Estoque atualizado localmente:', err.message);
    }
  }
  const list = getLocalData(STORAGE_KEYS.ingredients, INITIAL_INGREDIENTS);
  const index = list.findIndex((item) => item.id === id);
  if (index >= 0) {
    list[index] = {
      ...list[index],
      estoque: {
        ...list[index].estoque,
        quantidade_atual: qtd,
      },
    };
    setLocalData(STORAGE_KEYS.ingredients, list);
    return list[index];
  }
  return null;
}

export async function excluirInsumo(id) {
  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'ingredients', id));
    } catch (err) {
      console.warn('Insumo excluído localmente:', err.message);
    }
  }
  const list = getLocalData(STORAGE_KEYS.ingredients, INITIAL_INGREDIENTS).filter(
    (item) => item.id !== id
  );
  setLocalData(STORAGE_KEYS.ingredients, list);
  return true;
}

// ============================================================================
// RECEITAS / FICHAS TÉCNICAS (Coleção: recipes)
// ============================================================================

export async function listarReceitas() {
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, 'recipes'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (list.length > 0) {
        setLocalData(STORAGE_KEYS.recipes, list);
        return list;
      }
    } catch (err) {
      console.warn('Fallback para armazenamento local (recipes):', err.message);
    }
  }
  return getLocalData(STORAGE_KEYS.recipes, INITIAL_RECIPES);
}

export async function salvarReceita(receita) {
  const list = getLocalData(STORAGE_KEYS.recipes, INITIAL_RECIPES);
  const id = receita.id || `rec_${Date.now()}`;

  const payload = {
    id,
    nome_coquetel: receita.nome_coquetel.trim(),
    categoria: receita.categoria || 'Autoral',
    metodo_preparo: receita.metodo_preparo || 'Batido e Coado',
    copo: receita.copo || 'Coupé',
    guarnicao: receita.guarnicao || '',
    foto_url: receita.foto_url || '',
    financeiro: {
      custo_total: Number(receita.financeiro?.custo_total) || 0,
      preco_venda: Number(receita.financeiro?.preco_venda) || 0,
      cmv_percentual: Number(receita.financeiro?.cmv_percentual) || 0,
      lucro_bruto: Number(receita.financeiro?.lucro_bruto) || 0,
    },
    ingredientes: Array.isArray(receita.ingredientes)
      ? receita.ingredientes.map((ing) => ({
          ingredient_id: ing.ingredient_id,
          nome_exibicao: ing.nome_exibicao,
          tipo_bebida: ing.tipo_bebida || '',
          marca_escolhida_id: ing.marca_escolhida_id || 'padrao',
          marca_escolhida_nome: ing.marca_escolhida_nome || '',
          quantidade_usada: Number(ing.quantidade_usada) || 0,
          unidade_medida: ing.unidade_medida || 'ml',
          custo_parcial: Number(ing.custo_parcial) || 0,
        }))
      : [],
    instrucoes_preparo: Array.isArray(receita.instrucoes_preparo)
      ? receita.instrucoes_preparo.filter((step) => step && step.trim() !== '')
      : [],
  };

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'recipes', id), payload, { merge: true });
    } catch (err) {
      console.warn('Receita salva localmente (Firebase indisponível):', err.message);
    }
  }

  const index = list.findIndex((item) => item.id === id);
  if (index >= 0) {
    list[index] = payload;
  } else {
    list.push(payload);
  }
  setLocalData(STORAGE_KEYS.recipes, list);
  return payload;
}

export async function excluirReceita(id) {
  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'recipes', id));
    } catch (err) {
      console.warn('Receita excluída localmente:', err.message);
    }
  }
  const list = getLocalData(STORAGE_KEYS.recipes, INITIAL_RECIPES).filter(
    (item) => item.id !== id
  );
  setLocalData(STORAGE_KEYS.recipes, list);
  return true;
}

// ============================================================================
// TRANSAÇÃO DE BAIXA DE ESTOQUE (Seção 6 da Especificação Técnica)
// ============================================================================

/**
 * Executa a baixa atômica no estoque usando runTransaction do Firebase Firestore
 * (leitura obrigatória de todos os documentos antes das escritas) e sincroniza o estado local.
 */
export async function processarVenda(recipeId, quantidadeVendida = 1) {
  const qtdVenda = Math.max(1, Number(quantidadeVendida) || 1);
  const deduplicatedUpdates = [];

  if (isFirebaseConfigured) {
    try {
      await runTransaction(db, async (transaction) => {
        const recipeRef = doc(db, 'recipes', recipeId);
        const recipeDoc = await transaction.get(recipeRef);

        if (!recipeDoc.exists()) {
          throw new Error('Receita não encontrada no Firestore.');
        }

        const ingredientes = recipeDoc.data().ingredientes || [];
        const refsInsumos = ingredientes.map((ing) =>
          doc(db, 'ingredients', ing.ingredient_id)
        );

        // Fase de leitura (obrigatória antes das escritas em transações do Firestore)
        const docsInsumos = await Promise.all(
          refsInsumos.map((ref) => transaction.get(ref))
        );

        // Fase de escrita
        docsInsumos.forEach((ingDoc, index) => {
          if (!ingDoc.exists()) return;
          const ingReceita = ingredientes[index];
          const estoqueAtual = Number(ingDoc.data().estoque?.quantidade_atual) || 0;
          const desconto = Number(ingReceita.quantidade_usada) * qtdVenda;
          const novoEstoque = Number(Math.max(0, estoqueAtual - desconto).toFixed(2));

          transaction.update(refsInsumos[index], {
            'estoque.quantidade_atual': novoEstoque,
          });

          deduplicatedUpdates.push({
            ingredient_id: ingReceita.ingredient_id,
            nome: ingReceita.nome_exibicao,
            desconto,
            estoqueAnterior: estoqueAtual,
            novoEstoque,
            unidade: ingReceita.unidade_medida || 'ml',
          });
        });
      });
    } catch (err) {
      console.warn(
        'Transação executada no espelho local (Firebase offline/demo):',
        err.message
      );
    }
  }

  // Sincronização atômica local (garante consistência imediata na UI e em modo Demo)
  const recipes = getLocalData(STORAGE_KEYS.recipes, INITIAL_RECIPES);
  const recipe = recipes.find((r) => r.id === recipeId);
  if (!recipe) {
    throw new Error('Receita não encontrada.');
  }

  const ingredients = getLocalData(STORAGE_KEYS.ingredients, INITIAL_INGREDIENTS);
  const resumoBaixa = [];

  (recipe.ingredientes || []).forEach((ingReceita) => {
    const idx = ingredients.findIndex((i) => i.id === ingReceita.ingredient_id);
    if (idx >= 0) {
      const estoqueAtual = Number(ingredients[idx].estoque?.quantidade_atual) || 0;
      const desconto = Number((Number(ingReceita.quantidade_usada) * qtdVenda).toFixed(2));
      const novoEstoque = Number(Math.max(0, estoqueAtual - desconto).toFixed(2));

      ingredients[idx] = {
        ...ingredients[idx],
        estoque: {
          ...ingredients[idx].estoque,
          quantidade_atual: novoEstoque,
        },
      };

      resumoBaixa.push({
        ingredient_id: ingReceita.ingredient_id,
        nome: ingReceita.nome_exibicao,
        desconto,
        estoqueAnterior: estoqueAtual,
        novoEstoque,
        unidade: ingReceita.unidade_medida || ingredients[idx].unidade_medida_base || 'ml',
      });
    }
  });

  setLocalData(STORAGE_KEYS.ingredients, ingredients);

  // Registra log de saída operacional
  const logs = getLocalData(STORAGE_KEYS.salesLog, []);
  const novoRegistro = {
    id: `sale_${Date.now()}`,
    recipe_id: recipe.id,
    nome_coquetel: recipe.nome_coquetel,
    quantidade_vendida: qtdVenda,
    itens_baixados: deduplicatedUpdates.length > 0 ? deduplicatedUpdates : resumoBaixa,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(novoRegistro);
  setLocalData(STORAGE_KEYS.salesLog, logs.slice(0, 30));

  return novoRegistro;
}

export function listarHistoricoBaixas() {
  return getLocalData(STORAGE_KEYS.salesLog, []);
}

export { STORAGE_KEYS, getLocalData, setLocalData, INITIAL_RECIPES, INITIAL_INGREDIENTS };
