import React, { useState } from 'react';
import {
  X,
  Wine,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  salvarCopo,
  editarCopo,
  excluirCopo,
  restaurarCoposPadrao,
} from '../../services/firestoreService';

export default function ModalGerenciarCopos({
  isOpen,
  onClose,
  glasses = [],
  onGlassesChange,
  onSelectGlass,
  currentSelectedGlass,
}) {
  const [newGlassName, setNewGlassName] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  if (!isOpen) return null;

  function showFeedback(msg) {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 2800);
  }

  function handleAddGlass(e) {
    if (e) e.preventDefault();
    const clean = newGlassName.trim();
    if (!clean) return;

    if (glasses.some((g) => g.toLowerCase() === clean.toLowerCase())) {
      showFeedback('Este copo já está cadastrado!');
      return;
    }

    const updated = salvarCopo(clean);
    onGlassesChange(updated);
    if (onSelectGlass) {
      onSelectGlass(clean);
    }
    setNewGlassName('');
    showFeedback(`Copo "${clean}" adicionado com sucesso!`);
  }

  function handleStartEdit(idx, name) {
    setEditingIndex(idx);
    setEditingValue(name);
  }

  function handleSaveEdit(oldName) {
    const clean = editingValue.trim();
    if (!clean || clean === oldName) {
      setEditingIndex(null);
      return;
    }

    const updated = editarCopo(oldName, clean);
    onGlassesChange(updated);
    if (currentSelectedGlass === oldName && onSelectGlass) {
      onSelectGlass(clean);
    }
    setEditingIndex(null);
    showFeedback(`Copo renomeado para "${clean}"!`);
  }

  function handleCancelEdit() {
    setEditingIndex(null);
    setEditingValue('');
  }

  function handleDeleteGlass(name) {
    if (glasses.length <= 1) {
      alert('Você precisa manter ao menos um tipo de copo cadastrado.');
      return;
    }
    if (!window.confirm(`Deseja realmente remover o copo "${name}"?`)) return;

    const updated = excluirCopo(name);
    onGlassesChange(updated);
    if (currentSelectedGlass === name && onSelectGlass) {
      onSelectGlass(updated[0] || 'Coupé');
    }
    showFeedback(`Copo "${name}" removido.`);
  }

  function handleRestoreDefaults() {
    if (
      !window.confirm(
        'Deseja restaurar a lista padrão de taças e copos do sistema?'
      )
    ) {
      return;
    }
    const updated = restaurarCoposPadrao();
    onGlassesChange(updated);
    showFeedback('Lista padrão de copos restaurada!');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <Wine className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Gerenciar Taças & Copos
              </h2>
              <p className="text-xs text-slate-500">
                Adicione, edite nomes ou exclua opções de copos para as fichas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Temporário */}
        {feedbackMsg && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-2 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Conteúdo com Scroll */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Formulário: Adicionar Novo Copo */}
          <form onSubmit={handleAddGlass} className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Cadastrar Novo Tipo de Taça / Copo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGlassName}
                onChange={(e) => setNewGlassName(e.target.value)}
                placeholder="Ex: Caneca Moscow Mule, Collins, Cálice..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={!newGlassName.trim()}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>
          </form>

          {/* Lista de Copos */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Copos Ativos ({glasses.length})
              </span>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer transition"
                title="Restaura os copos sugeridos iniciais"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar Padrões</span>
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {glasses.map((glassName, idx) => {
                const isEditing = editingIndex === idx;
                const isSelected = currentSelectedGlass === glassName;

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-50'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(glassName);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          autoFocus
                          className="flex-1 px-3 py-1.5 bg-white border border-emerald-500 rounded-lg text-sm text-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(glassName)}
                          className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                          title="Salvar alteração"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-500">
                            <Wine className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-semibold text-slate-800 truncate">
                            {glassName}
                          </span>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                              Selecionado no drinque
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(idx, glassName)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                            title="Editar nome deste copo"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGlass(glassName)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Excluir este copo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition cursor-pointer shadow-xs"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}

