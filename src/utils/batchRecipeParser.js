/**
 * Utilitário de Parsing e Normalização de Fichas Técnicas em Lote (CSV)
 * Suporta o formato delimitado por ponto e vírgula (;) com cabeçalhos e blocos de coquetéis.
 */
import { normalizeText } from './cmvCalculations';

// Mapeamento de vidrarias comuns para padronização visual
const GLASS_MAP = {
  'copo alto': 'Highball (Longo)',
  'highball': 'Highball (Longo)',
  'copo baixo': 'Rocks / Old Fashioned',
  'on the rocks': 'Rocks / Old Fashioned',
  'rocks': 'Rocks / Old Fashioned',
  'old fashioned': 'Rocks / Old Fashioned',
  'taça coupe': 'Coupé',
  'coupe': 'Coupé',
  'coupé': 'Coupé',
  'taça de vinho': 'Taça de Vinho',
  'vinho': 'Taça de Vinho',
  'caneca de cobre': 'Caneca Moscow Mule',
  'caneca do moscow mule': 'Caneca Moscow Mule',
  'caneca': 'Caneca Moscow Mule',
  'taça baloon': 'Taça Baloon / Gin',
  'baloon': 'Taça Baloon / Gin',
  'martini': 'Taça Martini',
};

// Dicionário inteligente de detecção de Tipo de Bebida e Marcas
const SPIRIT_TYPES = [
  { match: /gin/i, tipo: 'Gin London Dry', defaultBrand: 'Gin London Dry' },
  { match: /vodka/i, tipo: 'Vodka', defaultBrand: 'Vodka' },
  { match: /cachaça/i, tipo: 'Cachaça Branca', defaultBrand: 'Cachaça Branca' },
  { match: /rum.*(ouro|gold|envelhecido)/i, tipo: 'Rum Ouro / Envelhecido', defaultBrand: 'Rum Ouro' },
  { match: /rum/i, tipo: 'Rum Branco', defaultBrand: 'Rum Branco' },
  { match: /tequila/i, tipo: 'Tequila Blanco', defaultBrand: 'Tequila Blanco' },
  { match: /bourbon/i, tipo: 'Bourbon Whiskey', defaultBrand: 'Bourbon Whiskey' },
  { match: /whisky|whiskey/i, tipo: 'Scotch Whisky', defaultBrand: 'Scotch Whisky' },
  { match: /campari/i, tipo: 'Bitter Italiano (Campari/Aperol)', defaultBrand: 'Campari' },
  { match: /aperol/i, tipo: 'Bitter Italiano (Campari/Aperol)', defaultBrand: 'Aperol' },
  { match: /vermouth|vermute/i, tipo: 'Vermute Tinto Doce', defaultBrand: 'Vermute Rosso' },
  { match: /prosecco|espumante/i, tipo: 'Espumante Brut / Prosecco', defaultBrand: 'Prosecco' },
  { match: /cointreau|triple sec|licor de laranja/i, tipo: 'Licor Triple Sec / Laranja', defaultBrand: 'Cointreau' },
  { match: /angostura|amargo|bitter/i, tipo: 'Amargo / Bitter', defaultBrand: 'Bitter Angostura' },
  { match: /lim[ãa]o\s*taiti|lim[ãa]o\s*tahiti/i, tipo: 'Cítrico', defaultBrand: 'Limão Tahiti' },
  { match: /lim[ãa]o\s*siciliano/i, tipo: 'Cítrico', defaultBrand: 'Limão Siciliano' },
  { match: /xarope/i, tipo: 'Xarope', defaultBrand: 'Xarope' },
];

/**
 * Normaliza quantidade de texto para número utilizável
 * Ex: '8–10' -> 8; '01' -> 1; '1.5' -> 1.5; 'Completar' -> 50
 */
export function normalizarQuantidade(rawQty) {
  if (!rawQty) return 1;
  const str = String(rawQty).trim().replace(',', '.');
  if (str.toLowerCase().includes('completar') || str.toLowerCase().includes('q.b')) {
    return 50;
  }
  // Se for faixa (ex: 8-10 ou 2-3)
  const rangeMatch = str.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    return parseFloat(rangeMatch[1]);
  }
  const numMatch = str.match(/\d+(?:\.\d+)?/);
  return numMatch ? parseFloat(numMatch[0]) : 1;
}

