/**
 * TSE XT - Confere as imagens da loja contra as exigências da Chrome Web Store
 *
 * Uso: node tools/loja/verificar-assets.mjs
 *
 * Capturas: 1280x800, PNG RGB 24 bits sem alfa (colorType 2), no máximo 5.
 * Blocos promocionais: 440x280 e 1400x560, mesmo formato.
 * Ícone da loja: icons/icon-128.png, 128x128.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const CAPTURAS = [
  'docs/tela-exemplo.png',
  'docs/tela-auditoria-horas-perdidas.png',
  'docs/tela-gestao-he.png',
  'docs/tela-reembolso-farmaceutico.png',
  'docs/tela-exemplo-off.png',
];
const ESPERADO = [
  ...CAPTURAS.map((f) => [f, 1280, 800, true]),
  ['docs/promo-pequeno-440x280.png', 440, 280, true],
  ['docs/promo-letreiro-1400x560.png', 1400, 560, true],
  ['icons/icon-128.png', 128, 128, false],
];

let erros = 0;
for (const [arq, w, h, semAlfa] of ESPERADO) {
  const p = path.join(RAIZ, arq);
  if (!fs.existsSync(p)) { console.log(`✘ ${arq}: não existe`); erros++; continue; }
  const b = fs.readFileSync(p);
  const [lw, lh, bits, tipo] = [b.readUInt32BE(16), b.readUInt32BE(20), b[24], b[25]];
  const probs = [];
  if (b.toString('ascii', 1, 4) !== 'PNG') probs.push('não é PNG');
  if (lw !== w || lh !== h) probs.push(`tamanho ${lw}x${lh}, esperado ${w}x${h}`);
  if (semAlfa && (bits !== 8 || tipo !== 2)) probs.push(`precisa ser RGB 24 bits sem alfa (bitDepth ${bits}, colorType ${tipo})`);
  const kb = Math.round(b.length / 1024);
  console.log(`${probs.length ? '✘' : '✔'} ${arq}  ${lw}x${lh}  colorType ${tipo}  ${kb} KB${probs.length ? '  → ' + probs.join('; ') : ''}`);
  erros += probs.length;
}
process.exit(erros ? 1 : 0);
