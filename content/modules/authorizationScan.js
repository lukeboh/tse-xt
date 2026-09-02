/**
 * TSE XT - Leitura estruturada do Espelho de Ponto (autorização de HE + rodapé)
 *
 * Fonte única de parsing do espelho, usada por:
 *   - R3 (detecção de "mês com HE autorizado" — Portaria 380/2026 art. 13)
 *   - R6 (dias com excedente sem autorização vinculada)
 *   - Auditoria de Horas Perdidas (varredura mês a mês via fetch)
 *
 * Funciona tanto sobre o `document` da página aberta quanto sobre um
 * `Document` produzido por `DOMParser` a partir de um fetch.
 */

window.JEPessoasAuthScan = (function () {
  'use strict';

  function parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const clean = timeStr
      .replace(/[ \s]/g, '')
      .replace(/[−–—‐―]/g, '-')
      .trim();
    if (!clean || clean === '--:--' || clean === '-') return 0;
    const isNegative = clean.startsWith('-');
    const digitsOnly = clean.replace(/[^0-9:]/g, '');
    const parts = digitsOnly.split(':');
    if (parts.length < 2) return 0;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const total = h * 60 + m;
    return isNegative ? -total : total;
  }

  function normWs(s) {
    return (s || '').toUpperCase().replace(/\s+/g, ' ').trim();
  }

  const HOLIDAY_RE = /FERIADO|RECESSO|FACULTATIVO/;
  const LICENSE_RE = /LICEN[ÇC]A|M[ÉE]DICA|LUTO|NOJO|GALA|MATERNIDADE|PATERNIDADE|CAPACITA[ÇC][ÃA]O|PR[ÊE]MIO/;
  const VACATION_RE = /F[ÉE]RIAS/;
  const TRAVEL_RE = /VIAGEM|MISS[ÃA]O/;
  const HYBRID_RE = /TRABALHO H[IÍ]BRIDO|TELETRABALHO/;

  function rowHasAuthorization(tr) {
    if (!tr) return false;
    // Sinal forte: ícone de relógio nativo com onclick detalharAutorizacao(...)
    // — aparece exatamente nos dias com autorização de serviço extraordinário.
    if (tr.querySelector('[onclick*="detalharAutorizacao"], a[href*="detalharAutorizacao"]')) return true;
    if (tr.querySelector('img[src*="iconClock" i], img[title*="autoriza" i], .je-overtime-clock-btn')) return true;
    return /detalharAutorizacao|iconClock\d/i.test(tr.innerHTML || '');
  }

  /**
   * @param {Document|Element} root  documento da página ou tabela do espelho
   * @param {{year?:number, month?:number, targetDailyMinutes?:number}} [opts]
   */
  function analyzeEspelho(root, opts) {
    opts = opts || {};
    const target = opts.targetDailyMinutes || 420;

    const doc = root && root.querySelectorAll ? root : document;
    let table =
      (doc.getElementById && doc.getElementById('tblEspelhoPontoMesCorrente')) ||
      (doc.querySelector && doc.querySelector('#tblEspelhoPontoMesCorrente'));

    if (!table && doc.querySelectorAll) {
      // fallback: primeira tabela que tenha PECÚNIA + (HORAS EXCED. | HORAS AJUST.)
      const tables = Array.from(doc.querySelectorAll('table'));
      table = tables.find((t) => {
        const txt = normWs(t.innerText);
        return /PEC[UÚ]NIA/.test(txt) && /(HORAS EXCED|HORAS AJUST|HORA AJUST)/.test(txt);
      });
    }
    if (!table) return { found: false };

    // Mês fechado: a coluna h10 deixa de ser "Horas excedentes" e passa a
    // "Horas ajustadas". Em documento não renderizado o <br> de "Horas<br>Ajust."
    // some sem virar espaço, então testa o title do <th> e o texto sem espaços.
    const headerBlob = Array.from(table.querySelectorAll('th'))
      .map((th) => ((th.getAttribute('title') || '') + ' ' + (th.textContent || '')))
      .join(' ')
      .toUpperCase()
      .replace(/\s+/g, '');
    const closed = headerBlob.includes('AJUSTAD') || headerBlob.includes('HORASAJUST');
    const tableText = normWs(table.innerText || table.textContent);
    const hybrid = HYBRID_RE.test(tableText);

    const days = [];
    let authDayCount = 0;

    Array.from(table.querySelectorAll('tr')).forEach((tr) => {
      if (tr.querySelector('th')) return;
      const dateCell = tr.querySelector('td.h01');
      if (!dateCell) return;
      const dateText = dateCell.innerText.trim();
      const m = dateText.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) return;

      const dayNum = parseInt(m[1], 10);
      const monthNum = parseInt(m[2], 10);
      const yearNum = parseInt(m[3], 10);
      const dObj = new Date(yearNum, monthNum - 1, dayNum);
      const dow = dObj.getDay();

      const e1 = tr.querySelector('td.h02')?.innerText.trim() || '';
      const s1 = tr.querySelector('td.h03')?.innerText.trim() || '';
      const e2 = tr.querySelector('td.h04')?.innerText.trim() || '';
      const s2 = tr.querySelector('td.h05')?.innerText.trim() || '';
      // a célula de abono/liberação não traz classe .h08 no corpo — cai para a 8ª célula
      const abono = (tr.querySelector('td.h08') || tr.children[7])?.innerText.trim() || '';
      const totalDay = tr.querySelector('td.h09')?.innerText.trim() || '';
      const h10 = tr.querySelector('td.h10')?.innerText.trim() || '';
      const pecunia = (tr.querySelector('td.h12') || tr.querySelector('td.h11'))?.innerText.trim() || '';
      const occ = normWs(tr.querySelector('td.h16')?.innerText || '');
      const rowU = normWs(tr.innerText);
      const ctx = occ + ' ' + rowU;

      const isHoliday = HOLIDAY_RE.test(ctx);
      const isLicense = LICENSE_RE.test(ctx);
      const isVacation = VACATION_RE.test(ctx);
      const isTravel = TRAVEL_RE.test(ctx);
      const isHybridDay = HYBRID_RE.test(ctx);
      const abonoMin = parseTimeToMinutes(abono);

      const hasLunch = !!(e1 && s1 && e2 && s2);
      const targetMin = hasLunch ? 480 : target;
      const isDispensed = isLicense || isVacation || isTravel || isHybridDay || (abonoMin >= targetMin);

      const hasAuth = rowHasAuthorization(tr);
      if (hasAuth) authDayCount++;

      days.push({
        date: dateText,
        dow,
        isWeekend: dow === 0 || dow === 6,
        isSaturday: dow === 6,
        isSundayOrHoliday: dow === 0 || isHoliday,
        isHoliday,
        isHybridDay,
        isDispensed,
        hasAuth,
        totalMin: parseTimeToMinutes(totalDay),
        h10Min: parseTimeToMinutes(h10),
        pecuniaMin: parseTimeToMinutes(pecunia),
        abonoMin,
        targetMin
      });
    });

    // --- Rodapé normativo -----------------------------------------------------
    function footerRow(label) {
      const rows = Array.from(table.querySelectorAll('tr'));
      const tr = rows.find((r) => {
        const first = r.children[0];
        return first && normWs(first.innerText).startsWith(normWs(label));
      });
      if (!tr) return null;
      const nums = Array.from(tr.children)
        .slice(1)
        .map((td) => td.innerText.trim())
        .filter((t) => /^\d{1,3}:\d{2}$/.test(t));
      return nums;
    }
    function quad(nums) {
      nums = nums || [];
      return {
        uteis: parseTimeToMinutes(nums[0] || '00:00'),
        sab: parseTimeToMinutes(nums[1] || '00:00'),
        domfer: parseTimeToMinutes(nums[2] || '00:00'),
        total: parseTimeToMinutes(nums[3] || nums[0] || '00:00')
      };
    }

    const pecunia = quad(footerRow('Pecúnia:'));
    const homolog = quad(footerRow('Horas Excedentes Homologadas'));
    const naoHomolog = quad(footerRow('Horas Excedentes Não Homologadas'));
    const utilNums = footerRow('Horas Utilizadas do Banco');
    const residuoNums = footerRow('Resíduo de Horas');

    const heAuthorized = !hybrid && (authDayCount > 0 || pecunia.total > 0);

    return {
      found: true,
      year: opts.year || (days[0] ? parseInt(days[0].date.slice(6), 10) : null),
      month: opts.month || (days[0] ? parseInt(days[0].date.slice(3, 5), 10) : null),
      closed,
      hybrid,
      heAuthorized,
      authDayCount,
      footer: {
        pecunia,
        homolog,
        naoHomolog,
        utilBancoMin: parseTimeToMinutes((utilNums && utilNums[0]) || '00:00'),
        residuoMin: parseTimeToMinutes((residuoNums && residuoNums[0]) || '00:00')
      },
      days
    };
  }

  return { analyzeEspelho, parseTimeToMinutes, rowHasAuthorization };
})();
