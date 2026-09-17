/**
 * TSE XT - Excedente sem pecúnia por servidor, para o painel de KPI da
 * Gestão de Serviço Extraordinário (heGestaoKpi.js)
 *
 * A tela HoraExtraGestao_visaoChefes.action só tem os TOTAIS do mês por
 * servidor (Horas Autorizadas/Realizadas) — não tem o detalhe diário
 * (TOTAL/PECÚNIA/EXCED.) que o cálculo de "quanto poderia virar pecúnia se
 * houvesse autorização" precisa (o mesmo que já existe no KPI 4 do Espelho
 * de Ponto, ver pecBlock em domModernizer.js e computeDailyDelta em
 * balanceCalc.js).
 *
 * Esse detalhe diário SÓ existe no Espelho de Ponto de cada servidor — mas
 * o chefe consegue pedir o Espelho de QUALQUER servidor da sua unidade
 * passando a matrícula dele em servidorSelecionado.matricula na mesma
 * action que a tela de Espelho já usa (EspelhoPontoMesAction_recuperar) —
 * confirmado ao vivo: bate exatamente com os dados reais do servidor
 * consultado, não os do chefe logado. Este módulo busca isso em segundo
 * plano, um servidor de cada vez (com uma pequena pausa entre pedidos, pra
 * não sobrecarregar o portal), reaproveitando a MESMA conta
 * (computeDailyDelta) já validada no Espelho — nenhuma lógica de excedente
 * nova, só uma fonte de dados diferente (HTML buscado, não a página atual).
 */

