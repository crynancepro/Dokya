import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Converts OKLCH color parameters (Lightness, Chroma, Hue, Alpha) to standard rgb()/rgba() strings.
 */
export function oklchToRgb(lStr: string, cStr: string, hStr: string, aStr?: string): string {

  let l = parseFloat(lStr);
  if (lStr.endsWith('%')) l /= 100;

  let c = parseFloat(cStr);
  if (cStr.endsWith('%')) c /= 100;

  let h = parseFloat(hStr);

  let a = 1;
  if (aStr !== undefined && aStr !== null && aStr.trim() !== '') {
    a = parseFloat(aStr);
    if (aStr.endsWith('%')) a /= 100;
  }

  if (isNaN(l)) l = 0;
  if (isNaN(c)) c = 0;
  if (isNaN(h)) h = 0;
  if (isNaN(a)) a = 1;

  const hRad = (h * Math.PI) / 180;
  const a_val = c * Math.cos(hRad);
  const b_val = c * Math.sin(hRad);

  const l_s = l + 0.3963377774 * a_val + 0.2158037573 * b_val;
  const m_s = l - 0.1055613458 * a_val - 0.0638541728 * b_val;
  const s_s = l - 0.0894841775 * a_val - 1.291485548 * b_val;

  const L_lms = Math.pow(Math.max(0, l_s), 3);
  const M_lms = Math.pow(Math.max(0, m_s), 3);
  const S_lms = Math.pow(Math.max(0, s_s), 3);

  const r_linear = +4.0767416621 * L_lms - 3.3077115913 * M_lms + 0.2309699292 * S_lms;
  const g_linear = -1.2684380046 * L_lms + 2.6097574011 * M_lms - 0.3413193965 * S_lms;
  const b_linear = -0.0041960863 * L_lms - 0.7034186147 * M_lms + 1.707614701 * S_lms;

  const transfer = (x: number) =>
    x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(0, x), 1 / 2.4) - 0.055;

  const r = Math.min(255, Math.max(0, Math.round(transfer(r_linear) * 255)));
  const g = Math.min(255, Math.max(0, Math.round(transfer(g_linear) * 255)));
  const b = Math.min(255, Math.max(0, Math.round(transfer(b_linear) * 255)));

  if (a < 0.999) {
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Converts OKLAB color parameters (L, a, b, Alpha) to standard rgb()/rgba() strings.
 */
export function oklabToRgb(lStr: string, aStr: string, bStr: string, alphaStr?: string): string {
  let l = parseFloat(lStr);
  if (lStr.endsWith('%')) l /= 100;

  let a_val = parseFloat(aStr);
  if (aStr.endsWith('%')) a_val /= 100;

  let b_val = parseFloat(bStr);
  if (bStr.endsWith('%')) b_val /= 100;

  let alpha = 1;
  if (alphaStr !== undefined && alphaStr !== null && alphaStr.trim() !== '') {
    alpha = parseFloat(alphaStr);
    if (alphaStr.endsWith('%')) alpha /= 100;
  }

  if (isNaN(l)) l = 0;
  if (isNaN(a_val)) a_val = 0;
  if (isNaN(b_val)) b_val = 0;
  if (isNaN(alpha)) alpha = 1;

  const l_s = l + 0.3963377774 * a_val + 0.2158037573 * b_val;
  const m_s = l - 0.1055613458 * a_val - 0.0638541728 * b_val;
  const s_s = l - 0.0894841775 * a_val - 1.291485548 * b_val;

  const L_lms = Math.pow(Math.max(0, l_s), 3);
  const M_lms = Math.pow(Math.max(0, m_s), 3);
  const S_lms = Math.pow(Math.max(0, s_s), 3);

  const r_linear = +4.0767416621 * L_lms - 3.3077115913 * M_lms + 0.2309699292 * S_lms;
  const g_linear = -1.2684380046 * L_lms + 2.6097574011 * M_lms - 0.3413193965 * S_lms;
  const b_linear = -0.0041960863 * L_lms - 0.7034186147 * M_lms + 1.707614701 * S_lms;

  const transfer = (x: number) =>
    x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(0, x), 1 / 2.4) - 0.055;

  const r = Math.min(255, Math.max(0, Math.round(transfer(r_linear) * 255)));
  const g = Math.min(255, Math.max(0, Math.round(transfer(g_linear) * 255)));
  const b = Math.min(255, Math.max(0, Math.round(transfer(b_linear) * 255)));

  if (alpha < 0.999) {
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Replaces all unsupported CSS color functions (oklch, oklab, color-mix, light-dark, lab) in a string
 * with valid rgb()/rgba() equivalents using balanced parenthesis matching.
 */
export function replaceUnsupportedColorsInString(cssText: string): string {
  if (!cssText) return cssText;

  let result = cssText;
  const colorFuncRegex = /(oklch|oklab|color-mix|light-dark|lab)\s*\(/gi;

  let safetyCounter = 0;
  let match;

  while (safetyCounter < 1000 && (match = colorFuncRegex.exec(result))) {
    safetyCounter++;
    const startIndex = match.index;
    const funcName = match[1].toLowerCase();

    // Find matching parenthesis
    let depth = 1;
    let endIndex = startIndex + match[0].length;

    while (endIndex < result.length && depth > 0) {
      if (result[endIndex] === '(') depth++;
      else if (result[endIndex] === ')') depth--;
      endIndex++;
    }

    if (depth === 0) {
      const fullExpr = result.slice(startIndex, endIndex);
      let replacement = 'transparent';

      if (funcName === 'oklch') {
        const nums = fullExpr.match(/[-+]?[\d.]+%?/g);
        if (nums && nums.length >= 3) {
          try {
            replacement = oklchToRgb(nums[0], nums[1], nums[2], nums[3]);
          } catch {
            replacement = 'currentColor';
          }
        }
      } else if (funcName === 'oklab') {
        const nums = fullExpr.match(/[-+]?[\d.]+%?/g);
        if (nums && nums.length >= 3) {
          try {
            replacement = oklabToRgb(nums[0], nums[1], nums[2], nums[3]);
          } catch {
            replacement = 'currentColor';
          }
        }
      } else if (funcName === 'light-dark') {
        replacement = 'currentColor';
      }

      result = result.slice(0, startIndex) + replacement + result.slice(endIndex);
      colorFuncRegex.lastIndex = 0; // Reset regex to re-scan
    } else {
      break;
    }
  }

  return result;
}

export function replaceOklchInString(cssText: string): string {
  return replaceUnsupportedColorsInString(cssText);
}

/**
 * Sanitizes all document <style> tags, stylesheets, and element inline styles in both live and cloned DOM.
 */
export function sanitizeDocumentStyles(targetDoc: Document = document): void {
  // 1. Sanitize all style elements
  const styleTags = Array.from(targetDoc.querySelectorAll('style'));
  styleTags.forEach((styleTag) => {
    if (styleTag.textContent && (
      styleTag.textContent.includes('oklch') || 
      styleTag.textContent.includes('oklab') || 
      styleTag.textContent.includes('color-mix') || 
      styleTag.textContent.includes('light-dark')
    )) {
      styleTag.textContent = replaceUnsupportedColorsInString(styleTag.textContent);
    }
  });

  // 2. Iterate stylesheet rules if available
  try {
    const stylesheets = Array.from(targetDoc.styleSheets);
    stylesheets.forEach((sheet) => {
      try {
        if (sheet.cssRules) {
          const rules = Array.from(sheet.cssRules);
          rules.forEach((rule) => {
            if (rule.cssText && (
              rule.cssText.includes('oklch') || 
              rule.cssText.includes('oklab') || 
              rule.cssText.includes('color-mix') || 
              rule.cssText.includes('light-dark')
            )) {
              if ('style' in rule && (rule as CSSStyleRule).style) {
                const styleObj = (rule as CSSStyleRule).style;
                for (let i = 0; i < styleObj.length; i++) {
                  const propName = styleObj[i];
                  const val = styleObj.getPropertyValue(propName);
                  if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix') || val.includes('light-dark'))) {
                    styleObj.setProperty(propName, replaceUnsupportedColorsInString(val), styleObj.getPropertyPriority(propName));
                  }
                }
              }
            }
          });
        }
      } catch {
        // Cross-origin stylesheet access restriction
      }
    });
  } catch {
    // Continuation safety
  }

  // 3. Sanitize all elements with inline style attributes
  const elementsWithStyle = Array.from(targetDoc.querySelectorAll('[style]'));
  elementsWithStyle.forEach((el) => {
    const currentStyle = el.getAttribute('style');
    if (currentStyle && (
      currentStyle.includes('oklch') || 
      currentStyle.includes('oklab') || 
      currentStyle.includes('color-mix') || 
      currentStyle.includes('light-dark')
    )) {
      el.setAttribute('style', replaceUnsupportedColorsInString(currentStyle));
    }
  });
}

/**
 * Comprehensive DOM & CSS Sanitizer for html2canvas compatibility.
 * Resolves all Tailwind v4 OKLCH / OKLAB stylesheet parser errors
 * and strips interactive editor overlays, hover badges, and outline borders for pristine PDF exports.
 */
export function sanitizeClonedDocumentForHtml2Canvas(clonedDoc: Document, targetId?: string): void {
  // 1. Inject PDF Print Reset CSS into cloned document head
  try {
    const styleEl = clonedDoc.createElement('style');
    styleEl.textContent = `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }
      .print\\:hidden,
      [class*="print:hidden"],
      button:not(#cv-preview button):not(#letter-preview button):not(#kdp-printable-manuscript button),
      .canva-toolbar,
      .group-hover\\/section\\:opacity-100,
      .group-hover\\/item\\:opacity-100,
      .group-hover\\/edu\\:opacity-100 {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      [contenteditable] {
        outline: none !important;
        border: none !important;
        background: transparent !important;
      }
      .group\\/section,
      .group\\/item,
      .group\\/edu {
        margin: 0 !important;
        padding-top: 0.25rem !important;
        padding-bottom: 0.25rem !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .kdp-page-break {
        page-break-before: always !important;
        break-before: page !important;
      }
      .kdp-no-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      h1, h2, h3, h4 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      p {
        orphans: 2 !important;
        widows: 2 !important;
      }
    `;
    clonedDoc.head.appendChild(styleEl);
  } catch {
    // Fallback
  }

  // 2. Hide all interactive editing UI, reorder toolbars, buttons, badges outside preview
  const hideSelectors = [
    '.print\\:hidden',
    '[class*="print:hidden"]',
    '[role="dialog"]',
    '.canva-toolbar',
    '[title*="Déplacer"]',
    '[title*="Monter"]',
    '[title*="Descendre"]',
    '[title*="Masquer"]'
  ];

  hideSelectors.forEach((selector) => {
    try {
      clonedDoc.querySelectorAll(selector).forEach((el) => {
        (el as HTMLElement).style.display = 'none';
        (el as HTMLElement).style.visibility = 'hidden';
      });
    } catch {
      // Ignore
    }
  });

  // 3. Strip contenteditable and editing outlines
  clonedDoc.querySelectorAll('[contenteditable]').forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.removeAttribute('contenteditable');
    htmlEl.style.outline = 'none';
    htmlEl.style.border = 'none';
    htmlEl.style.background = 'transparent';
  });

  // 4. Reset section wrapper margins/paddings added for interactive hover states
  clonedDoc.querySelectorAll('.group\\/section, .group\\/item, .group\\/edu').forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.margin = '0';
    htmlEl.style.border = 'none';
    htmlEl.style.boxShadow = 'none';
    htmlEl.style.background = 'transparent';
  });

  // 5. Sanitize document styles (OKLCH, OKLAB, color-mix)
  sanitizeDocumentStyles(clonedDoc);

  // 6. Direct RGB/RGBA computed color application restricted strictly to preview DOM trees
  const elementId = targetId || (document.getElementById('cv-preview') ? 'cv-preview' : (document.getElementById('letter-preview') ? 'letter-preview' : (document.getElementById('kdp-printable-manuscript') ? 'kdp-printable-manuscript' : '')));
  const liveTarget = elementId ? document.getElementById(elementId) : null;
  const clonedTarget = elementId ? clonedDoc.getElementById(elementId) : null;

  if (liveTarget && clonedTarget) {
    const liveElements = [liveTarget, ...Array.from(liveTarget.querySelectorAll('*'))];
    const clonedElements = [clonedTarget, ...Array.from(clonedTarget.querySelectorAll('*'))];

    const limit = Math.min(liveElements.length, clonedElements.length);
    for (let i = 0; i < limit; i++) {
      const orig = liveElements[i] as HTMLElement;
      const clone = clonedElements[i] as HTMLElement;

      if (!orig || !clone || !clone.style) continue;

      try {
        const computed = window.getComputedStyle(orig);

        if (computed.color) {
          clone.style.color = replaceUnsupportedColorsInString(computed.color);
        }
        if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)' && computed.backgroundColor !== 'transparent') {
          clone.style.backgroundColor = replaceUnsupportedColorsInString(computed.backgroundColor);
        }
        if (computed.borderColor && computed.borderColor !== 'rgba(0, 0, 0, 0)' && computed.borderColor !== 'transparent') {
          clone.style.borderColor = replaceUnsupportedColorsInString(computed.borderColor);
        }
      } catch {
        // Continuation safety
      }
    }
  }
}

