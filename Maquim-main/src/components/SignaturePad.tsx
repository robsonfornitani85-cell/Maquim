import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, Check, PenTool, Maximize2, X, RotateCw } from 'lucide-react';

interface SignaturePadProps {
  onSave: (base64: string) => void;
  onClear: () => void;
  initialSignature?: string;
  label?: string;
}

// Proporção fixa da assinatura salva (igual à caixa de assinatura do PDF: 68 x 17 mm)
const OUT_W = 1200;
const OUT_H = 300;

/**
 * Recorta o traço (ignora espaço em branco) e encaixa numa imagem 4:1 sem
 * distorcer, para a assinatura sair do mesmo jeito no formulário e no PDF.
 */
function exportSignature(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const pad = 12;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width, maxX + pad);
  maxY = Math.min(height, maxY + pad);
  const sw = maxX - minX;
  const sh = maxY - minY;

  const out = document.createElement('canvas');
  out.width = OUT_W;
  out.height = OUT_H;
  const octx = out.getContext('2d');
  if (!octx) return null;
  const scale = Math.min(OUT_W / sw, OUT_H / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  octx.drawImage(canvas, minX, minY, sw, sh, (OUT_W - dw) / 2, (OUT_H - dh) / 2, dw, dh);
  return out.toDataURL('image/png');
}