/**
 * Normaliza unidade para os identificadores do sistema
 */
export function normalizarUnidade(rawUnit, rawIng = '') {
  if (!rawUnit) return 'ml';
  const u = rawUnit.toLowerCase().trim();
  const ing = rawIng.toLowerCase();

  if (u.includes('ml')) return 'ml';
  if (u.includes('litro') || u.includes('l')) return 'ml';
  if (u.includes('folha')) return 'folha';
  if (u.includes('ramo')) return 'ramo';
  if (u.includes('rodela')) return 'rodela';
  if (u.includes('fatia')) return 'fatia';
  if (u.includes('gomo')) return 'gomo';
  if (u.includes('zest') || u.includes('casca')) return 'zest';
  if (u.includes('dash') || ing.includes('dash')) return 'dash';
  if (u.includes('g') || u.includes('kg')) return 'g';
  if (u.includes('parte')) return 'ml';
  if (u.includes('un')) return 'un';
  return 'un';
}

/**
 * Parser principal de arquivo CSV de receitas
 */
export function parseBatchRecipesCSV(csvContent, existingRecipes = [], catalogIngredients = []) {
  if (!csvContent || typeof csvContent !== 'string') return [];

  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const rawBlocks = [];
  let currentBlock = null;

  // Itera pelas linhas identificando o início de cada coquetel
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Pula linha de cabeçalho
    if (i === 0 && (line.toLowerCase().includes('nome do drink') || line.toLowerCase().includes('ingrediente'))) {
      continue;
    }

    const cols = line.split(';').map((c) => c.trim());
    const drinkName = cols[0] || '';
    const ingName = cols[1] || '';
    const qty = cols[2] || '';
    const unit = cols[3] || '';

    if (drinkName) {
      if (currentBlock) {
        rawBlocks.push(currentBlock);
      }
      currentBlock = {
        name: drinkName,
        rows: [],
      };
    }

    if (currentBlock) {
      currentBlock.rows.push({
        drinkName,
        ingName,
        qty,
        unit,
      });
    }
  }

  if (currentBlock) {
    rawBlocks.push(currentBlock);
  }

  // Conjunto para controle de duplicidades (insensível a acentuação e maiúsculas)
  const seenNames = new Set();
  const existingNames = new Set(
    existingRecipes.map((r) => normalizeText(r.nome_coquetel))
  );

  const parsedDrinks = [];

  for (const block of rawBlocks) {
    const rawName = block.name.trim();
    const normalizedName = normalizeText(rawName);

    // Verificação de repetição
    const isDuplicateInFile = seenNames.has(normalizedName);
    const isAlreadyInDB = existingNames.has(normalizedName);
    const isDuplicate = isDuplicateInFile || isAlreadyInDB;

    seenNames.add(normalizedName);

    // Mapeamento dos metadados do drink
    let copo = 'Rocks / Old Fashioned';
    let guarnicao = '';
    let metodoPreparo = 'Batido e Coado';
    const instrucoes = [];
    const ingredientes = [];

    // Categoria: se o nome contiver "autoral"
    const categoria = rawName.toLowerCase().includes('autoral') ? 'Autoral' : 'Clássico';

    for (const r of block.rows) {
      const ing = r.ingName || '';
      const qty = r.qty || '';
      const unit = r.unit || '';
      const lowerIng = ing.toLowerCase();

      // 1. Vidraria
      if (lowerIng.includes('(vidraria)') || lowerIng.includes('vidraria')) {
        const cleanGlass = ing.replace(/\(vidraria\)/i, '').replace(/vidraria/i, '').trim();
        for (const [key, val] of Object.entries(GLASS_MAP)) {
          if (cleanGlass.toLowerCase().includes(key)) {
            copo = val;
            break;
          }
        }
        if (!copo) copo = cleanGlass || 'Rocks / Old Fashioned';
      }
      // 2. Guarnição
      else if (lowerIng.includes('(guarnição)') || lowerIng.includes('guarnição')) {
        guarnicao = ing.replace(/\(guarnição\)/i, '').replace(/guarnição/i, '').trim();
      }
      // 3. Modo de preparo
      else if (lowerIng.startsWith('modo de preparo')) {
        const prepText = qty.trim();
        if (prepText.toLowerCase().includes('batido com dupla coagem')) {
          metodoPreparo = 'Batido e Coado duplamente';
        } else if (prepText.toLowerCase().includes('batido')) {
          metodoPreparo = 'Batido e Coado';
        } else if (prepText.toLowerCase().includes('mexido')) {
          metodoPreparo = 'Mexido e Coado';
        } else if (prepText.toLowerCase().includes('montado')) {
          metodoPreparo = 'Montado no copo';
        }

        // Divide o texto do preparo em passos legíveis
        const steps = prepText
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 3 && !s.toLowerCase().startsWith('rendimento:'));

        if (steps.length > 0) {
          steps.forEach((s, idx) => instrucoes.push(`${idx + 1}. ${s}`));
        } else if (prepText) {
          instrucoes.push(`1. ${prepText}`);
        }
      }
      // 4. Utensílios ou avisos ignorados nos ingredientes líquidos
      else if (
        lowerIng.includes('aviso importante') ||
        lowerIng === 'sifão' ||
        lowerIng === 'mixer' ||
        (lowerIng.startsWith('gelo') && (unit.toLowerCase() === 'copo' || unit.toLowerCase() === 'un'))
      ) {
        // Ignora utensílio/gelo da tabela de insumos
      }
      // 5. Insumos reais
      else if (ing.trim().length > 0) {
        const numQty = normalizarQuantidade(qty);
        let normalizedUnit = normalizarUnidade(unit, ing);

        // Se for "3 partes de prosecco" -> converter partes para ml proporcional (~90ml, ~60ml)
        let finalQty = numQty;
        if (unit.toLowerCase().includes('parte')) {
          finalQty = numQty * 30; // base de 30ml por parte
          normalizedUnit = 'ml';
        }

        // Procura correspondência inteligente no catálogo de insumos
        let matchedInsumo = null;
        let matchedTipo = '';
        let matchedMarca = '';

        for (const spec of SPIRIT_TYPES) {
          if (spec.match.test(ing)) {
            matchedTipo = spec.tipo;
            matchedMarca = ing;
            break;
          }
        }

        // Tenta achar insumo correspondente por nome no catálogo (sem distinção de acentos)
        matchedInsumo = catalogIngredients.find(
          (ci) =>
            normalizeText(ci.nome).includes(normalizeText(ing)) ||
            normalizeText(ing).includes(normalizeText(ci.nome)) ||
            (matchedTipo && normalizeText(ci.tipo_bebida) === normalizeText(matchedTipo))
        );

        // Custo estimado unitário (ex: R$ 0.08 por ml para destilado, R$ 0.03 para sucos)
        let custoUnitario = 0.05;
        if (matchedInsumo?.custos_calculados?.custo_por_ml_g) {
          custoUnitario = matchedInsumo.custos_calculados.custo_por_ml_g;
        } else if (matchedTipo.includes('Gin') || matchedTipo.includes('Vodka') || matchedTipo.includes('Whisky') || matchedTipo.includes('Tequila')) {
          custoUnitario = 0.10;
        } else if (matchedTipo.includes('Cítrico') || ing.toLowerCase().includes('suco')) {
          custoUnitario = 0.03;
        } else if (matchedTipo.includes('Xarope')) {
          custoUnitario = 0.025;
        } else if (normalizedUnit === 'folha') {
          custoUnitario = 0.08;
        }

        const custoParcial = Number((finalQty * custoUnitario).toFixed(2));

        ingredientes.push({
          ingredient_id: matchedInsumo ? matchedInsumo.id : '',
          tipo_bebida: matchedTipo || 'Outros',
          marca: matchedMarca || ing,
          nome_exibicao: matchedTipo || ing,
          quantidade_usada: finalQty,
          unidade_medida: normalizedUnit,
          custo_parcial: custoParcial > 0 ? custoParcial : 0.5,
        });
      }
    }

    // Passos de preparo padrão se o texto estava vazio
    const finalInstrucoes =
      instrucoes.length > 0
        ? instrucoes
        : [
            '1. Gelar previamente o copo.',
            '2. Adicionar todos os ingredientes com gelo e preparar conforme o método.',
            '3. Finalizar com a guarnição recomendada e servir.',
          ];

    // Cálculos financeiros
    const custoTotal = Number(
      ingredientes.reduce((acc, i) => acc + (Number(i.custo_parcial) || 0), 0).toFixed(2)
    );
    // Sugestão de preço para ~25% de CMV ou mínimo de R$ 32,00
    const precoSugerido = custoTotal > 0 ? Math.max(30, Math.round((custoTotal / 0.25) * 2) / 2) : 34.0;
    const cmvPercentual = precoSugerido > 0 ? Number(((custoTotal / precoSugerido) * 100).toFixed(1)) : 0;
    const lucroBruto = Number((precoSugerido - custoTotal).toFixed(2));

    parsedDrinks.push({
      id: `rec_batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nome_coquetel: rawName,
      categoria,
      metodo_preparo: metodoPreparo,
      copo: copo || 'Rocks / Old Fashioned',
      guarnicao: guarnicao || 'A definir',
      foto_url: '', // Sem imagem por padrão
      financeiro: {
        custo_total: custoTotal,
        preco_venda: precoSugerido,
        cmv_percentual: cmvPercentual,
        lucro_bruto: lucroBruto,
      },
      ingredientes,
      instrucoes_preparo: finalInstrucoes,
      isDuplicate,
      duplicateReason: isAlreadyInDB
        ? 'Já cadastrado no banco'
        : isDuplicateInFile
        ? 'Duplicado neste arquivo'
        : null,
      selected: !isDuplicate, // pré-seleciona apenas os não duplicados
    });
  }

  return parsedDrinks;
}

export const DEFAULT_USER_CSV = `Nome do Drink;Ingrediente;Quantidade;Unidade
Mojito;Rum Bacardi Carta Blanca;60;ml
;de hortelã;8–10;folhas
;suco de limão taiti fresco;25;ml
;xarope de açúcar;30;ml
;Completar com água com gás;Completar;q.b.
;Gelo em cubos;1;copo
;Ramo de hortelã fresco (Guarnição);1;un
;Modo de preparo;Montado no copo alto. Macerar suavemente a hortelã com o suco de limão e o xarope. Adicionar o rum. Completar com gelo e água com gás. Mexer levemente. E para guarnição adicionar um ramo de hortelã no drinque Rendimento: ~300 ml;-
;Copo Alto (Highball) (Vidraria);1;un
Basil Smash;London Dry Gin Lassaleti;60;ml
;xarope de açúcar;25;ml
;suco de limão siciliano;30;ml
;de manjericão;8;folhas
;Gelo em cubos;1;copo
;Ramo de manjericão fresco + twist de limão siciliano (Guarnição);1;un
;Modo de preparo;Batido com dupla coagem. Bater todos numa coqueteleira mais o gelo e bata por mais ou menos 10 segundos. Coar duplamente para o copo com gelo. Decore com ramo de manjericão fresco Rendimento: ~300 ml;-
;Copo Baixo (On the Rocks) (Vidraria);1;un
Bramble;London Dry Gin Lassaleti;50;ml
;xarope de açúcar;10;ml
;suco de limão siciliano;25;ml
;xarope de amora Monin;20;ml
;Gelo em cubos;1;copo
;Rodela de limão siciliano + duas amoras num espeto (Guarnição);1;un
;Modo de preparo;Batido com dupla coagem. Adicionar todos os ingredientes numa coqueteleira, menos o xarope de amoras e bater por 10 segundos Coar duplamente sobre gelo no copo. Adicionar xarope de amora sobre o topo (float). Decore com rodela de limão siciliano + duas amoras num espeto Rendimento: ~300 ml;-
;Copo Baixo (On the Rocks) (Vidraria);1;un
Mai Tai;Rum Bacardi Oro;60;ml
;suco de limão taiti;25;ml
;licor de laranja Cointreau;15;ml
;xarope de amêndoas Monin;15;ml
;xarope de açúcar;5;ml
;Gelo em cubos;1;copo
;Hortelã + rodela de limão + cereja marrasquino (Guarnição);1;un
;Modo de preparo;Batido com dupla coagem. Deixe um copo previamente gelado Bater todos os ingredientes  numa coqueteleira com gelo. Retire o excesso de água do copo e transfira a bebida fazendo uma dupla coagem. Decore com ramo de hortelã + rodela de limão + cereja marrasquino Rendimento: ~300 ml;-
;Copo Baixo (On the Rocks) (Vidraria);1;un
Negroni;London Dry Gin Lassaleti;30;ml
;Bitter italiano Campari;30;ml
;Vermouth Rosso;30;ml
;Gelo em cubos;1;copo
;Meia rodela de laranja Bahia ou twist de laranja inteira (Guarnição);1;un
;Modo de preparo;Mexido com coagem simples. Deixe um copo previamente gelado Misturar todos os ingredientes com gelo num mixing glass Retire o excesso de água do copo e transfira a bebida do mixing glass  para o copo fazendo uma coagem simples da bebida para o copo Decore c/ meia rodela de laranja Bahia ou twist de laranja inteira Rendimento: ~300 ml;-
;Copo Baixo (On the Rocks) (Vidraria);1;un
Soft Negroni;London Dry Gin Lassaleti;30;ml
;Campari;15;ml
;Aperol;15;ml
;Vermouth Rosso;30;ml
;Gelo em cubos;1;copo
;Meia rodela de laranja Bahia (Guarnição);1;un
;Modo de preparo;Mexido com coagem simples. Método de Preparo: Mexido com coagem simples. Deixe o copo previamente gelado Bata todos os ingredientes com gelo numa coqueteleira Retire o excesso de água formado no copo Retire o excesso de água do copo e transfira a bebida do mixing glass  para o copo fazendo uma coagem simples da bebida para o copo Decore com meia rodela de laranja Bahia dentro do drinque ou o twist de laranja bahia sobre o drinque Rendimento: ~300 ml;-
;Meia rodela de laranja Bahia ou twist de laranja inteira (Guarnição);1;un
;Modo de preparo;Mexido com coagem simples. Deixe o copo previamente gelado Bata todos os ingredientes com gelo numa coqueteleira Retire o excesso de água formado no copo Retire o excesso de água do copo e transfira a bebida do mixing glass  para o copo fazendo uma coagem simples da bebida para o copo Decore com meia rodela de laranja Bahia dentro do drinque ou o twist de laranja bahia sobre o drinque Rendimento: ~300 ml;-
;Copo Baixo (On the Rocks) (Vidraria);1;un
Cosmopolitan;Vodka;50;ml
;xarope Monin Cranberry;25;ml
;licor de laranja Cointreau;10;ml
;suco de limão taiti;20;ml
;Gelo em cubos;1;copo
;Gomo de limão taiti sobre o drinque (Guarnição);1;un
;Modo de preparo;Batido com dupla coagem. Deixe o copo previamente gelado Bata todos os ingredientes com gelo numa coqueteleira Retire o excesso de água formado no copo e transfira a bebida da coqueteleira para o copo fazendo um dupla coagem Decore com gomo de limão taiti sobre o drinque Rendimento: ~300 ml;-
;Copo Baixo (On the Rocks) (Vidraria);1;un
CosmoLassa (Autoral) - Gin e limão siciliano;London Dry Gin Lassaleti;50;ml
;xarope Monin Cranberry;25;ml
;licor de laranja Cointreau;10;ml
;suco de limão siciliano;20;ml
;Gelo em cubos;1;copo
;Gomo de limão siciliano (Guarnição);1;un
;Modo de preparo;Batido com dupla coagem. Deixe o copo previamente gelado Bata todos os ingredientes com gelo numa coqueteleira Retire o excesso de água do copo e transfira a bebida da coqueteleira para o copo fazendo uma dupla coagem. Decore com gomo de limão siciliano Rendimento: ~200 ml;-
;Copo Baixo (On the Rocks) (Vidraria);1;un
Aperol Spritz;de prosecco;3;partes
;de Aperol;2;partes
;parte de água com gás;1;un
;Gelo em cubos;1;copo
;Meia rodela de laranja Bahia dentro da taça (Guarnição);1;un
;Modo de preparo;Montado diretamente na taça. Encha uma taça de vinho com gelo. Adicione primeiramente 3 partes de prosecco 2 partes de aperol Finalize com a água com gás. Decore com meia rodela de laranja bahia dentro da taça Rendimento: ~250 ml;-
;Taça de vinho (Vidraria);1;un
Scotch Sour;Whisky Escocês Black Label;45;ml
;xarope de açúcar;15;ml
;suco de limão taiti;25;ml
;Gelo em cubos;1;copo
;Twist de limão taiti (Guarnição);1;un
;Modo de preparo;Batido com dupla coagem. Deixe um copo previamente gelado. Adicione todos os ingredientes numa coqueteleira com gelo e bata por 10 segundos. Retire o excesso de água do copo e transfira a bebida da coqueteleira para o copo fazendo uma dupla coagem. decore com um twist de limão taiti Rendimento: ~300 ml;-
;Copo Baixo (On the Rocks) (Vidraria);1;un
Fitzgerald;London Dry Gin Lassaleti;50;ml
;suco de limão siciliano;25;ml
;xarope de açúcar;25;ml
;dashes Bitter Angostura;3;un
;Gelo em cubos;1;copo
;Twist de limão siciliano (Guarnição);1;un
;Modo de preparo;Batido com dupla coagem. Deixe um copo previamente gelado. Adicione todos os ingredientes numa coqueteleira com gelo e bata por 10 segundos. Retire o excesso de água do copo e transfira a bebida da coqueteleira para o copo fazendo uma dupla coagem. decore com um twist de limão siciliano Rendimento: ~300 ml;-
;Copo Baixo (On the Rocks) (Vidraria);1;un
Fitz Tangerina;London Dry Gin Lassalet;50;ml
;suco de limão siciliano;25;ml
;xarope de tangerina Monin;30;ml
;2–3 dashes Bitter Angostura;1;un
;Gelo em cubos;1;copo
;Twist de limão siciliano (Guarnição);1;un
;Modo de preparo;Batido com dupla coagem. Deixe um copo previamente gelado. Adicione todos os ingredientes numa coqueteleira com gelo e bata por 10 segundos. Retire o excesso de água do copo e transfira a bebida da coqueteleira para o copo fazendo uma dupla coagem. Decore com um twist de limão siciliano. Rendimento: ~300 ml;-
;Copo Baixo (On the Rocks) (Vidraria);1;un
Margarita;Tequila Prata;50;ml
;licor de laranja Cointreau;25;ml
;suco de limão taiti;25;ml
;Sal (meia borda do copo);1;un
;Gelo em cubos;1;copo
;Twist de limão taiti + borda de sal (Guarnição);1;un
;Modo de preparo;Batido com dupla coagem. Num copo previamente gelado, prepare meia borda  do copo com sal com auxilio de um gomo do limão taiti Adicione todos os ingredientes numa coqueteleira com gelo e bata por 10 segundos. Retire o excesso de água do copo e transfira a bebida da coqueteleira para o copo fazendo uma dupla coagem. Decore com um twist de limão taiti Rendimento: ~300 ml;-
;Copo Baixo (On the Rocks) (Vidraria);1;un
Enzoni;London Dry Gin Lassaleti;30;ml
;Bitter italiano Campari;30;ml
;xarope de açúcar;15;ml
;suco de limão siciliano;20;ml
;uvas verdes;6;un
;Gelo em cubos;1;copo
;3 uvas verdes no espeto (Guarnição);1;un
;Modo de preparo;Batido com dupla coagem. Deixe um copo previamente gelado Numa coqueteleira adicione as uvas e o xarope de açucar e macere as uvas. Depois adicione todos ingredientes mais o gelo na coqueteleira e bata por 10 segundos. Retire o excesso de água do copo e transfira a bebida da coqueteleira fazendo um dupla coagem. Decore com 3 uvas verdes num espeto sobre o drinque Rendimento: ~300 ml;-
;Copo Baixo (On the Rocks) (Vidraria);1;un
Tom Collins;London Dry Gin Lassaleti;60;ml
;suco de limão siciliano;25;ml
;xarope de açúcar;20;ml
;Água com gás;1;un
;Gelo em cubos;1;copo
;Rodela de limão siciliano com cereja marrasquino num espeto (Guarnição);1;un
;Modo de preparo;Batido + finalizado no copo Deixe um copo previamente gelado Bata todos ingredientes numa coqueteleira, menos a água com gás. Retire o excesso de água e transfira a bebida da coqueteleira para o copo fazendo uma dupla coagem. Complete com água com gás Decore com uma rodela de limão siciliano e uma cereja espetada num palito de bambu Rendimento: ~300 ml;-
;Copo Alto (Highball) (Vidraria);1;un
Caipirinha Clássica;de cachaça prata;60;ml
;limão taiti;01;un
;xarope de açúcar;30;ml
;gelo;1;un
;Rodela de limão taiti (Guarnição);1;un
;Modo de preparo;Montado diretamente no copo Corte um limão em 6 partes e coloque no copo baixo com a casca virada para baixo Adicione o xarope de açúcar e macere levemente o limão para soltar o seu suco Adicione bastante gelo, depois a cachaça. Com auxílio de uma colher bailarina, misture tudo muito bem para todos os ingredientes incorporarem. Adicione gelo britado por cima e decore com uma rodela de limão taiti Rendimento: ~250 ml;-
;Copo baixo (On the rocks) (Vidraria);1;un
Caipiroska Maracujá c/ manjericão;de vodka;60;ml
;da polpa do maracujá in natura;40;ml
;xarope de açúcar;25;ml
;Sumo do limão taiti;15;ml
;de manjericão;03;folhas
;gelo;1;un
;Ramo de manjericão na lateral do copo (Guarnição);1;un
;Modo de preparo;Batido na coqueteleira e transferido diretamente para o copo Numa coqueteleira adicione o maracujá, o xarope, o manjericão e o sumo do limão taiti. Misture tudo com auxilio de uma colher bailarina. Adicione gelo e depois a vodka e bata por 10 segundos. Transfira diretamente para o copo, adicione mais algumas pedras de gelo britado por cima do copo e decore com uma ramo de manjericão na lateral do copo. Rendimento: ~250 ml;-
;Copo baixo (On the rocks) (Vidraria);1;un
Old Fashioned;Bourbon Whiskey;50;ml
;xarope de açucar;10;ml
;2-3 dashes bitter angostura;1;un
;Gelo;1;copo
;Casca de laranja espremida e colocada dentro do copo (Guarnição);1;un
;Modo de preparo;Montado direto no copo Num copo previamente gelado adicione todos os ingredientes, menos o gelo. Com auxílio de uma colher bailarina, misture os ingredientes Adicione pedras de gelo bem grandes. Retire uma casca de laranja bahia bem grande, esprema os óleo essenciais da casca sobre o drinque e coloque essa casca dentro do drinque. Rendimento: ~300 ml;-
;Copo baixo (On the rocks) (Vidraria);1;un
Moscow Mule;Vodka;50;ml
;Xarope de gengibre;30;ml
;Suco do limão taiti;30;ml
;Espuma de gengibre;1;un
;Água com gás;1;un
;Gelo;1;copo
;Raspas de limão taiti, pequeno ramo de hortelã ou uma rodela de limão taiti ao lado da caneca (Guarnição);1;un
;Modo de preparo;Montado direto no copo Na caneca coloque a vodka, o xarope e o suco do limão. Encha a caneca com bastante pedras de gelo e complete com água com gás. Mexa suavemente para que todos os ingrediente incorporem Finalize com uma camada de espuma e com raspas de limão taiti sobre a espuma Rendimento: ~ 150ml;-
;Caneca de cobre ou Caneca do moscow mule (Vidraria);1;un
Scotch Sour;Whisky Black Labek;50;ml
;xarope de açucar;20;ml
;Suco limão Taiti;20;ml
;Albumina;25;ml
;Gelo;1;copo
;Twis de limão taiti sobre o deinqe (Guarnição);1;un
;Modo de preparo;Montado direto no copo Deixe um copo previamente gelado Coloque todos os ingredientes dentro da coqueteleira e bata vigorosamente com gelo Transfira para o copo fazendo uma dupla coagem. Faça um Twist de limão Taiti e esprema sob o drinque. Rendimento: ~300 ml;-
;Copo baixo (On the rocks) (Vidraria);1;un
Gin Tônica;London Dry Gin Lassaleti;60;ml
;Água tônica;1;un
;Gelo;1;copo
;Especiarias;1;un
;Especiarias (Guarnição);1;un
;Modo de preparo;Montado direto no copo Numa taça previamente gelada, adicione muito gelo Coloque o gin e complete com tônica de forma bem suave cuidando para que não perca muito o gás. Mexa suavemente para incorporar os ingredientes e adicione as especiarias sem exagerar. Rendimento: ~320 ml;-
;Copo baixo (Taça Baloon) (Vidraria);1;un
Clover Club;London Dry Gin Lassaleti;50;ml
;Xarope de framboesa Monin;40;ml
;Limão siciliano;15;ml
;Albumina;25;ml
;gelo;1;un
;3 framboesas num espeto sobre o drinque ou um twist de casca de limão siciliano na borda do copo (Guarnição);1;un
;Modo de preparo;Batido com dupla coagem reverse dry shake Deixe a taça coupe previamente gelada Coloque todos os ingredientes dentro da coqueteleira e bata tudo por 15 segundos. Faça reverse dry shake e transfira diretamente para taça. Decore c/ 3 framboesas num espeto sobre o drinque ou um twist de casca de limão siciliano na borda do copo Rendimento: ~300 ml;-
;Copo baixo (Taça Coupe) (Vidraria);1;un
Lassa Mule;London Dry Gin Lassaleti;50;ml
;Xarope de gengibre;30;ml
;Suco do limão Siciliano;30;ml
;Espuma de gengibre;1;un
;Água com gás;1;un
;Gelo;1;copo
;Raspas de limão Siciliano, pequeno ramo de hortelã ou uma rodela de limão taiti ao lado da caneca (Guarnição);1;un
;Modo de preparo;Montado direto no copo Na caneca coloque o Gin, o xarope e o suco do limão. Encha a caneca com bastante pedras de gelo e complete com água com gás. Mexa suavemente para que todos os ingrediente incorporem Finalize com uma camada de espuma e com raspas de limão taiti sobre a espuma Rendimento: ~300 ml;-
;Caneca de cobre ou Caneca do moscow mule (Vidraria);1;un
Xarope de Gengibre;de gengibre fresco (descascado e cortado em lâminas);1;kg
;de água;1;litro
;de açúcar cristal;1.5;kg
;Modo de preparo;Em uma panela grande, adicione o gengibre, a água e o açúcar cristal. Mexa constantemente até o açúcar dissolver completamente. Assim que a mistura começar a ferver, desligue o fogo e tampe a panela. Deixe em infusão por aproximadamente 25 minutos para extrair o sabor e o aroma. Após esfriar, coe utilizando um filtro fino (como um Xynoi) para remover os pedaços de gengibre. Transfira o xarope para um recipiente limpo e esterilizado. Rendimento: ~2,2 litros (considerando perdas por evaporação e absorção);-
Espuma de Gengibre (Para sifão de 400 ml);de xarope de gengibre;250;ml
;de suco de limão-taiti (peneirado);100;ml
;de água com gás;50;ml
;de emulsificante;2;colheres de bar
;de N₂O;1;cápsula
;Sifão;1;un
;Mixer;1;un
;⚠️ Aviso Importante:Antes de utilizar o sifão, verifique se está limpo e se todas as borrachas estão devidamente encaixadas.Evite introduzir o gás próximo a clientes — faça isso em um local seguro e afastado do balcão.;1;un
;Modo de preparo;Em um mixer, adicione o xarope de gengibre, o suco de limão e o emulsificante. Bata por 40 segundos a 1 minuto, até formar uma espuma branca e homogênea. Transfira a mistura para o sifão, respeitando a margem de segurança. Adicione a água com gás. Feche o sifão, introduza a cápsula de gás N2O e balance para o gás se espalhar uniformemente. Armazene o sifão na geladeira, na posição deitada, por cerca de 30 minutos antes do uso. Rendimento: ~400 ml;-
Xarope de açúcar (1 : 1,5);parte água filtrada;1;un
;de açúcar cristal;1.5;partes
;Modo de preparo;Numa penala grande adicione a Rendimento: ~400 ml;-`;


