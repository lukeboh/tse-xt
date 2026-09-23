/**
 * TSE XT - Gera os blocos promocionais da Chrome Web Store a partir de promo.html
 *
 * Uso: node tools/loja/gerar-promos.mjs
 *
 * Abre uma aba temporária no Chrome de depuração (porta 9222), renderiza o
 * template no tamanho exato de cada bloco e salva em docs/:
 *   docs/promo-pequeno-440x280.png    (Small promo tile)
 *   docs/promo-letreiro-1400x560.png  (Marquee promo tile)
 * A versão exibida vem do manifest.json (major.minor). Rodar DEPOIS de
 * regerar as capturas, porque o letreiro recorta docs/tela-exemplo.png e
 * docs/tela-gestao-he.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CDP_HOST, conectar, sleep } from './cdp.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(DIR, '..', '..');
const { version } = JSON.parse(fs.readFileSync(path.join(RAIZ, 'manifest.json'), 'utf8'));
const versao = version.split('.').slice(0, 2).join('.');

const BLOCOS = [
  { tipo: 'pequeno', largura: 440, altura: 280, saida: 'docs/promo-pequeno-440x280.png' },
  { tipo: 'letreiro', largura: 1400, altura: 560, saida: 'docs/promo-letreiro-1400x560.png' },
];

const aba = await (await fetch(`${CDP_HOST}/json/new?about:blank`, { method: 'PUT' })).json();
const cdp = await conectar(aba);
try {
  for (const b of BLOCOS) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: b.largura, height: b.altura, deviceScaleFactor: 1, mobile: false });
    const url = `${pathToFileURL(path.join(DIR, 'promo.html')).href}?tipo=${b.tipo}&versao=${versao}`;
    await cdp.send('Page.navigate', { url });
    await sleep(1500);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(RAIZ, b.saida), Buffer.from(data, 'base64'));
    console.log(`✔ ${b.saida}`);
  }
} finally {
  cdp.fechar();
  await fetch(`${CDP_HOST}/json/close/${aba.id}`).catch(() => {});
}