/** Área de desenho reutilizada no modo normal e no modo tela cheia. */
const DrawingCanvas: React.FC<{
  height: number | 'fill';
  lineWidth: number;
  rotated?: boolean; // quando a tela cheia é girada via CSS (iPhone em pé)
  onStroke: (canvas: HTMLCanvasElement) => void;
  canvasRefOut: React.MutableRefObject<HTMLCanvasElement | null>;
  initialImage?: string;
}> = ({ height, lineWidth, rotated, onStroke, canvasRefOut, initialImage }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    // Em modo girado, a "largura" lógica do canvas é a altura do elemento pai
    const parent = canvas.parentElement;
    const w = rotated ? parent.clientHeight : parent.clientWidth;
    const h = height === 'fill' ? (rotated ? parent.clientWidth : parent.clientHeight) : height;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = '#0f172a';
    if (initialImage) {
      const img = new Image();
      img.onload = () => {
        // Encaixa sem distorcer
        const s = Math.min(w / img.width, h / img.height);
        const dw = img.width * s;
        const dh = img.height * s;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      };
      img.src = initialImage;
    }
  }, [height, lineWidth, rotated, initialImage]);

  useEffect(() => {
    canvasRefOut.current = canvasRef.current;
    setup();
  }, [setup, canvasRefOut]);

  const point = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if (rotated) {
      // Canvas girado 90° no sentido horário: eixo x local aponta para baixo na tela
      return { x: e.clientY - rect.top, y: rect.right - e.clientX };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    drawing.current = true;
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (canvasRef.current) onStroke(canvasRef.current);
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={up}
      className="block touch-none cursor-crosshair"
      style={rotated ? { transform: 'rotate(90deg)', transformOrigin: 'top left', position: 'absolute', top: 0, left: '100%' } : undefined}
    />
  );
};

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  onClear,
  initialSignature,
  label = 'Assinatura na Tela (Touchscreen / Mouse)',
}) => {
  const inlineCanvas = useRef<HTMLCanvasElement | null>(null);
  const fullCanvas = useRef<HTMLCanvasElement | null>(null);
  const [hasDrawn, setHasDrawn] = useState(Boolean(initialSignature));
  const [fullscreen, setFullscreen] = useState(false);
  const [rotateCSS, setRotateCSS] = useState(false);
  const [fullHasInk, setFullHasInk] = useState(false);
  const [inlineKey, setInlineKey] = useState(0);

  useEffect(() => {
    setHasDrawn(Boolean(initialSignature));
  }, [initialSignature]);

  const handleInlineStroke = (canvas: HTMLCanvasElement) => {
    const out = exportSignature(canvas);
    if (out) {
      setHasDrawn(true);
      onSave(out);
    }
  };

  const handleClear = () => {
    const c = inlineCanvas.current;
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
    setInlineKey((k) => k + 1);
    onClear();
  };

  const openFullscreen = async () => {
    setFullHasInk(false);
    let landscapeOk = false;
    try {
      const el = document.documentElement as any;
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      const orientation = (screen as any).orientation;
      if (orientation?.lock) {
        await orientation.lock('landscape');
        landscapeOk = true;
      }
    } catch {
      // iPhone e alguns navegadores não permitem travar a orientação
    }
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    // Sem trava de orientação e aparelho em pé: gira a área de assinatura via CSS
    setRotateCSS(!landscapeOk && isPortrait);
    setFullscreen(true);
  };

  const closeFullscreen = async () => {
    setFullscreen(false);
    try {
      (screen as any).orientation?.unlock?.();
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // ignora
    }
  };

  // Se o técnico girar o celular manualmente, reavalia a rotação CSS
  useEffect(() => {
    if (!fullscreen) return;
    const mq = window.matchMedia('(orientation: portrait)');
    const onChange = () => {
      const locked = Boolean(document.fullscreenElement) && !mq.matches;
      setRotateCSS(mq.matches && !locked);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [fullscreen]);

  const confirmFullscreen = () => {
    const c = fullCanvas.current;
    const out = c ? exportSignature(c) : null;
    if (out) {
      onSave(out);
      setHasDrawn(true);
      setInlineKey((k) => k + 1); // redesenha a prévia com a nova assinatura
    }
    closeFullscreen();
  };

  const clearFullscreen = () => {
    const c = fullCanvas.current;
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    setFullHasInk(false);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 gap-2">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-blue-600" />
          {label}
        </label>
        {hasDrawn && (
          <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 shrink-0">
            <Check className="w-3.5 h-3.5" /> Assinado
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={openFullscreen}
        className="w-full mb-2 inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm"
      >
        <Maximize2 className="w-4 h-4" />
        {hasDrawn ? 'Assinar novamente em tela cheia (horizontal)' : 'Assinar em tela cheia (horizontal)'}
      </button>

      <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden shadow-inner touch-none">
        <DrawingCanvas
          key={inlineKey}
          height={150}
          lineWidth={2.2}
          onStroke={handleInlineStroke}
          canvasRefOut={inlineCanvas}
          initialImage={initialSignature}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium select-none text-center px-4">
            Assine aqui com o dedo, ou use o botão acima para uma área maior
          </div>
        )}
      </div>

      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
        >
          <Eraser className="w-3.5 h-3.5" />
          Limpar Assinatura
        </button>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-[80] bg-slate-900 flex flex-col">
          {rotateCSS ? (
            // Aparelho em pé sem trava de orientação: tudo girado 90°
            <div
              className="absolute bg-white"
              style={{
                width: '100vh',
                height: '100vw',
                top: 0,
                left: '100vw',
                transform: 'rotate(90deg)',
                transformOrigin: 'top left',
              }}
            >
              <FullscreenContent
                rotatedParent
                fullCanvas={fullCanvas}
                hasInk={fullHasInk}
                onInk={() => setFullHasInk(true)}
                onClear={clearFullscreen}
                onCancel={closeFullscreen}
                onConfirm={confirmFullscreen}
                label={label}
              />
            </div>
          ) : (
            <div className="absolute inset-0 bg-white">
              <FullscreenContent
                fullCanvas={fullCanvas}
                hasInk={fullHasInk}
                onInk={() => setFullHasInk(true)}
                onClear={clearFullscreen}
                onCancel={closeFullscreen}
                onConfirm={confirmFullscreen}
                label={label}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const FullscreenContent: React.FC<{
  rotatedParent?: boolean;
  fullCanvas: React.MutableRefObject<HTMLCanvasElement | null>;
  hasInk: boolean;
  onInk: () => void;
  onClear: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  label: string;
}> = ({ rotatedParent, fullCanvas, hasInk, onInk, onClear, onCancel, onConfirm, label }) => {
  const areaRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      const el = areaRef.current;
      if (el) setSize({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <PenTool className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide truncate">{label}</span>
        </div>
        {rotatedParent && (
          <span className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0">
            <RotateCw className="w-3 h-3" /> Gire o celular
          </span>
        )}
      </div>
      <div ref={areaRef} className="relative flex-1 border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-white">
        {size && (
          <SizedCanvas w={size.w} h={size.h} fullCanvas={fullCanvas} onInk={onInk} rotatedParent={rotatedParent} />
        )}
        <div className="absolute left-6 right-6 bottom-[28%] border-b border-slate-300 pointer-events-none" />
        {!hasInk && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-sm select-none">
            Assine aqui com o dedo
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="px-4 h-11 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold flex items-center gap-1">
          <X className="w-4 h-4" /> Cancelar
        </button>
        <button type="button" onClick={onClear} className="px-4 h-11 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold flex items-center gap-1">
          <Eraser className="w-4 h-4" /> Limpar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!hasInk}
          className="flex-1 h-11 rounded-xl bg-emerald-600 disabled:opacity-40 text-white text-sm font-bold flex items-center justify-center gap-1.5"
        >
          <Check className="w-5 h-5" /> Confirmar assinatura
        </button>
      </div>
    </div>
  );
};

/** Canvas em tamanho fixo (medido) que traduz o toque também quando a tela está girada via CSS. */
const SizedCanvas: React.FC<{
  w: number;
  h: number;
  rotatedParent?: boolean;
  fullCanvas: React.MutableRefObject<HTMLCanvasElement | null>;
  onInk: () => void;
}> = ({ w, h, rotatedParent, fullCanvas, onInk }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    fullCanvas.current = canvas;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = '#0f172a';
  }, [w, h, fullCanvas]);

  const point = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    if (rotatedParent) {
      // O contêiner está girado 90° no sentido horário
      return { x: e.clientY - rect.top, y: rect.right - e.clientX };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <canvas
      ref={ref}
      className="block touch-none"
      onPointerDown={(e) => {
        e.preventDefault();
        (e.target as Element).setPointerCapture?.(e.pointerId);
        const ctx = ref.current?.getContext('2d');
        if (!ctx) return;
        const { x, y } = point(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 0.1, y + 0.1);
        ctx.stroke();
        drawing.current = true;
        onInk();
      }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        const ctx = ref.current?.getContext('2d');
        if (!ctx) return;
        const { x, y } = point(e);
        ctx.lineTo(x, y);
        ctx.stroke();
      }}
      onPointerUp={() => (drawing.current = false)}
      onPointerCancel={() => (drawing.current = false)}
    />
  );
};
