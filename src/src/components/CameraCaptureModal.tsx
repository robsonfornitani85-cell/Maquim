import React, { useRef, useState } from 'react';
import { Camera, Upload, X, Check, RefreshCw } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
  title?: string;
  subtitle?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Registrar Foto',
  subtitle = 'Tire uma foto nítida com a câmera do celular ou anexe um arquivo',
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Redimensiona para manter o PDF leve (< 800px)
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setPreview(compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (preview) {
      onCapture(preview);
      onClose();
      setPreview(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">{title}</h3>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setPreview(null);
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-5">
          {preview ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-900 aspect-4/3 flex items-center justify-center">
              <img src={preview} alt="Prévia da Avaria" className="max-h-full max-w-full object-contain" />
              <button
                onClick={() => setPreview(null)}
                className="absolute top-2 right-2 px-2.5 py-1.5 bg-black/70 hover:bg-black text-white text-xs rounded-lg flex items-center gap-1 backdrop-blur-xs transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Trocar Foto
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition-colors group flex flex-col items-center justify-center gap-3 aspect-4/3"
            >
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Camera className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Tirar Foto ou Escolher Arquivo</p>
                <p className="text-xs text-slate-400 mt-1">Toque para abrir a câmera do celular ou galeria</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100/80 rounded-lg">
                <Upload className="w-3.5 h-3.5" />
                Capturar Agora
              </span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!preview}
            onClick={handleConfirm}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Anexar Foto à OS
          </button>
        </div>
      </div>
    </div>
  );
};
