import React, { useEffect, useState } from 'react';
import { Delete, Network, Check, ChevronRight, Sparkles } from 'lucide-react';
import { isValidIPv4 } from '../utils/validation';

interface IPKeypadInputProps {
  value: string;
  onChange: (ip: string) => void;
  error?: string;
  /** IP sugerido (ex: IP do equipamento antigo neste mesmo local) */
  suggestedIP?: string;
  suggestedIPLabel?: string;
  /** Prefixos de rede comuns deste local (ex: "192.168.15") */
  prefixSuggestions?: string[];
}

const toOctets = (ip: string): string[] => {
  const parts = (ip || '').split('.');
  return [0, 1, 2, 3].map((i) => (parts[i] || '').replace(/\D/g, '').slice(0, 3));
};

const fromOctets = (oct: string[]): string => {
  let last = -1;
  oct.forEach((o, i) => {
    if (o) last = i;
  });
  return last < 0 ? '' : oct.slice(0, last + 1).join('.');
};

/** Próximo índice de octeto a editar a partir de um IP já existente */
const nextIndex = (oct: string[]): number => {
  for (let i = 0; i < 4; i++) {
    if (!oct[i]) return i;
    const n = parseInt(oct[i], 10);
    if (oct[i].length < 3 && !(oct[i] === '0' || n > 25)) return i;
  }
  return 3;
};

/**
 * Campo de IP com teclado próprio (só números).
 * O técnico digita apenas os dígitos: o ponto é colocado sozinho quando o
 * bloco completa 3 dígitos ou quando não cabe mais nenhum dígito (ex: "26" → 26.).
 * Para blocos curtos (ex: o "15" de 192.168.15.50) basta tocar em "Próximo ▸".
 */
