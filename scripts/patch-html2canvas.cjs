const fs = require('fs');
const path = require('path');

const filesToPatch = [
  path.join(__dirname, '..', 'node_modules', 'html2canvas', 'dist', 'html2canvas.js'),
  path.join(__dirname, '..', 'node_modules', 'html2canvas', 'dist', 'html2canvas.esm.js'),
  path.join(__dirname, '..', 'node_modules', 'html2canvas', 'dist', 'lib', 'css', 'types', 'color.js')
];

let totalPatched = 0;

for (const filePath of filesToPatch) {
  if (!fs.existsSync(filePath)) {
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace throw error with safe fallback
  const errorTarget = 'throw new Error("Attempting to parse an unsupported color function \\"" + value.name + "\\"");';
  const safeFallback = 'return (typeof COLORS !== "undefined" && COLORS.TRANSPARENT) || (typeof exports !== "undefined" && exports.COLORS && exports.COLORS.TRANSPARENT) || 0;';

  if (content.includes(errorTarget)) {
    content = content.replaceAll(errorTarget, safeFallback);
    fs.writeFileSync(filePath, content, 'utf8');
    totalPatched++;
    console.log(`[patch-html2canvas] Successfully patched ${filePath}`);
  } else {
    console.log(`[patch-html2canvas] Target not found in ${filePath} (may already be patched)`);
  }
}

console.log(`[patch-html2canvas] Total files patched: ${totalPatched}`);
