import React, { useState } from 'react';
import {
  FileText,
  X,
  Download,
  Mail,
  Share2,
  Calendar,
  CheckCircle2,
  Search,
  ExternalLink,
  Printer,
  Eye,
} from 'lucide-react';
import { OrdemServico } from '../types';
import {
  downloadOSPDF,
  downloadAllOSPDFs,
  downloadOSInstalacaoPDF,
  downloadOSRetiradaPDF,
  getOSFilename,
} from '../utils/pdfGenerator';
import { openMailClient, openWhatsAppShare } from '../utils/emailDispatcher';
import { exportOrdensToExcel } from '../utils/excelManager';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  ordens: OrdemServico[];
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  ordens,
}) => {
  const [search, setSearch] = useState('');
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null);

  if (!isOpen) return null;

  const filtered = ordens.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.numeroOS.toLowerCase().includes(s) ||
      o.clienteInstalacao.toLowerCase().includes(s) ||
      o.patrimonio.includes(s) ||
      o.numeroSerie.toLowerCase().includes(s) ||
      o.gatiInstalacao.includes(s) ||
      o.responsavelNome.toLowerCase().includes(s)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Histórico de Ordens de Serviço ({ordens.length})
              </h2>
              <p className="text-xs text-slate-500">
                Ordens geradas, assinadas e enviadas para contratos2@maquim.com.br
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {ordens.length > 0 && (
              <button
                type="button"
                onClick={() => exportOrdensToExcel(ordens)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-500 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar Relatório Excel
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Busca */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por OS, cliente, patrimônio, GATi ou responsável..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50/50 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
              Nenhuma Ordem de Serviço encontrada.
            </div>
          ) : (
            filtered.map((os) => (
              <div
                key={os.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-blue-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 text-sm">
                      {os.numeroOS ? `OS Inst: #${os.numeroOS}` : `Patr #${os.patrimonio}`}
                    </span>
                    {os.substituiAnterior && (
                      <span className="font-mono font-bold text-amber-700 text-sm bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        {os.numeroOSRetirada ? `OS Ret: #${os.numeroOSRetirada}` : `Retirada #${os.patrimonioAnterior}`}
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {os.dataInstalacao}
                    </span>
                    {os.enviadoEmail ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> E-mail Enviado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 flex items-center gap-1 border border-amber-300">
                        <Mail className="w-3 h-3 text-amber-600" /> E-mail Pendente
                      </span>
                    )}
                  </div>

                  <p className="font-bold text-slate-900 text-sm">
                    {os.clienteInstalacao} (GATi: {os.gatiInstalacao})
                  </p>
                  <p className="text-xs text-slate-500">
                    {os.endereco} - {os.bairro}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-600">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                      Novo: #{os.patrimonio} ({os.modelo})
                    </span>
                    {os.substituiAnterior && (
                      <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md font-mono">
                        Retirado: #{os.patrimonioAnterior} ({os.modeloAnterior})
                        {os.contadorPaginasFinal ? ` • Contadores: ${os.contadorPaginasFinal}` : ''}
                      </span>
                    )}
                    <span className="text-slate-400">|</span>
                    <span>Validado por: <strong>{os.responsavelNome}</strong></span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-wrap items-center gap-1.5 self-end md:self-center shrink-0">
                  {os.substituiAnterior ? (
                    <>
                      <button
                        type="button"
                        onClick={() => downloadAllOSPDFs(os)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
                        title="Baixar Ambos os PDFs (Instalação + Retirada)"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar 2 PDFs
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadOSInstalacaoPDF(os)}
                        className="p-2 text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors"
                        title={`Baixar PDF Instalação (${getOSFilename(os, 'instalacao')})`}
                      >
                        <span className="text-[10px] font-bold font-mono">Inst</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadOSRetiradaPDF(os)}
                        className="p-2 text-slate-700 hover:text-amber-700 hover:bg-amber-50 rounded-xl border border-slate-200 transition-colors"
                        title={`Baixar PDF Retirada (${getOSFilename(os, 'retirada')})`}
                      >
                        <span className="text-[10px] font-bold font-mono">Ret</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => downloadOSPDF(os)}
                      className="p-2 text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors"
                      title="Baixar PDF da OS"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openMailClient(os)}
                    className="p-2 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl border border-slate-200 transition-colors"
                    title="Reenviar por E-mail (contratos2@maquim.com.br)"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openWhatsAppShare(os)}
                    className="p-2 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-slate-200 transition-colors"
                    title="Compartilhar via WhatsApp"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            Fechar Histórico
          </button>
        </div>
      </div>
    </div>
  );
};
