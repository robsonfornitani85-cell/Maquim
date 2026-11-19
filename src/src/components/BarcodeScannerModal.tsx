import React, { useState } from 'react';
import { ScanBarcode, X, Search, Check, Printer } from 'lucide-react';
import { NovoEquipamento } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatrimonio: (patrimonio: string) => void;
  disponiveis: NovoEquipamento[];
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectPatrimonio,
  disponiveis,
}) => {
  const [filter, setFilter] = useState('');

  if (!isOpen) return null;

  const filtered = disponiveis
    .filter(
      (e) =>
        e.status === 'disponivel' &&
        (e.patrimonio.includes(filter) ||
          e.numeroSerie.toLowerCase().includes(filter.toLowerCase()) ||
          e.modelo.toLowerCase().includes(filter.toLowerCase()))
    )
    .slice(0, 15);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Escanear / Localizar Patrimônio</h3>
              <p className="text-xs text-slate-500">Selecione ou digite o código de barras da impressora</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Scanner HUD */}
        <div className="relative my-4 rounded-xl overflow-hidden bg-slate-900 h-32 flex flex-col items-center justify-center text-white border border-slate-700 shadow-inner">
          <div className="absolute inset-4 border-2 border-emerald-400/80 rounded-lg pointer-events-none flex items-center justify-center">
            <div className="w-full h-0.5 bg-red-500/90 shadow-[0_0_8px_#ef4444] animate-pulse"></div>
          </div>
          <ScanBarcode className="w-10 h-10 text-emerald-400/50 mb-1" />
          <span className="text-[11px] font-mono text-emerald-300">LEITOR DE CÓDIGO DE BARRAS ATIVO</span>
        </div>

        {/* Input de busca rápida */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Digite ou bipe o patrimônio ou série..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
            autoFocus
          />
        </div>

        {/* Lista de equipamentos disponíveis no van */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Equipamentos Disponíveis na Van ({disponiveis.filter((e) => e.status === 'disponivel').length})
          </p>

          {filtered.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              Nenhum equipamento encontrado com este código.
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.patrimonio}
                type="button"
                onClick={() => {
                  onSelectPatrimonio(item.patrimonio);
                  onClose();
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/60 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-700 group-hover:text-blue-700 flex items-center justify-center">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm font-mono">
                        Patrimônio #{item.patrimonio}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          item.tipo === 'Color'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.modelo} ({item.tipo})
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">Série: {item.numeroSerie}</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  Selecionar <Check className="w-3.5 h-3.5" />
                </span>
              </button>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 mt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
