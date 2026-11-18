import React, { useState, useMemo } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { parseBatchRecipesCSV } from '../../utils/batchRecipeParser';
import { salvarReceita, salvarCopo } from '../../services/firestoreService';

// CSV pré-carregado com os 26 drinques enviados pelo usuário
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

export default function ModalImportarReceitas({
  isOpen,
  onClose,
  existingRecipes = [],
  catalogIngredients = [],
  onImportSuccess,
}) {
  const [csvText, setCsvText] = useState(DEFAULT_USER_CSV);
  const [showRawText, setShowRawText] = useState(false);
  const [parsedList, setParsedList] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedDrinkId, setExpandedDrinkId] = useState(null);

  // Parse inicial assim que o modal é aberto ou texto modificado
  React.useEffect(() => {
    if (csvText) {
      const parsed = parseBatchRecipesCSV(csvText, existingRecipes, catalogIngredients);
      setParsedList(parsed);
    } else {
      setParsedList([]);
    }
  }, [csvText, existingRecipes, catalogIngredients]);

  // Contadores
  const summary = useMemo(() => {
    const total = parsedList.length;
    const duplicates = parsedList.filter((p) => p.isDuplicate).length;
    const selected = parsedList.filter((p) => p.selected).length;
    return { total, duplicates, selected };
  }, [parsedList]);

  function handleToggleSelect(index) {
    setParsedList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], selected: !updated[index].selected };
      return updated;
    });
  }

  function handleSelectAllNonDuplicates() {
    setParsedList((prev) =>
      prev.map((item) => ({
        ...item,
        selected: !item.isDuplicate,
      }))
    );
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCsvText(content);
      }
    };
    reader.readAsText(file);
  }

  async function handleConfirmImport() {
    const toImport = parsedList.filter((p) => p.selected);
    if (toImport.length === 0) return;

    setIsImporting(true);
    try {
      for (const recipe of toImport) {
        // Remove metadados internos do parser antes de salvar
        const { isDuplicate, duplicateReason, selected, ...recipePayload } = recipe;
        if (recipePayload.copo) {
          salvarCopo(recipePayload.copo);
        }
        await salvarReceita(recipePayload);
      }
      if (onImportSuccess) {
        await onImportSuccess(toImport.length);
      }
      onClose();
    } catch (err) {
      console.error('Erro ao importar receitas em lote:', err);
      alert('Ocorreu um erro ao salvar algumas receitas. Verifique o console.');
    } finally {
      setIsImporting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Importação de Fichas Técnicas em Lote
              </h2>
              <p className="text-xs text-slate-500">
                Revise os coquetéis lidos, os ingredientes detectados e confirme o cadastro em massa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Ações Rápidas & Upload */}
        <div className="p-5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <label className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-semibold text-slate-700 flex items-center gap-2 transition cursor-pointer">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Carregar Arquivo .CSV</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => setShowRawText(!showRawText)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>{showRawText ? 'Ocultar Texto CSV' : 'Editar Texto CSV'}</span>
            </button>

            <button
              type="button"
              onClick={() => setCsvText(DEFAULT_USER_CSV)}
              className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Recarregar os 26 Drinques Enviados</span>
            </button>
          </div>

          <div className="flex items-center gap-2 font-medium">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Total Lidos: <b>{summary.total}</b>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Prontos: <b>{summary.selected}</b>
            </span>
            {summary.duplicates > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Repetidos ignorados: <b>{summary.duplicates}</b>
              </span>
            )}
          </div>
        </div>

        {/* Editor de Texto CSV Opcional */}
        {showRawText && (
          <div className="p-4 border-b border-slate-200 bg-slate-50 animate-fadeIn">
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Conteúdo CSV (Ponto e vírgula):
            </label>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Cole o CSV aqui..."
            />
          </div>
        )}

        {/* Tabela de Pré-visualização com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Drinques Reconhecidos para Importação
            </p>
            <button
              type="button"
              onClick={handleSelectAllNonDuplicates}
              className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
            >
              Selecionar apenas os não-duplicados
            </button>
          </div>

          {parsedList.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Nenhum drinque reconhecido. Cole o texto CSV ou selecione um arquivo.
            </div>
          ) : (
            <div className="space-y-2">
              {parsedList.map((item, index) => {
                const isExpanded = expandedDrinkId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border transition ${
                      item.selected
                        ? 'border-emerald-300 bg-white shadow-xs'
                        : item.isDuplicate
                        ? 'border-slate-200 bg-slate-50/70 opacity-75'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => handleToggleSelect(index)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {item.nome_coquetel}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {item.categoria}
                            </span>
                            {item.isDuplicate && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {item.duplicateReason}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            <b>Copo:</b> {item.copo} • <b>Método:</b> {item.metodo_preparo}{' '}
                            {item.guarnicao ? `• Guarnição: ${item.guarnicao}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-medium self-end md:self-center">
                        <span className="text-slate-600">
                          {item.ingredientes.length} ingrediente(s)
                        </span>
                        <div className="text-right">
                          <p className="font-bold text-slate-800">
                            Custo: R$ {item.financeiro.custo_total.toFixed(2)}
                          </p>
                          <p className="text-[11px] text-emerald-700 font-semibold">
                            Preço sugerido: R$ {item.financeiro.preco_venda.toFixed(2)} (CMV{' '}
                            {item.financeiro.cmv_percentual}%)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedDrinkId(isExpanded ? null : item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          title="Ver detalhes dos ingredientes"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Detalhes expandidos dos ingredientes e preparo */}
                    {isExpanded && (
                      <div className="px-5 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl text-xs space-y-2 animate-fadeIn">
                        <div>
                          <p className="font-bold text-slate-700 mb-1">Ingredientes detectados:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                            {item.ingredientes.map((ing, i) => (
                              <div
                                key={i}
                                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 flex justify-between"
                              >
                                <span>
                                  {ing.quantidade_usada} {ing.unidade_medida} • {ing.marca}
                                </span>
                                <span className="text-slate-400 font-mono">
                                  R$ {Number(ing.custo_parcial).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {item.instrucoes_preparo?.length > 0 && (
                          <div className="pt-1">
                            <p className="font-bold text-slate-700 mb-1">Passos de preparo:</p>
                            <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                              {item.instrucoes_preparo.map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé do Modal com Ação de Confirmação */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            * As fichas serão criadas no catálogo oficial com os insumos padronizados por tipo e marca.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-sm transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isImporting || summary.selected === 0}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm transition ${
                isImporting || summary.selected === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isImporting
                  ? 'Importando fichas...'
                  : `Confirmar e Importar (${summary.selected})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

