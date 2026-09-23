/**
 * TSE XT - Recarrega a extensão sem compactação no Chrome de depuração
 *
 * Uso: node tools/loja/recarregar-extensao.mjs
 *
 * Clica no botão "recarregar" do card TSE XT em chrome://extensions (abre a
 * página se ela não estiver aberta). O background.js recarrega em seguida
 * todas as abas do TSE (onInstalled) — e recarregar o Espelho de Ponto
 * DERRUBA a sessão do portal. Por isso o script se recusa a rodar enquanto
 * houver aba no Espelho: leve-as antes para outra tela pelo menu.
 */
import { CDP_HOST, conectar, listarAbas, sleep } from './cdp.mjs';

const abas = await listarAbas();
const noEspelho = abas.filter((t) => /EspelhoPonto/i.test(t.url));
if (noEspelho.length) {
  console.error('✘ Há aba(s) no Espelho de Ponto — navegue para outra tela pelo menu antes (recarregar o Espelho derruba a sessão):');
  noEspelho.forEach((t) => console.error(`  ${t.id}  ${t.url}`));
  process.exit(1);
}

let aba = abas.find((t) => t.url.startsWith('chrome://extensions'));
if (!aba) aba = await (await fetch(`${CDP_HOST}/json/new?chrome://extensions/`, { method: 'PUT' })).json();
const cdp = await conectar(aba);
try {
  await sleep(1000);
  const ok = await cdp.avaliar(`(() => {
    const itens = document.querySelector('extensions-manager').shadowRoot
      .querySelector('extensions-item-list').shadowRoot.querySelectorAll('extensions-item');
    for (const item of itens) {
      if (item.shadowRoot.querySelector('#name')?.textContent.trim() === 'TSE XT') {
        item.shadowRoot.querySelector('#dev-reload-button').click();
        return true;
      }
    }
    return false;
  })()`);
  if (!ok) throw new Error('Card "TSE XT" não encontrado em chrome://extensions (Modo do desenvolvedor ligado?).');
  console.log('✔ Extensão recarregada. As abas do TSE serão recarregadas pelo background.js.');
} finally {
  cdp.fechar();
}
