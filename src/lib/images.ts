const maxImageWidth = 1200;
const maxImageBytes = 1024 * 1024;

export async function compressProductImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo no es una imagen.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxImageWidth / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No pude procesar la imagen.");

  context.drawImage(bitmap, 0, 0, width, height);

  for (const quality of [0.78, 0.68, 0.58, 0.48, 0.38]) {
    const blob = await canvasToBlob(canvas, "image/webp", quality);
    if (blob.size <= maxImageBytes || quality === 0.38) {
      return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
    }
  }

  throw new Error("No pude comprimir la imagen.");
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No pude convertir la imagen."));
    }, type, quality);
  });
}
