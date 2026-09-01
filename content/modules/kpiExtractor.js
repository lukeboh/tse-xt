/**
 * JE Pessoas XT - Extrator e Calculador de KPIs do Espelho de Ponto (v0.1.14)
 */

window.JEPessoasKPI = (function () {
  'use strict';

  function parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const clean = timeStr.replace(/[\u00a0\s]/g, '').replace(/[\u2212\u2013\u2014\u2010\u2015]/g, '-').trim();
    if (!clean || clean === '--:--' || clean === '-') return 0;
    const isNegative = clean.startsWith('-') || clean.includes('-');
    const digitsOnly = clean.replace(/[^0-9:]/g, '');
    const parts = digitsOnly.split(':');
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

    // Mês homologado: o cabeçalho nativo "HORAS EXCED." passa a ser "HORAS AJUST."
    // (vem com <br>, por isso o replace de whitespace antes do match).
    const isClosedMonth = Array.from(table.querySelectorAll('th')).some(th => {
      const t = (th.innerText || '').toUpperCase().replace(/\s+/g, ' ');
      return t.includes('HORAS AJUST') || t.includes('HORA AJUST');
    });

    const todayStr = getTodayString();
    let todayData = null;
    let totalWorkedMinutesMonth = 0;
    let totalExceedMinutesMonth = 0;
    let accumulatedBankBalance = '00:00';
    let pecuniaWeekdaySatMinutes = 0;
    let pecuniaSundayHolidayMinutes = 0;
    let daysWithRecords = 0;
    let totalWorkingDaysMonth = 0;
    let remainingWorkingDaysMonth = 0;
    let pastWorkingDaysMonth = 0;
    let totalExpectedMinutesMonth = 0;
    let pastExpectedMinutesMonth = 0;
    let remainingExpectedMinutesMonth = 0;
    let runningAccumulatedBalance = 0;

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

      // Linhas dos dias (com data dd/mm/aaaa na célula .h01)
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
          const abono = tr.querySelector('.h08')?.innerText.trim() || '';
          const totalDay = tr.querySelector('.h09')?.innerText.trim() || '';
          const exceedDay = tr.querySelector('.h10')?.innerText.trim() || '';
          const pecunia = (tr.querySelector('.h12') || tr.querySelector('.h11'))?.innerText.trim() || '';
          const occurrence = tr.querySelector('.h16')?.innerText.trim() || '';

          const pecuniaMin = parseTimeToMinutes(pecunia);
          const abonoMin = parseTimeToMinutes(abono);
          const exceedMin = parseTimeToMinutes(exceedDay);
          const totalMin = parseTimeToMinutes(totalDay);

          // Identificação de Ocorrências e Dispensas da Jornada Ordinária
          const rawRowText = tr.innerText.toUpperCase();
          const occText = (occurrence + ' ' + rawRowText).toUpperCase();

          const isHolidayOrRecess = occText.includes('FERIADO') || occText.includes('RECESSO') || occText.includes('FACULTATIVO');
          const isLicense = occText.includes('LICENÇA') || occText.includes('LICENCA') || occText.includes('MÉDICA') || occText.includes('MEDICA') || occText.includes('LUTO') || occText.includes('NOJO') || occText.includes('GALA') || occText.includes('MATERNIDADE') || occText.includes('PATERNIDADE') || occText.includes('CAPACITAÇÃO') || occText.includes('CAPACITACAO') || occText.includes('PRÊMIO') || occText.includes('PREMIO');
          const isHybrid = occText.includes('HÍBRIDO') || occText.includes('HIBRIDO') || occText.includes('TELETRABALHO') || occText.includes('REMOTO') || occText.includes('HOME OFFICE');
          const isVacation = occText.includes('FÉRIAS') || occText.includes('FERIAS');
          const isTravel = occText.includes('VIAGEM') || occText.includes('MISSÃO') || occText.includes('MISSAO') || (occText.includes('SERVIÇO') && !occText.includes('TEMPO DE'));

          const isDispensed = isHolidayOrRecess || isLicense || isHybrid || isVacation || isTravel || (abonoMin >= targetDailyMinutes);

          // Verifica se houve intervalo de almoço (2 entradas e 2 saídas preenchidas)
          const hasLunchInterval = !!(e1 && s1 && e2 && s2);
          const dayTargetMinutes = hasLunchInterval ? (8 * 60) : targetDailyMinutes; // 8h ou 7h

          // Contabilização de dias úteis e meta esperada (exclui fins de semana e dispensas)
          const todayObj = new Date();
          const todayStart = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
          const isPast = dateObj < todayStart;
          const isToday = dateText === todayStr;
          const isFuture = dateObj > todayStart;

          if (!isWeekend && !isDispensed) {
            totalWorkingDaysMonth++;
            totalExpectedMinutesMonth += dayTargetMinutes;
            if (isPast) {
              pastWorkingDaysMonth++;
              pastExpectedMinutesMonth += dayTargetMinutes;
            } else {
              remainingWorkingDaysMonth++;
              remainingExpectedMinutesMonth += dayTargetMinutes;
            }
          }

          const hasRealRecords = !!(e1 || s1 || (totalMin > 0) || (exceedMin !== 0) || (pecuniaMin > 0) || (abonoMin > 0));
          if (hasRealRecords && !isFuture) {
            daysWithRecords++;
          }

          // CÁLCULO DO SALDO ACUMULADO DO MÊS (SEM PECÚNIA E SEM DIAS FUTUROS)
          if (!isFuture) {
            // Fonte única de verdade, compartilhada com a coluna "SALDO ACUM." (domModernizer).
            const dispensedNonHoliday = isLicense || isVacation || isTravel || (abonoMin >= dayTargetMinutes);
            const { delta: dailyDelta } = window.JEPessoasBalance.computeDailyDelta({
              dayOfWeek,
              isClosedMonth,
              isHolidayOrRecess,
              isDispensed: dispensedNonHoliday,
              totalMin,
              exceedMin,
              pecuniaMin,
              dayTargetMinutes
            });

            // Soma da PECÚNIA (horas que serão pagas) por tipo de dia — alimenta o card "Horas Extras".
            if (pecuniaMin > 0) {
              if (dayOfWeek === 0 || isHolidayOrRecess) {
                pecuniaSundayHolidayMinutes += pecuniaMin;
              } else {
                pecuniaWeekdaySatMinutes += pecuniaMin;
              }
            }

            runningAccumulatedBalance += dailyDelta;
            totalExceedMinutesMonth += dailyDelta;
          }

          if (isToday) {
            todayData = {
              date: dateText,
              e1, s1, e2, s2, e3, s3,
              totalDay,
              exceedDay,
              pecunia,
              occurrence,
              dayTargetMinutes,
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
      // 2. Cenário: Fez 1º turno e está no 2º turno
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

    const tableText = table.innerText.toUpperCase();
    const hasHybridWorkInMonth = tableText.includes('TRABALHO HIBRIDO') || tableText.includes('TRABALHO HÍBRIDO') || tableText.includes('TELETRABALHO');

    // Se houver trabalho híbrido no mês, não há acúmulo de banco de horas institucional nem de saldo acumulado.
    // (A pecúnia NÃO é zerada: é valor a pagar, independente do regime de banco de horas.)
    if (hasHybridWorkInMonth) {
      runningAccumulatedBalance = 0;
      totalExceedMinutesMonth = 0;
      accumulatedBankBalance = '00:00';
    }

    // Numerador da Meta do Mês: Carga dos dias passados + Saldo Acumulado Atual (Exclui estritamente horas pagas em pecúnia)
    totalWorkedMinutesMonth = Math.max(0, pastExpectedMinutesMonth + runningAccumulatedBalance);

    // Cálculo 2: Previsão de saída para zerar saldo do mês
    let estimatedExitToZeroMonth = '--:--';
    let zeroMonthSubtext = hasHybridWorkInMonth ? 'Regime Híbrido (sem banco de horas)' : 'Saldo do mês já zerado';
    let zeroMonthStatus = 'neutral';

    if (!hasHybridWorkInMonth && estimatedExitMinutes !== null) {
      const diffMinutes = totalExceedMinutesMonth;
      
      if (diffMinutes > 0) {
        const exitZeroM = Math.max(0, estimatedExitMinutes - diffMinutes);
        estimatedExitToZeroMonth = formatMinutesToTime(exitZeroM % (24 * 60));
        zeroMonthSubtext = `Sair <strong>${formatMinutesToTime(diffMinutes)}</strong> mais cedo`;
        zeroMonthStatus = 'positive';
      } else if (diffMinutes < 0) {
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
    } else if (!hasHybridWorkInMonth && todayData && todayData.totalDay && todayData.totalDay !== '00:00') {
      estimatedExitToZeroMonth = 'Expediente fechado';
      zeroMonthSubtext = `Saldo do mês: ${formatMinutesToTime(totalExceedMinutesMonth, true)}`;
    }

    // Cálculos de metas do mês (Denominador Dinâmico: 7h/8h excluindo licenças, híbrido, férias e viagens)
    const progressPercent = totalExpectedMinutesMonth > 0 
      ? Math.round((totalWorkedMinutesMonth / totalExpectedMinutesMonth) * 100)
      : 0;
    
    // Horas que faltam cumprir até o fim do mês: (Dias Restantes * Carga) - Saldo Excedente Acumulado
    const remainingMinutesToCompleteMonth = Math.max(0, remainingExpectedMinutesMonth - runningAccumulatedBalance);
    const remainingHoursFormatted = formatMinutesToTime(remainingMinutesToCompleteMonth);

    // Meta superada APENAS se ultrapassar a meta global de 133h do mês inteiro
    const isTargetExceeded = totalWorkedMinutesMonth >= totalExpectedMinutesMonth && (remainingWorkingDaysMonth === 0 || totalWorkedMinutesMonth > totalExpectedMinutesMonth);
    const exceededMinutes = Math.max(0, totalWorkedMinutesMonth - totalExpectedMinutesMonth);
    const exceededTimeFormatted = formatMinutesToTime(exceededMinutes);
    const barFillPercent = Math.min(100, progressPercent);

    return {
      todayStr,
      todayData,
      hasTodayRow: !!todayData,
      hasHybridWorkInMonth,
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

      // Pecúnia (horas a pagar) separada por tipo de dia
      pecuniaWeekdaySat: formatMinutesToTime(pecuniaWeekdaySatMinutes),
      pecuniaSundayHoliday: formatMinutesToTime(pecuniaSundayHolidayMinutes),
      pecuniaTotalMinutes: pecuniaWeekdaySatMinutes + pecuniaSundayHolidayMinutes,

      // Metas do mês
      totalWorkedMinutesMonth,
      totalWorkedTimeFormatted: formatMinutesToTime(totalWorkedMinutesMonth),
      totalExpectedMinutesMonth,
      totalExpectedTimeFormatted: formatMinutesToTime(totalExpectedMinutesMonth),
      progressPercent,
      barFillPercent,
      isTargetExceeded,
      exceededMinutes,
      exceededTimeFormatted,
      remainingMinutesToCompleteMonth,
      remainingHoursFormatted,
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
