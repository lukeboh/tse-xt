/**
 * TSE XT - Captura de tela para a Chrome Web Store (1280x800, PNG RGB sem alfa)
 *
 * Uso:
 *   node tools/loja/capturar.mjs --aba <id|trecho-da-url> --saida docs/tela-x.png [opções]
 *
 * Opções:
 *   --acao <nome>     prepara a tela antes da captura:
 *                       auditoria  abre a Auditoria de Horas Perdidas (FAB) e espera terminar
 *                       paleta     abre o Ctrl+K e digita "horas"
 *                       drawer     abre o Menu de Serviços (Alt+M)
 *   --desfocar-valores  desfoca as colunas "VALOR ..." da tabela de servidores
 *                       (Gestão de Serviço Extraordinário: valores individuais em R$)
 *   --rolar <px>      rola a página antes da captura
 *
 * A página é anonimizada visualmente (ver anonimizar.mjs) e a captura é
 * ABORTADA se sobrar algum termo pessoal no texto visível. A anonimização só
 * muda o que se vê: recarregar a aba (F5) volta ao normal.
 */
import fs from 'node:fs';
import { acharAba, conectar, sleep } from './cdp.mjs';
import { carregarTermos, scriptAnonimizar } from './anonimizar.mjs';

const args = process.argv.slice(2);
const opt = (nome) => { const i = args.indexOf(`--${nome}`); return i >= 0 ? args[i + 1] : undefined; };
const flag = (nome) => args.includes(`--${nome}`);

const alvo = opt('aba');
const saida = opt('saida');
if (!alvo || !saida) {
  console.error('Uso: node tools/loja/capturar.mjs --aba <id|trecho-da-url> --saida <arquivo.png> [--acao auditoria|paleta|drawer] [--desfocar-valores] [--rolar px]');
  process.exit(1);
}

const ACOES = {
  async auditoria(cdp) {
    await cdp.avaliar(`document.querySelector('#je-fab-audit').click()`);
    // Abre com o último resultado e dispara a atualização incremental; espera acabar.
    for (let i = 0; i < 600; i++) {
      await sleep(2000);
      const estado = await cdp.avaliar(`(() => {
        const m = document.querySelector('.je-audit-modal.active');
        return m ? m.innerText : '';
      })()`);
      if (!estado) throw new Error('Modal da Auditoria não abriu (a aba está no Espelho de Ponto com o XT ligado?).');
      if (/Nenhuma auditoria salva/i.test(estado)) {
        throw new Error('Não há auditoria salva: rode um "Full Update" na própria Auditoria e repita a captura quando terminar.');
      }
      if (!/Consultando|Cancelar/.test(estado)) return;
    }
    throw new Error('Auditoria não terminou em 20 minutos.');
  },
  async paleta(cdp) {
    await cdp.avaliar(`(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
      await new Promise((r) => setTimeout(r, 600));
      const i = document.querySelector('.je-modal-input');
      i.value = 'horas';
      i.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
  },
  async drawer(cdp) {
    await cdp.avaliar(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', code: 'KeyM', altKey: true, bubbles: true }))`);
  },
};

const aba = await acharAba(alvo);
const cdp = await conectar(aba);
try {
  await cdp.send('Page.bringToFront');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await cdp.avaliar(`(() => {
    if (document.getElementById('xt-loja-css')) return;
    const s = document.createElement('style');
    s.id = 'xt-loja-css';
    s.textContent = 'html, body { scrollbar-width: none !important; }';
    document.head.appendChild(s);
  })()`);
  await sleep(1500);

  const acao = opt('acao');
  if (acao) {
    if (!ACOES[acao]) throw new Error(`Ação desconhecida: ${acao}`);
    await ACOES[acao](cdp);
    await sleep(900);
  }
  if (flag('desfocar-valores')) {
    // Regra de CSS em vez de style inline: o TSE XT re-renderiza a tabela
    // depois de montar e descartaria o style das células.
    const n = await cdp.avaliar(`(() => {
      const tb = document.getElementById('tbServidoresAutorizados');
      if (!tb || !tb.rows.length) return 0;
      const cols = [...tb.rows[0].cells].map((c, i) => (/VALOR/i.test(c.textContent) ? i + 1 : 0)).filter(Boolean);
      const linhas = tb.rows[0].parentNode.nodeName === 'THEAD' ? 'tbody tr' : 'tr:not(:first-child)';
      const s = document.createElement('style');
      s.textContent = cols.map((i) => '#tbServidoresAutorizados ' + linhas + ' > td:nth-child(' + i + ')').join(',') + ' { filter: blur(5px) !important; }';
      document.head.appendChild(s);
      return cols.length;
    })()`);
    if (!n) throw new Error('--desfocar-valores: tabela #tbServidoresAutorizados ou colunas VALOR não encontradas.');
  }
  if (opt('rolar')) await cdp.avaliar(`window.scrollTo(0, ${Number(opt('rolar'))})`);

  const anon = await cdp.avaliar(scriptAnonimizar(carregarTermos()));
  if (anon.sobras.length) throw new Error(`Dados pessoais ainda visíveis, captura abortada: ${anon.sobras.join(', ')}`);
  await sleep(700);

  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(saida, Buffer.from(data, 'base64'));
  console.log(`✔ ${saida} (${anon.trocas} trechos anonimizados)`);
} finally {
  await cdp.send('Emulation.clearDeviceMetricsOverride').catch(() => {});
  cdp.fechar();
}
