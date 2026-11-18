import React, { useRef, useEffect } from 'react';
import { Network, Check, Sparkles } from 'lucide-react';

interface SmartIPInputProps {
  value: string;
  onChange: (ip: string) => void;
  error?: string;
  suggestedIP?: string;
}

export const SmartIPInput: React.FC<SmartIPInputProps> = ({
  value,
  onChange,
  error,
  suggestedIP,
}) => {
  const octet1Ref = useRef<HTMLInputElement>(null);
  const octet2Ref = useRef<HTMLInputElement>(null);
  const octet3Ref = useRef<HTMLInputElement>(null);
  const octet4Ref = useRef<HTMLInputElement>(null);

  const refs = [octet1Ref, octet2Ref, octet3Ref, octet4Ref];

  // Divide o IP atual nos 4 octetos
  const parts = (value || '').split('.');
  const octets = [
    parts[0] || '',
    parts[1] || '',
    parts[2] || '',
    parts[3] || '',
  ];

  const updateOctet = (index: number, val: string) => {
    // Apenas números
    const clean = val.replace(/\D/g, '').slice(0, 3);
    const num = parseInt(clean, 10);
    if (!isNaN(num) && num > 255) return; // Limita a 255

    const newOctets = [...octets];
    newOctets[index] = clean;
    const newIP = newOctets.join('.');
    onChange(newIP);

    // Auto-avanço para o próximo octeto quando completar 3 dígitos ou atingir número que não pode ter mais dígitos
    if (clean.length === 3 || (!isNaN(num) && num > 25 && clean.length >= 2)) {
      if (index < 3) {
        refs[index + 1].current?.focus();
        refs[index + 1].current?.select();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Se pressionar ponto (.) ou espaço, avança para o próximo octeto
    if (e.key === '.' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (index < 3) {
        refs[index + 1].current?.focus();
        refs[index + 1].current?.select();
      }
    }
    // Se pressionar Backspace num campo vazio, volta para o anterior
    if (e.key === 'Backspace' && !octets[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').trim();
    const pastedParts = text.split('.');
    if (pastedParts.length === 4) {
      onChange(text);
      refs[3].current?.focus();
    } else {
      const clean = text.replace(/\D/g, '');
      if (clean.length >= 4) {
        // Tenta inferir se for colado sem pontos
        updateOctet(0, clean.slice(0, 3));
      }
    }
  };

  const applyPreset = (prefix: string) => {
    const presetParts = prefix.split('.');
    const newOctets = [
      presetParts[0] || '192',
      presetParts[1] || '168',
      presetParts[2] || '15',
      octets[3] || '',
    ];
    onChange(newOctets.join('.'));
    // Foca diretamente no 4º octeto para o técnico apenas digitar o número final!
    setTimeout(() => {
      refs[3].current?.focus();
      refs[3].current?.select();
    }, 50);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Garante que o teclado mobile não oculte o campo
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  };

  return (
    <div className="space-y-2">
      {/* Atalhos Rápidos para Agilizar em Campo no Celular */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-slate-500 font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Atalhos de Rede:
        </span>

        {suggestedIP && suggestedIP.includes('.') && (
          <button
            type="button"
            onClick={() => {
              onChange(suggestedIP);
              refs[3].current?.focus();
            }}
            className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded-lg border border-blue-300 transition-colors"
            title="Usar IP já registrado na planilha do local"
          >
            Usar IP da Planilha: {suggestedIP}
          </button>
        )}

        <button
          type="button"
          onClick={() => applyPreset('192.168.15.')}
          className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 font-semibold rounded-lg border border-slate-200 transition-colors"
        >
          192.168.15.xxx
        </button>

        <button
          type="button"
          onClick={() => applyPreset('192.168.1.')}
          className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 font-semibold rounded-lg border border-slate-200 transition-colors"
        >
          192.168.1.xxx
        </button>

        <button
          type="button"
          onClick={() => applyPreset('10.0.0.')}
          className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 font-semibold rounded-lg border border-slate-200 transition-colors"
        >
          10.0.0.xxx
        </button>
      </div>

      {/* Caixa dos 4 Octetos Inteligentes com Teclado Numérico */}
      <div
        className={`flex items-center gap-1.5 p-2 bg-white rounded-2xl border transition-all ${
          error
            ? 'border-red-500 bg-red-50/20 ring-2 ring-red-500/20'
            : 'border-slate-300 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/20'
        }`}
        onPaste={handlePaste}
      >
        <div className="pl-2 pr-1 text-slate-400">
          <Network className="w-4 h-4 text-blue-600" />
        </div>

        {/* Octeto 1 */}
        <input
          ref={octet1Ref}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={3}
          value={octets[0]}
          onChange={(e) => updateOctet(0, e.target.value)}
          onKeyDown={(e) => handleKeyDown(0, e)}
          onFocus={handleFocus}
          placeholder="192"
          className="w-14 sm:w-16 py-2 text-center font-mono text-base font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 transition-all"
        />
        <span className="font-bold text-slate-400 text-lg select-none">.</span>

        {/* Octeto 2 */}
        <input
          ref={octet2Ref}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={3}
          value={octets[1]}
          onChange={(e) => updateOctet(1, e.target.value)}
          onKeyDown={(e) => handleKeyDown(1, e)}
          onFocus={handleFocus}
          placeholder="168"
          className="w-14 sm:w-16 py-2 text-center font-mono text-base font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 transition-all"
        />
        <span className="font-bold text-slate-400 text-lg select-none">.</span>

        {/* Octeto 3 */}
        <input
          ref={octet3Ref}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={3}
          value={octets[2]}
          onChange={(e) => updateOctet(2, e.target.value)}
          onKeyDown={(e) => handleKeyDown(2, e)}
          onFocus={handleFocus}
          placeholder="15"
          className="w-14 sm:w-16 py-2 text-center font-mono text-base font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 transition-all"
        />
        <span className="font-bold text-slate-400 text-lg select-none">.</span>

        {/* Octeto 4 */}
        <input
          ref={octet4Ref}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={3}
          value={octets[3]}
          onChange={(e) => updateOctet(3, e.target.value)}
          onKeyDown={(e) => handleKeyDown(3, e)}
          onFocus={handleFocus}
          placeholder="100"
          className="w-14 sm:w-16 py-2 text-center font-mono text-base font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 transition-all"
        />

        <div className="ml-auto pr-2">
          {value && value.split('.').filter(Boolean).length === 4 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              <Check className="w-3 h-3" />
              IP Válido
            </span>
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        💡 O teclado abre automaticamente em números no celular. O ponto é inserido sozinho ao digitar.
      </p>

      {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}
    </div>
  );
};
