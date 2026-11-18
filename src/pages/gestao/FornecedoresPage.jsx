import React, { useState, useEffect, useMemo } from 'react';
import {
  listarFornecedores,
  salvarFornecedor,
  excluirFornecedor,
  listarInsumos,
} from '../../services/firestoreService';
import { normalizeText } from '../../utils/cmvCalculations';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Clock,
  Calendar,
  Edit3,
  Trash2,
  X,
  Check,
  Package,
} from 'lucide-react';

const DIAS_SEMANA = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
];

const EMPTY_FORM = {
  id: '',
  nome_empresa: '',
  contato: '',
  prazo_entrega_dias: 2,
  dias_pedido: ['Segunda', 'Quinta'],
};

export default function FornecedoresPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState('Todos');

  // Estado do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Modal para ver insumos vinculados ao fornecedor
  const [supplierItemsModal, setSupplierItemsModal] = useState(null);

  async function carregarDados() {
    setLoading(true);
    try {
      const [supList, ingList] = await Promise.all([
        listarFornecedores(),
        listarInsumos(),
      ]);
      setSuppliers(supList);
      setIngredients(ingList);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const q = normalizeText(search);
    return suppliers.filter((sup) => {
      const matchesSearch =
        !q ||
        normalizeText(sup.nome_empresa).includes(q) ||
        normalizeText(sup.contato).includes(q);
      const matchesDay =
        selectedDayFilter === 'Todos' ||
        (Array.isArray(sup.dias_pedido) && sup.dias_pedido.includes(selectedDayFilter));
      return matchesSearch && matchesDay;
    });
  }, [suppliers, search, selectedDayFilter]);

  function openNewModal() {
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  }

  function openEditModal(supplier) {
    setFormData({
      id: supplier.id,
      nome_empresa: supplier.nome_empresa || '',
      contato: supplier.contato || '',
      prazo_entrega_dias: supplier.prazo_entrega_dias ?? 2,
      dias_pedido: Array.isArray(supplier.dias_pedido) ? [...supplier.dias_pedido] : [],
    });
    setIsModalOpen(true);
  }

  function toggleDiaPedido(dia) {
    setFormData((prev) => {
      const exists = prev.dias_pedido.includes(dia);
      return {
        ...prev,
        dias_pedido: exists
          ? prev.dias_pedido.filter((d) => d !== dia)
          : [...prev.dias_pedido, dia],
      };
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!formData.nome_empresa.trim()) return;
    setSaving(true);
    try {
      await salvarFornecedor(formData);
      await carregarDados();
      setIsModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(supplier) {
    const linkedCount = ingredients.filter((i) => i.fornecedor_id === supplier.id).length;
    const msg =
      linkedCount > 0
        ? `Este fornecedor está vinculado a ${linkedCount} insumo(s). Deseja realmente excluir "${supplier.nome_empresa}"?`
        : `Deseja excluir o fornecedor "${supplier.nome_empresa}"?`;
    if (!window.confirm(msg)) return;
    await excluirFornecedor(supplier.id);
    await carregarDados();
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <Truck className="w-4 h-4" />
            <span>Coleção Firestore: suppliers</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Gestão de Fornecedores & Janelas de Compra
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Controle prazos de entrega (lead time), dias de pedido e insumos vinculados por distribuidora.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Fornecedor</span>
        </button>
      </div>

      {/* Barra de Busca e Filtro por Dia de Pedido */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome da empresa ou telefone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-500 mr-1 shrink-0 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Dia de Pedido:
          </span>
          {['Todos', ...DIAS_SEMANA].map((dia) => (
            <button
              key={dia}
              type="button"
              onClick={() => setSelectedDayFilter(dia)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                selectedDayFilter === dia
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {dia}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela Densa de Fornecedores */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Empresa / ID</th>
                <th className="py-3.5 px-4">Contato</th>
                <th className="py-3.5 px-4">Prazo Entrega</th>
                <th className="py-3.5 px-4">Dias de Pedido</th>
                <th className="py-3.5 px-4 text-center">Insumos Vinculados</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Carregando fornecedores...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Nenhum fornecedor encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((sup) => {
                  const qtdInsumos = ingredients.filter(
                    (i) => i.fornecedor_id === sup.id
                  ).length;

                  return (
                    <tr
                      key={sup.id}
                      className="hover:bg-slate-50/80 transition"
                    >
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{sup.nome_empresa}</p>
                        <p className="text-[11px] font-mono text-slate-400">{sup.id}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium text-xs bg-slate-100 px-2.5 py-1 rounded-lg">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          {sup.contato || 'Não informado'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          {sup.prazo_entrega_dias}{' '}
                          {sup.prazo_entrega_dias === 1 ? 'dia útil' : 'dias úteis'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(sup.dias_pedido) && sup.dias_pedido.length > 0 ? (
                            sup.dias_pedido.map((dia) => (
                              <span
                                key={dia}
                                className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                              >
                                {dia}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">Sob demanda</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSupplierItemsModal(sup)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                          title="Clique para ver os insumos vinculados"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>{qtdInsumos} item(ns)</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(sup)}
                            title="Editar fornecedor"
                            className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(sup)}
                            title="Excluir fornecedor"
                            className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Leve de Criação / Edição de Fornecedor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {formData.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                </h3>
                <p className="text-xs text-slate-500">
                  Preencha os dados conforme o schema da coleção <code className="font-mono">suppliers</code>.
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

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nome da Empresa *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome_empresa}
                  onChange={(e) =>
                    setFormData({ ...formData, nome_empresa: e.target.value })
                  }
                  placeholder="Ex: Distribuidora de Bebidas X"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Contato (WhatsApp / Tel) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contato}
                    onChange={(e) =>
                      setFormData({ ...formData, contato: e.target.value })
                    }
                    placeholder="+5511999999999"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Prazo de Entrega (Dias) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    required
                    value={formData.prazo_entrega_dias}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        prazo_entrega_dias: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Dias de Pedido na Semana
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA.map((dia) => {
                    const selected = formData.dias_pedido.includes(dia);
                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => toggleDiaPedido(dia)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                          selected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5" />}
                        <span>{dia}</span>
                      </button>
                    );
                  })}
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold shadow-sm transition cursor-pointer"
                >
                  {saving ? 'Salvando...' : 'Salvar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Insumos Vinculados ao Fornecedor */}
      {supplierItemsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Insumos Vinculados
                </span>
                <h3 className="font-bold text-slate-900 text-lg">
                  {supplierItemsModal.nome_empresa}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSupplierItemsModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {(() => {
                const itensVinculados = ingredients.filter(
                  (ing) => ing.fornecedor_id === supplierItemsModal.id
                );

                if (itensVinculados.length === 0) {
                  return (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
                      Nenhum insumo está vinculado a este fornecedor no momento.
                    </div>
                  );
                }

                return (
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                    {itensVinculados.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition"
                      >
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{item.nome}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {item.categoria}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Estoque: {item.estoque?.quantidade_atual} {item.unidade_medida_base}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-extrabold text-slate-800">
                            R$ {Number(item.compra?.preco_embalagem || 0).toFixed(2)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            por {item.compra?.volume_comprado} {item.compra?.unidade_compra}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 flex justify-end">
              <button
                type="button"
                onClick={() => setSupplierItemsModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