window.JEPessoasHeGestaoExcedente = (function () {
  'use strict';

  const STORAGE_PREFIX = 'je_xt_he_gestao_excedente_v1_';
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — mesmo horizonte do heAuthFetch pro mês aberto
  const REQUEST_GAP_MS = 120; // pausa entre servidores, pra não martelar o portal

  function storageKey(matricula, monthKey) {
    return STORAGE_PREFIX + matricula + '_' + monthKey;
  }

  function toMin(str) {
    const m = String(str || '').replace(/\s/g, '').match(/(\d{1,3}):(\d{2})/);
    return m ? (parseInt(m[1], 10) || 0) * 60 + (parseInt(m[2], 10) || 0) : 0;
  }

  // Mesma classificação de ocorrência/dispensa do dia usada em
  // kpiExtractor.js (extractKPIs) — mantida aqui em separado porque essa
  // função opera sobre um DOM PARSEADO de outra página (fetch + DOMParser),
  // não o document ao vivo, e o kpiExtractor não expõe essa parte isolada.
  function classifyOccurrence(occText) {
    return {
      isHolidayOrRecess: occText.includes('FERIADO') || occText.includes('RECESSO') || occText.includes('FACULTATIVO'),
      isLicense: occText.includes('LICENÇA') || occText.includes('LICENCA') || occText.includes('MÉDICA') || occText.includes('MEDICA') || occText.includes('LUTO') || occText.includes('NOJO') || occText.includes('GALA') || occText.includes('MATERNIDADE') || occText.includes('PATERNIDADE') || occText.includes('CAPACITAÇÃO') || occText.includes('CAPACITACAO') || occText.includes('PRÊMIO') || occText.includes('PREMIO'),
      isVacation: occText.includes('FÉRIAS') || occText.includes('FERIAS'),
      isTravel: occText.includes('VIAGEM') || occText.includes('MISSÃO') || occText.includes('MISSAO') || (occText.includes('SERVIÇO') && !occText.includes('TEMPO DE'))
    };
  }

  /**
   * Varre um <table id="tblEspelhoPontoMesCorrente"> (ao vivo ou parseado de
   * HTML buscado) e soma, por bucket (Sábado/Dia Útil vs Domingo/Feriado), o
   * netExcedenteMin de cada dia via computeDailyDelta — a MESMA fonte que
   * alimenta o "(+HH:MM)" do Espelho de Ponto.
   * @returns {{sabMin:number, domMin:number}}
   */
  function computeExcedenteFromTable(table) {
    const out = { sabMin: 0, domMin: 0 };
    if (!table || !window.JEPessoasBalance) return out;

    const isClosedMonth = Array.from(table.querySelectorAll('th')).some((th) => (th.textContent || '').toUpperCase().includes('AJUST'));
    const todayObj = new Date();
    const todayStart = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());

    Array.from(table.querySelectorAll('tr')).forEach((tr) => {
      const dateCell = tr.querySelector('.h01');
      if (!dateCell) return;
      const dateText = (dateCell.textContent || '').trim();
      const m = dateText.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) return;

      const dayNum = parseInt(m[1], 10);
      const monthNum = parseInt(m[2], 10);
      const yearNum = parseInt(m[3], 10);
      const dateObj = new Date(yearNum, monthNum - 1, dayNum);
      const dayOfWeek = dateObj.getDay();
      const isFuture = dateObj > todayStart;
      if (isFuture) return;
      const isToday = dateObj.getTime() === todayStart.getTime();

      const e2 = (tr.querySelector('.h04')?.textContent || '').trim();
      const e3 = (tr.querySelector('.h06')?.textContent || '').trim();
      const abono = (tr.querySelector('.h08')?.textContent || '').trim();
      const totalDay = (tr.querySelector('.h09')?.textContent || '').trim();
      const exceedDay = (tr.querySelector('.h10')?.textContent || '').trim();
      const pecuniaCell = tr.querySelector('.h12') || tr.querySelector('.h11');
      const pecunia = (pecuniaCell?.textContent || '').trim();
      const occurrence = (tr.querySelector('.h16')?.textContent || '').trim();

      const totalMin = toMin(totalDay);
      const exceedMin = toMin(exceedDay);
      const pecuniaMin = toMin(pecunia);
      const abonoMin = toMin(abono);

      const occText = (occurrence + ' ' + (tr.textContent || '')).toUpperCase();
      const { isHolidayOrRecess, isLicense, isVacation, isTravel } = classifyOccurrence(occText);

      const dayTargetMinutes = (window.JEPessoasLegal && window.JEPessoasLegal.dailyTargetMinutes)
        ? window.JEPessoasLegal.dailyTargetMinutes({ e2, e3, year: yearNum, month: monthNum })
        : 420;

      const isDispensed = isLicense || isVacation || isTravel || (abonoMin >= dayTargetMinutes);

      const { bucket, netExcedenteMin } = window.JEPessoasBalance.computeDailyDelta({
        dayOfWeek,
        isClosedMonth,
        isHolidayOrRecess,
        isDispensed,
        totalMin,
        exceedMin,
        pecuniaMin,
        dayTargetMinutes,
        projectFromTotal: isToday && !isClosedMonth
      });

      if (bucket === 'sunday') out.domMin += netExcedenteMin || 0;
      else out.sabMin += netExcedenteMin || 0;
    });

    return out;
  }

  async function fetchServidorExcedente(matricula, mes, ano) {
    const url = '/portalservidor2/EspelhoPontoMesAction_recuperar.action?servidorSelecionado.matricula='
      + encodeURIComponent(matricula) + '&mesSelecionado=' + mes + '&anoSelecionado=' + ano;
    const r = await fetch(url, { credentials: 'include' });
    if (/Login_|encerrarSessao/i.test(r.url)) return { loggedOut: true };
    const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
    const table = doc.getElementById('tblEspelhoPontoMesCorrente');
    if (!table) return { sabMin: 0, domMin: 0 };
    return computeExcedenteFromTable(table);
  }

  function readCache(matricula, monthKey) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get({ [storageKey(matricula, monthKey)]: null }, (items) => {
          const entry = items && items[storageKey(matricula, monthKey)];
          if (entry && (Date.now() - (entry.fetchedAt || 0)) < CACHE_TTL_MS) resolve(entry);
          else resolve(null);
        });
      } catch (e) { resolve(null); }
    });
  }

  function writeCache(matricula, monthKey, result) {
    try {
      const entry = Object.assign({ fetchedAt: Date.now() }, result);
      chrome.storage.local.set({ [storageKey(matricula, monthKey)]: entry });
    } catch (e) { /* silencioso — pior caso, refaz a busca na próxima vez */ }
  }

  /**
   * Busca o excedente de cada servidor da lista, um de cada vez (cache
   * primeiro), chamando onResolved(matricula, {sabMin, domMin}) assim que
   * cada um resolve — progressivo, não espera todo mundo terminar pra
   * atualizar a tela. Para de vez se a sessão cair no meio (evita martelar
   * o portal com requisições que só vão redirecionar pro login).
   */
  async function fetchAll(servidores, mes, ano, onResolved) {
    if (!Array.isArray(servidores) || !servidores.length) return;
    const monthKey = ano + '-' + String(mes).padStart(2, '0');

    for (const s of servidores) {
      if (!s || !s.matricula) continue;
      try {
        const cached = await readCache(s.matricula, monthKey);
        if (cached) {
          onResolved(s.matricula, cached);
          continue;
        }
        const result = await fetchServidorExcedente(s.matricula, mes, ano);
        if (result.loggedOut) break;
        writeCache(s.matricula, monthKey, result);
        onResolved(s.matricula, result);
      } catch (e) { /* ignora este servidor, segue pros demais */ }
      await new Promise((resolve) => setTimeout(resolve, REQUEST_GAP_MS));
    }
  }

  return {
    fetchAll,
    fetchServidorExcedente,
    computeExcedenteFromTable,
    classifyOccurrence
  };
})();