/**
 * Downloads an HTML element as a PDF file directly.
 * Falls back seamlessly to native window.print() if needed.
 */
export async function downloadElementAsPDF(elementId: string, fileName: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`L'élément #${elementId} est introuvable pour l'export PDF.`);
  }

  // 1. Sanitize style tags & inline oklch/oklab colors first
  sanitizeDocumentStyles(document);

  try {
    // Export garanti 1 seule page A4 pour les CV et Lettres de motivation
    if (elementId === 'cv-preview' || elementId === 'letter-preview' || element.getAttribute('data-single-page') === 'true') {
      // Convert unsupported CSS color functions (oklch, oklab, color-mix) to standard RGB/RGBA on live element before canvas capture
      const allElements = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
      const styleRestorers: Array<{ el: HTMLElement; color: string; bg: string; border: string }> = [];

      allElements.forEach((el) => {
        if (!el.style) return;
        try {
          const computed = window.getComputedStyle(el);
          const origColor = el.style.color;
          const origBg = el.style.backgroundColor;
          const origBorder = el.style.borderColor;

          let modified = false;

          if (computed.color && (computed.color.includes('oklch') || computed.color.includes('color-mix') || computed.color.includes('oklab') || computed.color.includes('lab'))) {
            el.style.color = replaceUnsupportedColorsInString(computed.color);
            modified = true;
          }
          if (computed.backgroundColor && (computed.backgroundColor.includes('oklch') || computed.backgroundColor.includes('color-mix') || computed.backgroundColor.includes('oklab') || computed.backgroundColor.includes('lab'))) {
            el.style.backgroundColor = replaceUnsupportedColorsInString(computed.backgroundColor);
            modified = true;
          }
          if (computed.borderColor && (computed.borderColor.includes('oklch') || computed.borderColor.includes('color-mix') || computed.borderColor.includes('oklab') || computed.borderColor.includes('lab'))) {
            el.style.borderColor = replaceUnsupportedColorsInString(computed.borderColor);
            modified = true;
          }

          if (modified) {
            styleRestorers.push({ el, color: origColor, bg: origBg, border: origBorder });
          }
        } catch {
          // Ignore style extraction errors
        }
      });

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0
      });

      // Restore original inline styles
      styleRestorers.forEach(({ el, color, bg, border }) => {
        el.style.color = color;
        el.style.backgroundColor = bg;
        el.style.borderColor = border;
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = 210;
      const pdfHeight = 297;

      const canvasRatio = canvas.height / canvas.width;
      let renderWidth = pdfWidth;
      let renderHeight = (canvas.height * pdfWidth) / canvas.width;

      if (renderHeight > pdfHeight) {
        renderHeight = pdfHeight;
        renderWidth = pdfHeight / canvasRatio;
      }

      const xOffset = (pdfWidth - renderWidth) / 2;

      pdf.addImage(imgData, 'JPEG', xOffset, 0, renderWidth, renderHeight);
      pdf.save(fileName);
      return true;
    }

    const opt = {
      margin: [6, 6, 6, 6],
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        letterRendering: true,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        before: ['.page-break', '.page-break-before', '.page-break-always'],
        after: ['.page-break-after'],
        avoid: [
          'section',
          'article',
          '.experience-item',
          '.education-item',
          '.cv-block',
          '.cv-section',
          '.group\\/item',
          '.group\\/edu',
          '.group\\/section',
          'h1',
          'h2',
          'h3',
          'tr',
          'li',
          'blockquote'
        ]
      }
    };

    await (html2pdf as any)().set(opt).from(element).save();
    return true;
  } catch (err) {
    console.warn('Erreur html2pdf, basculement vers impression système :', err);
    window.print();
    return false;
  }
}

