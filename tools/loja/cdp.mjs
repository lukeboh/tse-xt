/**
 * TSE XT - Mini cliente do Chrome DevTools Protocol (porta 9222)
 *
 * Sem dependências: usa o WebSocket global do Node >= 22. Pensado para o
 * Chrome aberto por iniciar_chrome_debug.ps1 (perfil de depuração com a
 * extensão carregada sem compactação).
 *
 * ⚠️ Nunca usar Page.navigate / location.reload no Espelho de Ponto: o portal
 * derruba a sessão. Para trocar de tela, clicar num <a> real do menu
 * (ver clicarMenu()).
 */

export const CDP_HOST = process.env.CDP_HOST || 'http://127.0.0.1:9222';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function listarAbas() {
  const res = await fetch(`${CDP_HOST}/json/list`);
  return (await res.json()).filter((t) => t.type === 'page');
}

/** Acha a aba por id exato ou por trecho da URL (a primeira que casar). */
export async function acharAba(idOuTrecho) {
  const abas = await listarAbas();
  const aba = abas.find((t) => t.id === idOuTrecho) || abas.find((t) => t.url.includes(idOuTrecho));
  if (!aba) {
    const lista = abas.map((t) => `  ${t.id}  ${t.url}`).join('\n');
    throw new Error(`Nenhuma aba casa com "${idOuTrecho}". Abas abertas:\n${lista}`);
  }
  return aba;
}

export async function conectar(aba) {
  const ws = new WebSocket(aba.webSocketDebuggerUrl || `ws://127.0.0.1:9222/devtools/page/${aba.id}`);
  await new Promise((ok, erro) => { ws.onopen = ok; ws.onerror = erro; });
  let seq = 0;
  const pendentes = new Map();
  const ouvintes = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pendentes.has(msg.id)) {
      pendentes.get(msg.id)(msg);
      pendentes.delete(msg.id);
    } else if (msg.method) {
      ouvintes.forEach((fn) => fn(msg));
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pendentes.set(id, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
  const avaliar = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  // confirm()/alert() da página travam o Runtime.evaluate: aceita sozinho.
  await send('Page.enable');
  ouvintes.push((msg) => {
    if (msg.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
  });
  return { send, avaliar, fechar: () => ws.close(), aba };
}

/** Navega clicando num link real do menu (preserva Referer/sessão). */
export async function clicarMenu(cdp, texto, esperaMs = 7000) {
  const href = await cdp.avaliar(`(() => {
    const a = [...document.querySelectorAll('a')].find((a) => a.textContent.trim() === ${JSON.stringify(texto)});
    if (!a) return null;
    a.click();
    return a.href;
  })()`);
  if (!href) throw new Error(`Link de menu "${texto}" não encontrado na página.`);
  await sleep(esperaMs);
  return href;
}