export const IPKeypadInput: React.FC<IPKeypadInputProps> = ({
  value,
  onChange,
  error,
  suggestedIP,
  suggestedIPLabel = 'IP do equipamento anterior',
  prefixSuggestions = [],
}) => {
  const [open, setOpen] = useState(false);
  const [octets, setOctets] = useState<string[]>(() => toOctets(value));
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!open) setOctets(toOctets(value));
  }, [value, open]);

  const commit = (oct: string[], newIdx: number) => {
    setOctets(oct);
    setIdx(newIdx);
    onChange(fromOctets(oct));
  };

  const pressDigit = (d: string) => {
    const oct = [...octets];
    let i = idx;
    const cur = oct[i];
    const canAppend = cur.length < 3 && cur !== '0' && parseInt(cur + d, 10) <= 255;
    if (!canAppend) {
      if (i >= 3) return; // último bloco cheio
      i += 1;
      oct[i] = '';
    }
    oct[i] = oct[i] + d;
    const n = parseInt(oct[i], 10);
    const full = oct[i].length === 3 || oct[i] === '0' || n > 25;
    commit(oct, full && i < 3 ? i + 1 : i);
  };

  const pressNext = () => {
    if (octets[idx] && idx < 3) setIdx(idx + 1);
  };

  const pressBackspace = () => {
    const oct = [...octets];
    let i = idx;
    if (!oct[i] && i > 0) i -= 1;
    oct[i] = oct[i].slice(0, -1);
    commit(oct, i);
  };

  const applyIP = (ip: string) => {
    const oct = toOctets(ip);
    commit(oct, nextIndex(oct));
  };

  const applyPrefix = (prefix: string) => {
    const p = toOctets(prefix);
    const oct = [p[0], p[1], p[2], ''];
    commit(oct, 3);
  };

  const openPad = () => {
    const oct = toOctets(value);
    setOctets(oct);
    setIdx(nextIndex(oct));
    setOpen(true);
  };

  // Teclado físico (PC) enquanto o painel está aberto
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) pressDigit(e.key);
      else if (e.key === '.' || e.key === ' ' || e.key === 'ArrowRight') pressNext();
      else if (e.key === 'Backspace') pressBackspace();
      else if (e.key === 'Enter' || e.key === 'Escape') setOpen(false);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const ipAtual = fromOctets(octets);
  const valido = isValidIPv4(ipAtual);

  const OctetBoxes = ({ large }: { large?: boolean }) => (
    <div className="flex items-center justify-center gap-1">
      {octets.map((o, i) => (
        <React.Fragment key={i}>
          <span
            onClick={() => open && (o || i === 0 || octets[i - 1]) && setIdx(i)}
            className={`inline-flex items-center justify-center font-mono font-bold rounded-lg border-2 ${
              large ? 'w-16 h-12 text-2xl' : 'w-12 h-9 text-base'
            } ${
              open && i === idx
                ? 'border-blue-600 bg-blue-50 text-blue-900 ring-4 ring-blue-500/20'
                : o
                ? 'border-slate-300 bg-white text-slate-900'
                : 'border-dashed border-slate-300 bg-slate-50 text-slate-300'
            }`}
          >
            {o || (open && i === idx ? <span className="w-0.5 h-6 bg-blue-600 animate-pulse" /> : '·')}
          </span>
          {i < 3 && <span className={`font-black text-slate-500 ${large ? 'text-2xl' : 'text-lg'}`}>.</span>}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div>
      <button
        type="button"
        onClick={openPad}
        className={`w-full max-w-sm p-2.5 rounded-xl border-2 bg-white flex items-center gap-3 text-left transition-all ${
          error ? 'border-red-500 bg-red-50/40' : value ? 'border-slate-300' : 'border-amber-400 bg-amber-50/60'
        }`}
        aria-label="Digitar endereço IP"
      >
        <Network className="w-5 h-5 text-blue-600 shrink-0" />
        <div className="flex-1">
          <OctetBoxes />
        </div>
      </button>
      {!value && !error && (
        <p className="text-[11px] text-amber-800 mt-1 font-semibold">Toque para digitar. Só números: os pontos entram sozinhos.</p>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="bg-slate-100 rounded-t-3xl shadow-2xl p-3 pb-[max(12px,env(safe-area-inset-bottom))] space-y-3 animate-in slide-in-from-bottom duration-150 max-w-lg w-full mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Endereço IP do equipamento</span>
              {ipAtual && (
                <span className={`text-[11px] font-bold ${valido ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {valido ? '✓ IP válido' : 'Incompleto'}
                </span>
              )}
            </div>

            <div className="bg-white rounded-2xl p-3 border border-slate-200">
              <OctetBoxes large />
            </div>

            {(suggestedIP || prefixSuggestions.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {suggestedIP && isValidIPv4(suggestedIP) && (
                  <button
                    type="button"
                    onClick={() => applyIP(suggestedIP)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {suggestedIPLabel}: <span className="font-mono">{suggestedIP}</span>
                  </button>
                )}
                {prefixSuggestions.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => applyPrefix(p)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-mono font-bold"
                  >
                    {p}.___
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 select-none">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => pressDigit(d)}
                  className="h-14 rounded-xl bg-white shadow-xs border border-slate-200 text-2xl font-bold text-slate-900 active:bg-blue-100"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={pressNext}
                disabled={!octets[idx] || idx >= 3}
                className="h-14 rounded-xl bg-blue-100 border border-blue-300 text-blue-900 text-sm font-bold flex items-center justify-center gap-0.5 disabled:opacity-40 active:bg-blue-200"
              >
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => pressDigit('0')}
                className="h-14 rounded-xl bg-white shadow-xs border border-slate-200 text-2xl font-bold text-slate-900 active:bg-blue-100"
              >
                0
              </button>
              <button
                type="button"
                onClick={pressBackspace}
                className="h-14 rounded-xl bg-slate-200 border border-slate-300 text-slate-800 flex items-center justify-center active:bg-slate-300"
                aria-label="Apagar"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => commit(['', '', '', ''], 0)}
                className="px-4 h-12 rounded-xl bg-white border border-slate-300 text-slate-700 text-sm font-semibold"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`flex-1 h-12 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-1.5 ${
                  valido ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <Check className="w-5 h-5" />
                {valido ? 'Confirmar IP' : 'Fechar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
