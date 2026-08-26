/**
 * JE Pessoas XT - Extrator e Calculador de KPIs do Espelho de Ponto (v0.1.14)
 */

window.JEPessoasKPI = (function () {
  'use strict';

  function parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const clean = timeStr.trim();
    const isNegative = clean.includes('-');
    const parts = clean.replace(/[-+]/g, '').split(':');
    if (parts.length < 2) return 0;
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const total = hours * 60 + minutes;
    return isNegative ? -total : total;
  }

  function formatMinutesToTime(minutes, withSign = false) {
    const isNeg = minutes < 0;
    const absMinutes = Math.abs(minutes);
    const h = Math.floor(absMinutes / 60);
    const m = absMinutes % 60;
    const strH = String(h).padStart(2, '0');
    const strM = String(m).padStart(2, '0');
    if (withSign) {
      return (isNeg ? '-' : '+') + `${strH}:${strM}`;
    }
    return `${strH}:${strM}`;
  }

  function getTodayString() {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}/${m}/${y}`;
  }

  function extractKPIs(dailyTargetHours = 7) {
    const targetDailyMinutes = dailyTargetHours * 60;
    const table = document.getElementById('tblEspelhoPontoMesCorrente');
    if (!table) return null;

    const todayStr = getTodayString();
    let todayData = null;
    let totalWorkedMinutesMonth = 0;
    let totalExceedMinutesMonth = 0;
    let accumulatedBankBalance = '00:00';
    let extraWeekdayAndSaturdayMinutes = 0;
    let extraSundayAndHolidayMinutes = 0;
    let daysWithRecords = 0;
    let totalWorkingDaysMonth = 0;
    let remainingWorkingDaysMonth = 0;

    const rows = table.querySelectorAll('tr');

    rows.forEach((tr) => {
      const text = tr.innerText || '';

      // Captura Saldo Acumulado do Banco de Horas no rodapé
      if (text.includes('Saldo Acumulado do Banco de Horas:')) {
        const cell = tr.querySelector('.cellTotais, td:last-child');
        if (cell) {
          accumulatedBankBalance = cell.innerText.trim();
        }
      }

      // Linha de totais mensais
      if (tr.classList.contains('total-horas')) {
        const cells = tr.querySelectorAll('.cellTotais');
        if (cells.length >= 2) {
          totalWorkedMinutesMonth = parseTimeToMinutes(cells[0].innerText);
          totalExceedMinutesMonth = parseTimeToMinutes(cells[1].innerText);
        }
      }

      // Linhas dos dias
      const dateCell = tr.querySelector('.h01');
      if (dateCell) {
        const dateText = dateCell.innerText.trim();
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = dateText.match(dateRegex);

        if (match) {
          const dayNum = parseInt(match[1], 10);
          const monthNum = parseInt(match[2], 10);
          const yearNum = parseInt(match[3], 10);
          const dateObj = new Date(yearNum, monthNum - 1, dayNum);
          const dayOfWeek = dateObj.getDay(); // 0 = Dom, 6 = Sab
          const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

          const e1 = tr.querySelector('.h02')?.innerText.trim() || '';
          const s1 = tr.querySelector('.h03')?.innerText.trim() || '';
          const e2 = tr.querySelector('.h04')?.innerText.trim() || '';
          const s2 = tr.querySelector('.h05')?.innerText.trim() || '';
          const e3 = tr.querySelector('.h06')?.innerText.trim() || '';
          const s3 = tr.querySelector('.h07')?.innerText.trim() || '';
          const totalDay = tr.querySelector('.h09')?.innerText.trim() || '';
          const exceedDay = tr.querySelector('.h10')?.innerText.trim() || '';
          const extraSunday = tr.querySelector('.h11')?.innerText.trim() || '';
          const occurrence = tr.querySelector('.h16')?.innerText.trim() || '';

          const isHolidayOrRecess = occurrence.toUpperCase().includes('FERIADO') || occurrence.toUpperCase().includes('RECESSO');

          // Contabilização de horas extras por dia
          if (exceedDay && exceedDay !== '00:00' && !exceedDay.startsWith('-')) {
            extraWeekdayAndSaturdayMinutes += parseTimeToMinutes(exceedDay);
          }
          if (extraSunday && extraSunday !== '00:00') {
            extraSundayAndHolidayMinutes += parseTimeToMinutes(extraSunday);
          }

          if (!isWeekend && !isHolidayOrRecess) {
            totalWorkingDaysMonth++;
            const todayObj = new Date();
            const todayStart = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
            if (dateObj >= todayStart) {
              remainingWorkingDaysMonth++;
            }
          }

          if (e1 || s1 || totalDay) {
            daysWithRecords++;
          }

          if (dateText === todayStr) {
            todayData = {
              date: dateText,
              e1, s1, e2, s2, e3, s3,
              totalDay,
              exceedDay,
              occurrence,
              rowElement: tr
            };
          }
        }
      }
    });

    // Cálculo 1: Previsão de saída para completar expediente diário
    let estimatedExit = '--:--';
    let estimatedExitMinutes = null;
    let remainingMinutesToday = targetDailyMinutes;
    let workedMinutesToday = 0;

    if (todayData) {
      const e1M = todayData.e1 ? parseTimeToMinutes(todayData.e1) : null;
      const s1M = todayData.s1 ? parseTimeToMinutes(todayData.s1) : null;
      const e2M = todayData.e2 ? parseTimeToMinutes(todayData.e2) : null;
      const s2M = todayData.s2 ? parseTimeToMinutes(todayData.s2) : null;

      // 1. Cenário: Entrou (E1) e não saiu ainda
      if (e1M !== null && s1M === null) {
        estimatedExitMinutes = e1M + targetDailyMinutes;
        estimatedExit = formatMinutesToTime(estimatedExitMinutes % (24 * 60));
        const now = new Date();
        const curMinutes = now.getHours() * 60 + now.getMinutes();
        workedMinutesToday = Math.max(0, curMinutes - e1M);
        remainingMinutesToday = Math.max(0, targetDailyMinutes - workedMinutesToday);
      }
      // 2. Cenário: Fez 1º turno e está no 2º turno (E1, S1, E2 preenchidos, sem S2)
      else if (e1M !== null && s1M !== null && e2M !== null && s2M === null) {
        const firstTurn = Math.max(0, s1M - e1M);
        const needed = Math.max(0, targetDailyMinutes - firstTurn);
        estimatedExitMinutes = e2M + needed;
        estimatedExit = formatMinutesToTime(estimatedExitMinutes % (24 * 60));
        const now = new Date();
        const curMinutes = now.getHours() * 60 + now.getMinutes();
        const secondTurn = Math.max(0, curMinutes - e2M);
        workedMinutesToday = firstTurn + secondTurn;
        remainingMinutesToday = Math.max(0, targetDailyMinutes - workedMinutesToday);
      }
      // 3. Cenário: Concluído
      else if (todayData.totalDay && todayData.totalDay !== '00:00') {
        workedMinutesToday = parseTimeToMinutes(todayData.totalDay);
        remainingMinutesToday = 0;
        estimatedExit = todayData.s2 || todayData.s1 || 'Concluído';
      }
    }

    // Cálculo 2: Previsão de saída para zerar saldo do mês
    // Se o servidor tem saldo acumulado positivo no mês, ele pode sair mais cedo.
    // Se o servidor tem saldo acumulado negativo (débito) no mês, ele precisará compensar saindo mais tarde.
    let estimatedExitToZeroMonth = '--:--';
    let zeroMonthSubtext = 'Saldo do mês já zerado';
    let zeroMonthStatus = 'neutral'; // 'positive' | 'negative' | 'neutral'

    if (estimatedExitMinutes !== null) {
      // O saldo total do mês até o momento (totalExceedMinutesMonth)
      const diffMinutes = totalExceedMinutesMonth;
      
      if (diffMinutes > 0) {
        // Saldo positivo: pode sair mais cedo
        const exitZeroM = Math.max(0, estimatedExitMinutes - diffMinutes);
        estimatedExitToZeroMonth = formatMinutesToTime(exitZeroM % (24 * 60));
        zeroMonthSubtext = `Sair <strong>${formatMinutesToTime(diffMinutes)}</strong> mais cedo`;
        zeroMonthStatus = 'positive';
      } else if (diffMinutes < 0) {
        // Saldo negativo: precisa compensar
        const absDiff = Math.abs(diffMinutes);
        const exitZeroM = estimatedExitMinutes + absDiff;
        estimatedExitToZeroMonth = formatMinutesToTime(exitZeroM % (24 * 60));
        zeroMonthSubtext = `Compensar <strong>+${formatMinutesToTime(absDiff)}</strong> hoje`;
        zeroMonthStatus = 'negative';
      } else {
        estimatedExitToZeroMonth = estimatedExit;
        zeroMonthSubtext = `Igual ao expediente diário`;
        zeroMonthStatus = 'neutral';
      }
    } else if (todayData && todayData.totalDay && todayData.totalDay !== '00:00') {
      estimatedExitToZeroMonth = 'Expediente fechado';
      zeroMonthSubtext = `Saldo do mês: ${formatMinutesToTime(totalExceedMinutesMonth, true)}`;
    }

    // Cálculos de metas do mês
    const totalExpectedMinutesMonth = totalWorkingDaysMonth * targetDailyMinutes;
    const progressPercent = totalExpectedMinutesMonth > 0 
      ? Math.min(100, Math.round((totalWorkedMinutesMonth / totalExpectedMinutesMonth) * 100))
      : 0;

    return {
      todayStr,
      todayData,
      estimatedExit,
      workedMinutesToday,
      remainingMinutesToday,
      remainingTimeFormatted: formatMinutesToTime(remainingMinutesToday),
      
      // Previsão para zerar saldo do mês
      estimatedExitToZeroMonth,
      zeroMonthSubtext,
      zeroMonthStatus,

      // Banco de horas
      accumulatedBankBalance,
      accumulatedBankMinutes: parseTimeToMinutes(accumulatedBankBalance),

      // Horas extras separadas
      extraWeekdayAndSaturday: formatMinutesToTime(extraWeekdayAndSaturdayMinutes),
      extraSundayAndHoliday: formatMinutesToTime(extraSundayAndHolidayMinutes),

      // Metas do mês
      totalWorkedMinutesMonth,
      totalWorkedTimeFormatted: formatMinutesToTime(totalWorkedMinutesMonth),
      totalExpectedMinutesMonth,
      totalExpectedTimeFormatted: formatMinutesToTime(totalExpectedMinutesMonth),
      progressPercent,
      totalExceedMinutesMonth,
      totalExceedTimeFormatted: formatMinutesToTime(totalExceedMinutesMonth, true),
      daysWithRecords,
      totalWorkingDaysMonth,
      remainingWorkingDaysMonth,
      targetDailyHours: dailyTargetHours
    };
  }

  return {
    extractKPIs,
    parseTimeToMinutes,
    formatMinutesToTime
  };
})();
