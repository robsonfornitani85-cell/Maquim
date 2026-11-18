/**
 * Redimensiona e comprime fotos tiradas pela câmera do celular para manter
 * o PDF leve e evitar estouro de memória no navegador móvel.
 */
export async function compressMobilePhoto(file: File, maxDimension = 900, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    // Usa URL.createObjectURL para não carregar megabytes inteiros na memória do JS de uma vez
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      // Mantém proporção limitando a dimensão máxima (ideal para visualização e impressão nítida no PDF)
      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível obter contexto do canvas'));
        return;
      }

      // Desenha imagem redimensionada
      ctx.drawImage(img, 0, 0, width, height);

      // Converte para JPEG com compressão otimizada (~120KB a 200KB)
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}
