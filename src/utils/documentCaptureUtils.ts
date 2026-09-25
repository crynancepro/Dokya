import html2canvas from 'html2canvas';
import { 
  replaceUnsupportedColorsInString, 
  parseCssColorToRgbString, 
  sanitizeDocumentStyles, 
  sanitizeClonedDocumentForHtml2Canvas, 
  preloadAllImages 
} from '../lib/pdfUtils';
import { DocumentShareWhatsAppParams, generateDocumentWhatsAppShareLink, openDocumentWhatsAppShare } from './whatsappUtils';

export interface DocumentCaptureResult {
  canvas: HTMLCanvasElement;
  blob: Blob;
  dataUrl: string;
  file: File;
  fileName: string;
  width: number;
  height: number;
}

/**
 * Capture le document affiché (CV, Lettre, Devis, Facture, Ebook) sous forme d'image haute définition (PNG).
 * Gère automatiquement le reset des transforms responsive CSS et la compatibilité des couleurs Tailwind v4.
 */
export async function captureDocumentAsImage(
  targetOrSelector?: HTMLElement | string | null,
  customFilename?: string
): Promise<DocumentCaptureResult> {
  // 1. Trouver l'élément DOM cible
  let element: HTMLElement | null = null;
  if (targetOrSelector instanceof HTMLElement) {
    element = targetOrSelector;
  } else if (typeof targetOrSelector === 'string' && targetOrSelector) {
    element = document.querySelector(targetOrSelector) as HTMLElement;
  }

  // Fallback intelligent de recherche
  if (!element) {
    element = 
      document.querySelector('#dokya-document-capture-target') as HTMLElement ||
      document.querySelector('#cv-preview') as HTMLElement ||
      document.querySelector('#letter-preview') as HTMLElement ||
      document.querySelector('#business-doc-preview') as HTMLElement ||
      document.querySelector('#modal-cv-preview') as HTMLElement ||
      document.querySelector('#modal-letter-preview') as HTMLElement ||
      document.querySelector('#modal-business-preview') as HTMLElement ||
      document.querySelector('#modal-ebook-preview') as HTMLElement ||
      document.querySelector('[data-a4-wrapper="true"]') as HTMLElement ||
      document.querySelector('.a4-document-root') as HTMLElement;
  }

  if (!element) {
    throw new Error("Impossible de trouver l'élément de prévisualisation du document à capturer.");
  }

  // 2. Assainir les feuilles de styles globales (neutralise OKLCH Tailwind v4)
  if (typeof document !== 'undefined') {
    sanitizeDocumentStyles(document);
  }

  // 3. Précharger et décoder toutes les images et photos du document avant capture
  await preloadAllImages(element);

  // 4. Sauvegarde des styles inline et gestion du scale CSS responsive
  const origElWidth = element.style.width;
  const origElMinWidth = element.style.minWidth;
  const origElMaxWidth = element.style.maxWidth;
  const origElMinHeight = element.style.minHeight;
  const origElTransform = element.style.transform;
  const origBoxSizing = element.style.boxSizing;

  // Sauvegarder les transforms des ancêtres (ex: A4PreviewContainer)
  const scaledAncestors: { el: HTMLElement; origTransform: string }[] = [];
  let curr: HTMLElement | null = element.parentElement;
  while (curr && curr !== document.body) {
    if (curr.style.transform && curr.style.transform.includes('scale')) {
      scaledAncestors.push({ el: curr, origTransform: curr.style.transform });
      curr.style.transform = 'none';
    }
    curr = curr.parentElement;
  }

  // Forcer les dimensions standard A4 nettes pour html2canvas
  element.style.transform = 'none';
  element.style.boxSizing = 'border-box';
  element.style.width = '794px';
  element.style.minWidth = '794px';
  element.style.maxWidth = '794px';

  // Sanitisation exhaustive des couleurs OKLCH sur le document cible et tous ses enfants
  const styleRestorers: { el: HTMLElement; prop: string; origVal: string }[] = [];
  const targetElements = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];

  const colorProps = [
    'color',
    'backgroundColor',
    'borderColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
    'textDecorationColor',
    'fill',
    'stroke'
  ] as const;

  targetElements.forEach((el) => {
    if (!el.style) return;
    try {
      const computed = window.getComputedStyle(el);
      if (computed.opacity === '0') {
        styleRestorers.push({ el, prop: 'opacity', origVal: el.style.opacity });
        el.style.opacity = '1';
      }

      colorProps.forEach((prop) => {
        try {
          const compVal = (computed as any)[prop];
          if (compVal && typeof compVal === 'string' && (
            compVal.includes('oklch') || 
            compVal.includes('oklab') || 
            compVal.includes('color-mix') || 
            compVal.includes('light-dark') || 
            compVal.includes('lab(') || 
            compVal.includes('color(')
          )) {
            styleRestorers.push({ el, prop, origVal: (el.style as any)[prop] });
            (el.style as any)[prop] = parseCssColorToRgbString(compVal);
          }
        } catch {
          // Ignore
        }
      });
    } catch {
      // Ignorer erreurs
    }
  });

  try {
    // 5. Rendu du canvas haute définition (Scale 2.0 = ~300 DPI Retina)
    const canvas = await html2canvas(element, {
      scale: 2.0,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: 1440,
      width: 794,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        sanitizeClonedDocumentForHtml2Canvas(clonedDoc, element.id);
      }
    });

    const dataUrl = canvas.toDataURL('image/png', 1.0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("Échec de la génération du blob image."));
      }, 'image/png');
    });

    const safeName = (customFilename || `Dokya_Capture_${Date.now()}`)
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_');
    const finalFileName = `${safeName}.png`;

    const file = new File([blob], finalFileName, { type: 'image/png' });

    return {
      canvas,
      blob,
      dataUrl,
      file,
      fileName: finalFileName,
      width: canvas.width,
      height: canvas.height
    };
  } finally {
    // 6. Restauration fidèle des styles
    styleRestorers.forEach(({ el, prop, origVal }) => {
      try {
        (el.style as any)[prop] = origVal;
      } catch {
        // Ignore
      }
    });

    element.style.width = origElWidth;
    element.style.minWidth = origElMinWidth;
    element.style.maxWidth = origElMaxWidth;
    element.style.minHeight = origElMinHeight;
    element.style.transform = origElTransform;
    element.style.boxSizing = origBoxSizing;

    scaledAncestors.forEach(({ el, origTransform }) => {
      el.style.transform = origTransform;
    });
  }
}

