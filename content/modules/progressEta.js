/**
 * TSE XT - Progresso e previsão de término das varreduras longas
 *
 * Os relatórios consultam o portal uma tela por vez. O usuário escolhe o
 * período sem limite de meses; em troca, a barra mostra o andamento da
 * varredura inteira e quando ela deve terminar.
 *
 * A previsão vem da duração média de cada tipo de consulta já feita
 * (ex.: 'espelho', 'contracheque'). Tipo ainda não medido usa a média de outro
 * tipo multiplicada por um fator; sem nenhuma medida, não há previsão.
 */

window.JEPessoasProgress = (function () {
  'use strict';

  /**
   * @param {{now?:function():number}} [opts]  now: relógio em ms (testes)
   */
  function createTracker(opts) {
    const now = (opts && opts.now) || (() => Date.now());
    const start = now();
    let last = start;
    const stats = {};

    return {
      /** Uma consulta do tipo `kind` terminou: mede desde a anterior. */
      step(kind) {
        const t = now();
        const s = stats[kind] || (stats[kind] = { n: 0, ms: 0 });
        s.n += 1;
        s.ms += t - last;
        last = t;
      },
      /** Duração média do tipo, ou null se ainda não foi medido. */
      average(kind) {
        const s = stats[kind];
        return s && s.n ? s.ms / s.n : null;
      },
      elapsedMs() {
        return now() - start;
      },
      /**
       * Tempo que falta para as consultas de `plan` ({tipo: quantidade}).
       * `factors` ({tipo: {of, x}}) estima um tipo não medido a partir de outro:
       * contracheque ≈ 2 × espelho. Devolve null se algum tipo não puder ser estimado.
       */
      remainingMs(plan, factors) {
        let total = 0;
        for (const kind of Object.keys(plan || {})) {
          const count = Math.max(0, plan[kind] || 0);
          if (!count) continue;
          let avg = this.average(kind);
          const f = factors && factors[kind];
          if (avg == null && f) {
            const base = this.average(f.of);
            if (base != null) avg = base * f.x;
          }
          if (avg == null) return null;
          total += avg * count;
        }
        return total;
      }
    };
  }

  /** Fração concluída (0 a 1) pelo tempo: o que passou sobre o que passou mais o que falta. */
  function fraction(elapsedMs, remainingMs, doneCount, totalCount) {
    if (remainingMs == null) return totalCount > 0 ? Math.min(1, doneCount / totalCount) : 0;
    const whole = elapsedMs + remainingMs;
    return whole > 0 ? Math.min(1, elapsedMs / whole) : 1;
  }

  /** "cerca de 4 min (até 14:35)"; '' sem previsão. */
  function formatEta(remainingMs, nowDate) {
    if (remainingMs == null) return '';
    const end = new Date((nowDate || new Date()).getTime() + remainingMs);
    const clock = String(end.getHours()).padStart(2, '0') + ':' + String(end.getMinutes()).padStart(2, '0');
    const min = Math.ceil(remainingMs / 60000);
    if (remainingMs < 60000) return 'menos de 1 min';
    if (min < 60) return `cerca de ${min} min (até ${clock})`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `cerca de ${h} h${m ? ' ' + m + ' min' : ''} (até ${clock})`;
  }

  return { createTracker, fraction, formatEta };
})();
