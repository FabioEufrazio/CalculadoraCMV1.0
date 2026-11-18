import React from 'react';
import { Layers } from 'lucide-react';

export default function PlaceholderModulo({ titulo, subtitulo, fase }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-2xl mx-auto my-8 shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
        <Layers className="w-6 h-6" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
        Programado para {fase}
      </span>
      <h2 className="text-xl font-bold text-slate-900 mt-3">{titulo}</h2>
      <p className="text-sm text-slate-500 mt-2 leading-relaxed">{subtitulo}</p>
    </div>
  );
}