/**
 * Télécharge un fichier image PNG localement
 */
export function downloadImageFile(blobOrUrl: Blob | string, fileName: string): void {
  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (typeof blobOrUrl !== 'string') {
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }
}

/**
 * Copie une image PNG dans le presse-papier de l'utilisateur
 */
export async function copyImageBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (err) {
    console.warn('Impossible de copier l\'image dans le presse-papier:', err);
  }
  return false;
}

/**
 * Partage WhatsApp combinant texte officiel et capture du document :
 * - Sur mobile / navigateurs compatibles (Web Share API avec fichiers) : déclenche le partage natif WhatsApp avec l'image jointe directement !
 * - Sur Desktop / navigateurs sans support direct : télécharge l'image, la copie dans le presse-papier et ouvre WhatsApp avec le message pré-rempli.
 */
export async function shareDocumentWithCaptureOnWhatsApp(
  params: DocumentShareWhatsAppParams,
  captureResult: DocumentCaptureResult
): Promise<{
  method: 'native_share' | 'clipboard_download';
  copied: boolean;
  downloaded: boolean;
}> {
  // Construire le message WhatsApp
  const shareLinkUrl = generateDocumentWhatsAppShareLink(params);
  let shareText = `*${params.title}*\n`;
  if (params.recipientName) {
    shareText += `👤 *Destinataire / Titulaire :* ${params.recipientName}\n`;
  }
  if (params.docNumber) {
    shareText += `🔢 *Réf :* ${params.docNumber}\n`;
  }
  if (params.totalAmount) {
    shareText += `💰 *Montant :* ${params.totalAmount.toLocaleString('fr-FR')} ${params.currency || 'FCFA'}\n`;
  }
  shareText += `\n📸 *Capture haute résolution jointe.*\n`;
  shareText += `🔗 *Lien certifié Dokya :* ${shareLinkUrl}`;

  // 1. Essai de partage natif (Mobile Safari, Android Chrome, etc.)
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  ) {
    try {
      const shareData = {
        title: params.title,
        text: shareText,
        files: [captureResult.file]
      };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return {
          method: 'native_share',
          copied: false,
          downloaded: false
        };
      }
    } catch (shareErr: any) {
      // Si l'utilisateur annule le partage natif (AbortError), on s'arrête gentiment
      if (shareErr?.name === 'AbortError') {
        return {
          method: 'native_share',
          copied: false,
          downloaded: false
        };
      }
      console.warn("Échec du partage natif avec fichier, bascule vers mode presse-papier/téléchargement:", shareErr);
    }
  }

  // 2. Mode universel (PC & navigateurs classiques) :
  // Copier dans le presse-papier + Télécharger automatiquement l'image + Ouvrir WhatsApp
  let copied = false;
  try {
    copied = await copyImageBlobToClipboard(captureResult.blob);
  } catch {
    copied = false;
  }

  // Téléchargement automatique de l'image
  downloadImageFile(captureResult.blob, captureResult.fileName);

  // Ouverture WhatsApp
  openDocumentWhatsAppShare(params);

  return {
    method: 'clipboard_download',
    copied,
    downloaded: true
  };
}
