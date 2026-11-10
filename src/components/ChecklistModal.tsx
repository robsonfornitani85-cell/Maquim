import React from 'react';
import {
  ShieldCheck,
  X,
  Printer,
  Camera,
  FileCheck2,
  WifiOff,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Zap,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';

interface ChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChecklistModal: React.FC<ChecklistModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header Institucional Maquim */}
        <div className="p-5 bg-[#0B1B3D] text-white flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0D52BD] flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Checklist Anti-Bug de Campo
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Operação Lorena • 234 Equipamentos
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Recomendações técnicas para zero falhas durante a entrega e retirada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-blue-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com os 6 Pilares Operacionais */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-700 bg-slate-50/50">
          {/* Card 1: Relatório Impresso de Contadores */}
          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <Printer className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>1. Regra de Ouro: Imprimir Contadores ANTES de Desligar</span>
                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold">Crítico</span>
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Antes de desconectar a impressora antiga do contrato anterior, imprima no painel o relatório de uso/status. No caso de máquinas coloridas (ex: <strong>Epson WF-C5790</strong>), anote o <strong>Total Mono</strong> e o <strong>Total Color</strong>.
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-amber-900 font-semibold text-[11px]">
                <Camera className="w-3.5 h-3.5 text-amber-600" />
                <span>Fotografe a folha impressa com boa iluminação direto pelo formulário.</span>
              </div>
            </div>
          </div>

          {/* Card 2: Acessórios e Avarias */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 mt-0.5">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-sm">
                2. Conferência Física de Acessórios & Avarias
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Verifique se o <strong>cabo de energia original</strong> e a <strong>bandeja retrátil de saída de papel</strong> estão presentes. Caso a máquina tenha tampas trincadas ou marcas de impacto, marque "SIM" em Avarias e fotografe para resguardar a Maquim contratualmente.
              </p>
            </div>
          </div>

          {/* Card 3: Resiliência Offline */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
              <WifiOff className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-sm">
                3. Sem Sinal na Van? O Aplicativo Salva Tudo Offline
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Se a escola ou secretaria não tiver sinal 4G/Wi-Fi, o técnico pode continuar o preenchimento sem medo: o sistema grava automaticamente os dados e fotos no celular.
              </p>
              <p className="text-[11px] text-emerald-800 font-medium">
                ✓ Ao clicar em "Finalizar", os PDFs são baixados imediatamente para a memória do celular como comprovante permanente.
              </p>
            </div>
          </div>

          {/* Card 4: Geração de 2 PDFs e Envio Automático */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-sm">
                4. Dois PDFs Gerados Automaticamente na Retirada
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Quando há equipamento a retirar, o sistema gera instantaneamente:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-[11px]">
                <li><strong>PDF 1 (OS Instalação):</strong> Começa pelo novo equipamento e encerra com os dados do retirado.</li>
                <li><strong>PDF 2 (OS Retirada):</strong> Começa pelo equipamento retirado (com contadores Mono/Color) e encerra com o novo.</li>
              </ul>
              <p className="text-[11px] text-indigo-900 font-semibold pt-0.5">
                Ambos os arquivos são anexados e enviados com 1 clique para <strong>contratos2@maquim.com.br</strong>.
              </p>
            </div>
          </div>

          {/* Card 5: Anulação protegida por senha */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 mt-0.5">
              <KeyRound className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-sm">
                5. Anulação Protegida por Senha
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Toda instalação concluída é bloqueada por segurança. Se você fizer testes após publicar, basta acessar a aba de planilhas, clicar em <strong>"Anular / Desbloquear"</strong> e digitar a senha de anulação (fornecida só pelo responsável): o patrimônio novo voltará imediatamente a ficar <strong>"Disponível na Van"</strong> e o local voltará para pendente.
              </p>
            </div>
          </div>

          {/* Card 6: Envio Obrigatório por E-mail */}
          <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>6. Envio por E-mail Obrigatório (com Anexos)</span>
                <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">Bloqueio Ativo</span>
              </h4>
              <p className="text-slate-600 leading-relaxed">
                O aplicativo bloqueia o botão de <strong>"Iniciar Próxima Instalação"</strong> até que o envio do e-mail com os PDFs para <strong>contratos2@maquim.com.br</strong> seja disparado ou confirmado. Isso assegura que 100% das instalações e retiradas cheguem em tempo real ao escritório da Maquim.
              </p>
            </div>
          </div>

          {/* Card 7: Treinamento Obrigatório dos Usuários no Local */}
          <div className="bg-linear-to-br from-blue-50 to-indigo-50/50 p-4 rounded-2xl border border-blue-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    7. Roteiro Obrigatório de Treinamento dos Usuários
                  </h4>
                  <p className="text-[11px] text-blue-900 font-medium">
                    Abordar com cada usuário que irá operar o equipamento no local:
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-300">
                10 Tópicos Chave
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="flex items-start gap-1.5 bg-white p-2.5 rounded-xl border border-blue-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>1. Demonstração:</strong> Apresentação geral do painel e gavetas de papel.</span>
              </div>
              <div className="flex items-start gap-1.5 bg-white p-2.5 rounded-xl border border-blue-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>2. Cópias:</strong> Simplex, duplex, pelo alimentador ADF e pela mesa de vidro.</span>
              </div>
              <div className="flex items-start gap-1.5 bg-white p-2.5 rounded-xl border border-blue-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>3. Digitalização (Scan):</strong> Simplex, duplex, via ADF e mesa de vidro para rede/pasta/e-mail.</span>
              </div>
              <div className="flex items-start gap-1.5 bg-white p-2.5 rounded-xl border border-blue-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>4. Impressão:</strong> Envio de trabalhos simplex e frente e verso (duplex).</span>
              </div>
              <div className="flex items-start gap-1.5 bg-white p-2.5 rounded-xl border border-blue-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>5. Driver de Impressão:</strong> Opções simples e configurações rápidas no Windows.</span>
              </div>
              <div className="flex items-start gap-1.5 bg-white p-2.5 rounded-xl border border-blue-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>6. Contadores Totais:</strong> Como consultar no painel o contador geral de páginas.</span>
              </div>
              <div className="flex items-start gap-1.5 bg-white p-2.5 rounded-xl border border-blue-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>7. Desatolamento:</strong> Como remover papel atolado pelas portas e bandejas sem forçar.</span>
              </div>
              <div className="flex items-start gap-1.5 bg-white p-2.5 rounded-xl border border-blue-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>8. Mensagens e Alertas:</strong> Interpretar alertas de erro, papel e portas abertas.</span>
              </div>
              <div className="flex items-start gap-1.5 bg-white p-2.5 rounded-xl border border-blue-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>9. Suporte Técnico:</strong> Procedimento para abertura de chamados técnicos Maquim.</span>
              </div>
              <div className="flex items-start gap-1.5 bg-white p-2.5 rounded-xl border border-blue-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>10. Reposição de Suprimentos:</strong> Solicitar reposição diretamente <strong>ao T.I. de sua Secretaria</strong>.</span>
              </div>
            </div>

            <div className="pt-1.5 flex items-center justify-between text-[11px] text-blue-800 bg-white/80 p-2.5 rounded-xl border border-blue-200">
              <span className="font-semibold">Portal ERS Epson (Consulta em tempo real):</span>
              <a
                href="https://www.remote-services.epson.com/devices/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 underline"
              >
                remote-services.epson.com/devices
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            Dúvidas sobre anulação: fale com o responsável do contrato.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#0D52BD] hover:bg-[#0B1B3D] text-white font-bold rounded-xl shadow-xs transition-colors"
          >
            Entendido, Fechar Guia
          </button>
        </div>
      </div>
    </div>
  );
};
