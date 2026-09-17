/**
 * TSE XT - Painel de KPI por servidor da Gestão de Serviço Extraordinário
 *
 * A tela HoraExtraGestao_visaoChefes.action (visão do chefe) já tem uma
 * tabela nativa #tbServidoresAutorizados com 1 linha por servidor × tipo de
 * autorização (Dia Útil/Sábado, Domingo/Feriado) — "Horas Autorizadas" é um
 * <input name="listaHorasAprovadas"> editável (o teto que o chefe concedeu
 * pra aquele tipo) e "Horas Realizadas" é o quanto o servidor já cumpriu.
 * Este módulo agrega essas linhas por matrícula e monta um painel visual
 * (nome + 2 barras de progresso empilhadas) ao lado do filtro de
 * Unidade/Mês — "100%" de cada barra é o autorizado daquele servidor
 * específico, não um teto global do sistema.
 */

window.JEPessoasHeGestaoKpi = (function () {
  'use strict';

  function toMin(str) {
    const m = String(str || '').replace(/\s/g, '').match(/(\d{1,3}):(\d{2})/);
    return m ? (parseInt(m[1], 10) || 0) * 60 + (parseInt(m[2], 10) || 0) : 0;
  }

  function fmtMin(min) {
    const total = Math.max(0, Math.round(min || 0));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function escapeHTML(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Lê #tbServidoresAutorizados e agrega por matrícula: 1 linha nativa por
  // (servidor, tipo) vira { sab: {autMin, realMin}, dom: {autMin, realMin} }.
  function extractServidores(table) {
    if (!table) return [];
    const byMatricula = new Map();
    Array.from(table.rows).slice(1).forEach((tr) => {
      const cells = tr.cells;
      if (!cells || cells.length < 7) return;
      const matricula = (cells[0].textContent || '').trim();
      if (!matricula) return;
      const nome = (cells[1].textContent || '').trim();
      const tipo = (cells[4].textContent || '').trim();
      const authInput = tr.querySelector('input[name="listaHorasAprovadas"]');
      const autMin = authInput ? toMin(authInput.value) : 0;
      const realMin = toMin(cells[6].textContent);

      if (!byMatricula.has(matricula)) {
        byMatricula.set(matricula, {
          matricula,
          nome,
          sab: { autMin: 0, realMin: 0 },
          dom: { autMin: 0, realMin: 0 }
        });
      }
      const entry = byMatricula.get(matricula);
      const bucket = /domingo|feriado/i.test(tipo) ? entry.dom : entry.sab;
      bucket.autMin += autMin;
      bucket.realMin += realMin;
    });
    return Array.from(byMatricula.values());
  }

  // 4.1: nome de exibição = primeiro nome; entre homônimos (mesmo primeiro
  // nome, ignorando maiúsculas/acentos), acrescenta a inicial do primeiro
  // sobrenome que distinguir — e só escala pro sobrenome por extenso (ou
  // mais palavras) se a inicial sozinha ainda deixar empate.
  function normalizeKey(str) {
    return String(str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function buildDisplayNames(servidores) {
    const nameParts = servidores.map((s) => (s.nome || '').trim().split(/\s+/).filter(Boolean));
    const firstNames = nameParts.map((p) => p[0] || '(sem nome)');
    const display = new Array(servidores.length);

    const groups = new Map();
    firstNames.forEach((fn, i) => {
      const key = normalizeKey(fn);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(i);
    });

    groups.forEach((idxs) => {
      if (idxs.length === 1) {
        display[idxs[0]] = firstNames[idxs[0]];
        return;
      }

      // Estado por candidato do grupo: quantas palavras do sobrenome usar e
      // se a última delas aparece só como inicial ou por extenso. Começa no
      // mínimo (1 palavra, só inicial) e só cresce pra quem ainda colidir.
      const wordCount = idxs.map(() => 1);
      const initialOnly = idxs.map(() => true);

      function candidateFor(pos) {
        const idx = idxs[pos];
        const surname = nameParts[idx].slice(1, 1 + wordCount[pos]);
        if (!surname.length) return firstNames[idx];
        const last = surname[surname.length - 1];
        const lastRendered = initialOnly[pos] ? (last[0] || '').toUpperCase() + '.' : last;
        const prefix = surname.slice(0, -1).join(' ');
        return firstNames[idx] + ' ' + (prefix ? prefix + ' ' : '') + lastRendered;
      }

      const maxRounds = 6;
      for (let round = 0; round < maxRounds; round++) {
        const candidates = idxs.map((_, pos) => candidateFor(pos));
        const counts = {};
        candidates.forEach((c) => { counts[normalizeKey(c)] = (counts[normalizeKey(c)] || 0) + 1; });
        const allUnique = candidates.every((c) => counts[normalizeKey(c)] === 1);

        if (allUnique || round === maxRounds - 1) {
          idxs.forEach((idx, pos) => { display[idx] = candidates[pos]; });
          return;
        }

        idxs.forEach((_, pos) => {
          if (counts[normalizeKey(candidates[pos])] > 1) {
            // 1º esgota o sobrenome atual por extenso antes de puxar mais
            // uma palavra — evita já ir de "C." direto pra "COSTA SILVA".
            if (initialOnly[pos]) initialOnly[pos] = false;
            else wordCount[pos] += 1;
          }
        });
      }
    });

    return display;
  }

  // "#7c3aed" -> "124, 58, 237", pra usar em rgba(var(--x), alpha) — o glow
  // de destaque acompanha a cor de cada bloco (mesma técnica do KPI 4 do
  // Espelho de Ponto, ver hexToRgbTriplet em domModernizer.js).
  function hexToRgbTriplet(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return '124, 58, 237';
    return [1, 2, 3].map((i) => parseInt(m[i], 16)).join(', ');
  }

  // excedenteMin: quanto do excedente deste tipo de dia ainda poderia virar
  // pecúnia se houvesse autorização — undefined enquanto a busca em segundo
  // plano (heGestaoExcedenteFetch.js) não resolveu; 0/positivo depois de
  // resolvida. Mesmo texto, ícone e condição de destaque (só a partir de
  // 100% do autorizado) do KPI 4 do Espelho de Ponto — ver pecBlock()
  // em domModernizer.js — pedido explícito do usuário de manter "o mesmo
  // jeito, com a mesma formatação".
  function barBlock(label, color, gradient, autMin, realMin, excedenteMin, matricula, bucketKey) {
    const hasAuth = autMin > 0;
    const pct = hasAuth ? Math.min(100, Math.round((realMin / autMin) * 100)) : 0;
    const over = hasAuth && realMin > autMin;
    const atCap = hasAuth && pct >= 100;
    const hasExcedente = atCap && (excedenteMin || 0) > 0;
    const excedenteHint = hasExcedente
      ? `<span class="je-kpi-excedente-hint" title="Horas excedentes de ${label} que hoje entram no saldo do mês (banco de horas) porque a autorização atual não cobre todo o excedente trabalhado. Se a autorização for aumentada (ou registrada retroativamente), essas horas podem virar pecúnia em vez de saldo.">(+${fmtMin(excedenteMin)})<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>`
      : '';
    const alertGlow = hasExcedente;

    // Ordem é sempre REALIZADO (numerador, feito) barra AUTORIZADO
    // (denominador, teto) — "6:39 / 24:00". Espaço em volta da barra é
    // essencial: grudado ("6:39/24:00") lia como se o denominador viesse
    // antes do numerador num texto tão compacto.
    return `
      <div class="je-hegestao-bar-block" data-matricula="${escapeHTML(matricula)}" data-bucket="${bucketKey}" data-aut-min="${autMin}" data-real-min="${realMin}">
        <div class="je-hegestao-bar-label-row">
          <span class="je-hegestao-bar-label">${label}</span>
          <span class="je-hegestao-bar-fraction">${hasAuth
            ? `<strong style="color:${over ? 'var(--je-danger-text)' : '#0a2540'};">${fmtMin(realMin)}</strong><span class="je-hegestao-bar-denom"> / ${fmtMin(autMin)}</span>${excedenteHint}`
            : `<strong style="color:#94a3b8;">${fmtMin(realMin)}</strong><span class="je-hegestao-bar-denom"> · sem autorização</span>`}</span>
        </div>
        <div class="je-hegestao-bar-track${alertGlow ? ' je-hegestao-bar-track-alert' : ''}" title="${over ? 'Passou do autorizado' : ''}" style="${alertGlow ? `--je-pec-glow-rgb:${hexToRgbTriplet(color)};` : ''}">
          <div class="je-hegestao-bar-fill" style="width:${pct}%; background:${over ? 'linear-gradient(90deg, var(--je-danger-accent) 0%, var(--je-danger-text) 100%)' : gradient};"></div>
        </div>
      </div>
    `;
  }

  const SAB_GRADIENT = 'linear-gradient(90deg, #0a2540 0%, #0056b3 100%)';
  const DOM_GRADIENT = 'linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)';
  const SAB_COLOR = '#0a2540';
  const DOM_COLOR = '#7c3aed';

  function buildRowsHTML(servidores, displayNames) {
    return servidores.map((s, i) => `
      <div class="je-hegestao-servidor-row">
        <div class="je-hegestao-servidor-name" title="${escapeHTML(s.nome)} (${escapeHTML(s.matricula)})">${escapeHTML(displayNames[i])}</div>
        <div class="je-hegestao-servidor-bars">
          ${barBlock('Sábado', SAB_COLOR, SAB_GRADIENT, s.sab.autMin, s.sab.realMin, s.sab.excedenteMin, s.matricula, 'sab')}
          ${barBlock('Domingo', DOM_COLOR, DOM_GRADIENT, s.dom.autMin, s.dom.realMin, s.dom.excedenteMin, s.matricula, 'dom')}
        </div>
      </div>
    `).join('');
  }

  // Atualiza só o bloco (Sábado ou Domingo) de UM servidor, quando a busca em
  // segundo plano do excedente daquele mês resolve — sem re-renderizar o
  // painel inteiro (evita perder o estado de outros blocos já resolvidos).
  function updateExcedente(matricula, sabMin, domMin) {
    const panel = document.querySelector('.je-hegestao-panel');
    if (!panel) return;
    [['sab', sabMin, 'Sábado', SAB_COLOR, SAB_GRADIENT], ['dom', domMin, 'Domingo', DOM_COLOR, DOM_GRADIENT]].forEach(([bucketKey, excedenteMin, label, color, gradient]) => {
      const block = panel.querySelector(`.je-hegestao-bar-block[data-matricula="${cssEscape(matricula)}"][data-bucket="${bucketKey}"]`);
      if (!block) return;
      const autMin = parseInt(block.dataset.autMin, 10) || 0;
      const realMin = parseInt(block.dataset.realMin, 10) || 0;
      block.outerHTML = barBlock(label, color, gradient, autMin, realMin, excedenteMin, matricula, bucketKey);
    });
  }

  // CSS.escape não existe em todo mundo isolado de content script — fallback
  // simples (matrícula é só dígitos na prática, mas não custa ser seguro).
  function cssEscape(str) {
    return (window.CSS && CSS.escape) ? CSS.escape(str) : String(str).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function mount() {
    const filterTable = document.getElementById('tbFiltroUnidades');
    const dataTable = document.getElementById('tbServidoresAutorizados');
    if (!filterTable || !dataTable) return;

    mountSaldoChips(filterTable);

    if (document.querySelector('.je-hegestao-panel')) return; // idempotente

    const servidores = extractServidores(dataTable);

    const panel = document.createElement('div');
    panel.className = 'je-hegestao-panel';

    if (!servidores.length) {
      panel.innerHTML = `<div class="je-hegestao-empty">Nenhum servidor com autorização no período selecionado.</div>`;
    } else {
      const displayNames = buildDisplayNames(servidores);
      panel.innerHTML = `<div class="je-hegestao-panel-body">${buildRowsHTML(servidores, displayNames)}</div>`;
    }

    const row = document.createElement('div');
    row.className = 'je-hegestao-filter-row';
    filterTable.parentNode.insertBefore(row, filterTable);
    row.appendChild(filterTable);
    row.appendChild(panel);

    // Excedente que poderia virar pecúnia se houvesse autorização: esta
    // tela só tem os totais do mês (Horas Autorizadas/Realizadas), não o
    // detalhe diário (TOTAL/PECÚNIA/EXCED.) que o cálculo precisa — ver
    // heGestaoExcedenteFetch.js, que busca o Espelho de Ponto de CADA
    // servidor em segundo plano (mesma requisição que a tela de Espelho já
    // usa, só que com servidorSelecionado.matricula de outra pessoa — o
    // portal aceita porque quem pede é o chefe) e roda a MESMA conta
    // (computeDailyDelta) já usada no Espelho. Silencioso e não bloqueia o
    // resto da montagem — se falhar (ou a sessão cair no meio), os blocos
    // simplesmente ficam sem o "(+HH:MM)", sem quebrar nada.
    if (servidores.length && window.JEPessoasHeGestaoExcedente) {
      const periodo = readPeriodoAtual(filterTable);
      if (periodo) {
        window.JEPessoasHeGestaoExcedente.fetchAll(servidores, periodo.mes, periodo.ano, (matricula, result) => {
          updateExcedente(matricula, result.sabMin, result.domMin);
        });
      }
    }
  }

  // Lê o Mês/Ano selecionado no combo nativo (#tbFiltroUnidades, select
  // "mesAnoAtual", opções tipo "09/2026") — é o período que os totais de
  // Horas Autorizadas/Realizadas já exibidos se referem, então é o mesmo
  // período que a busca em segundo plano do Espelho de cada servidor precisa
  // consultar pra bater com o que está na tela.
  function readPeriodoAtual(filterTable) {
    const sel = filterTable.querySelector('select[name="mesAnoAtual"], select[name*="mesAno" i]');
    const value = sel ? sel.value : '';
    const m = /^(\d{1,2})\/(\d{4})$/.exec(value.trim());
    if (!m) return null;
    return { mes: parseInt(m[1], 10), ano: parseInt(m[2], 10) };
  }

  // Divide "Saldo Dias Úteis/Sábado: R$ 0,00" (rótulo + valor no mesmo <h4>
  // nativo, ver #tbFiltroUnidades) em rótulo pequeno + chip grande de
  // destaque. Chip com saldo diferente de zero ganha o mesmo glow
  // respirável (jeKpiGlowPulse, definido em espelho-ponto.css) dos cards de
  // KPI do Espelho de Ponto — chama atenção só quando há valor de verdade.
  const SALDO_RE = /^(.*?)\.?:\s*(R\$\s*-?[\d.,]+)\s*$/;

  function parseValorReais(valorStr) {
    const digits = (valorStr || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(digits) || 0;
  }

  function mountSaldoChips(filterTable) {
    if (filterTable.dataset.jeSaldoChipsMounted) return;

    const headings = Array.from(filterTable.querySelectorAll('td > h4, td > h3'))
      .filter((h) => SALDO_RE.test((h.textContent || '').replace(/\s+/g, ' ').trim()));
    if (!headings.length) return;
    filterTable.dataset.jeSaldoChipsMounted = 'true';
    filterTable.classList.add('je-hegestao-filtro');

    headings.forEach((h) => {
      const text = (h.textContent || '').replace(/\s+/g, ' ').trim();
      const m = text.match(SALDO_RE);
      if (!m) return;
      const label = m[1].trim();
      const valor = m[2].trim();
      const filled = parseValorReais(valor) !== 0;

      if (h.parentElement) h.parentElement.classList.add('je-hegestao-saldo-cell');

      const block = document.createElement('div');
      block.className = 'je-hegestao-saldo-block';
      block.innerHTML = `
        <span class="je-hegestao-saldo-label">${escapeHTML(label)}</span>
        <span class="je-hegestao-saldo-chip" data-filled="${filled}">${escapeHTML(valor)}</span>
      `;
      h.replaceWith(block);
    });
  }

  return {
    mount,
    extractServidores,
    buildDisplayNames,
    buildRowsHTML,
    readPeriodoAtual
  };
})();
