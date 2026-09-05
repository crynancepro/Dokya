/**
 * Utility for processing and compressing business logos for Firestore storage & PDF export
 */
export async function processImageFileToDataUrl(
  file: File,
  maxWidth = 400,
  maxHeight = 400
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error("Le fichier sélectionné n'est pas une image valide (PNG, JPG, WebP).");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Erreur de lecture du fichier image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Impossible de charger l'image sélectionnée."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate scaling preserving aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(reader.result as string);
        }

        // Clean transparent canvas
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Keep PNG for transparent logos, otherwise use high quality JPEG
        const isPng = file.type === 'image/png' || file.type === 'image/svg+xml';
        const mimeType = isPng ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, isPng ? undefined : 0.92);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
