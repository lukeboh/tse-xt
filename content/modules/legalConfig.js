/**
 * TSE XT - Configuração Legal Centralizada (T1 do roadmap-conformidade)
 *
 * Constantes de cálculo com rastreabilidade normativa. Cada item traz
 * { valor, norma, artigo, url } para alimentar tooltips e avisos (T5) e
 * servir de fonte única a R3, R5, R6 e à Auditoria de Horas Perdidas.
 *
 * Referências: docs/regras-calculo-frequencia.md
 */

window.JEPessoasLegal = (function () {
  'use strict';

  const URLS = {
    res22901: 'https://www.tse.jus.br/legislacao/compilada/res/2008/resolucao-no-22-901-de-12-de-agosto-de-2008',
    prt380_2026: 'https://www.tse.jus.br/legislacao/compilada/prt/2026/portaria-no-380-de-26-de-junho-de-2026',
    prt490_2022: 'https://www.tse.jus.br/legislacao/compilada/prt/2022/portaria-no-490-de-20-de-maio-de-2022',
    prt378_2019: 'https://www.tse.jus.br/legislacao/compilada/prt/2019/portaria-no-378-de-23-de-maio-de-2019',
    prt885_2024: 'https://www.tse.jus.br/legislacao/compilada/prt/2024/portaria-no-885-de-09-de-dezembro-de-2024',
    prt461_2023: 'https://www.tse.jus.br/legislacao/compilada/prt/2023/portaria-no-461-de-19-de-junho-de-2023',
    prt269_2025: 'https://www.tse.jus.br/legislacao/compilada/prt/2025/portaria-no-269-de-16-de-junho-de-2025',
    prt552_2025: 'https://www.tse.jus.br/legislacao/compilada/prt/2025/portaria-no-552-de-2-de-dezembro-de-2025',
    lei8112: 'http://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm'
  };

  // Fatores de multiplicador do crédito no banco de horas, por tipo de dia.
  const SATURDAY_FACTOR = { valor: 1.5, norma: 'Res. 22.901/2008', artigo: 'art. 9º', url: URLS.res22901 };
  const SUNDAY_HOLIDAY_FACTOR = { valor: 2.0, norma: 'Res. 22.901/2008', artigo: 'art. 9º', url: URLS.res22901 };

  // Jornada ordinária de referência e faixa de complementação.
  const JORNADA_ORDINARIA_MIN = { valor: 420, norma: 'Portaria 380/2026', artigo: 'art. 7º §2º', url: URLS.prt380_2026 };
  const COMPLEMENTACAO_MAX_MIN = { valor: 480, norma: 'Portaria 380/2026', artigo: 'art. 7º §2º', url: URLS.prt380_2026 };

  // Jornada diária por padrão de marcação:
  //  - turno único (1 entrada / 1 saída, sem intervalo): 7h (35h/semana)
  //  - com intervalo (2ª entrada registrada): 8h (40h/semana), Lei 8.112/1990
  //  - recesso reduzido (janeiro todo ano; julho de ano não eleitoral): 5h,
  //    Portarias anuais de expediente; julho: Portarias 461/2023 e 269/2025.
  const JORNADA_TURNO_UNICO_MIN = { valor: 420, norma: 'prática TSE (35h/semana em turno único)', artigo: '', url: URLS.res22901 };
  const JORNADA_COM_INTERVALO_MIN = { valor: 480, norma: 'Lei 8.112/1990', artigo: 'art. 19 (40h/semana)', url: URLS.lei8112 };
  const JORNADA_RECESSO_MIN = { valor: 300, norma: 'Portarias-TSE 885/2024, 552/2025, 461/2023 e 269/2025', artigo: 'expediente reduzido; conferir ato anual', url: URLS.prt552_2025 };

  const REDUCED_JOURNEY_NOTICE = 'Jornada reduzida: o excedente acima de 5h é apuração informativa, não crédito automático nem direito reconhecido a pagamento. Conferir o ato do período e as autorizações. No recesso forense de 20/12 a 06/01, a conversão das horas acima de 5h em banco depende de decisão da DG (Portarias 885/2024 e 552/2025, art. 4º, parágrafo único). As Portarias 461/2023 e 269/2025 fixam o expediente de julho, sem vedação geral de banco. Não se estende a restrição do recesso forense a todo janeiro ou julho.';

  // Anos eleitorais no Brasil: todo ano PAR tem eleição (geral ou municipal).
  function isElectionYear(y) { return (Number(y) % 2) === 0; }

  // Mês de recesso com jornada reduzida a 5h: janeiro (todo ano) e julho
  // (apenas em anos NÃO eleitorais — em ano eleitoral julho é de operação plena).
  function isReducedRecessMonth(y, m) {
    m = Number(m);
    if (m === 1) return true;
    if (m === 7 && !isElectionYear(y)) return true;
    return false;
  }

  // Jornada-alvo do dia, em minutos, a partir das marcações e do mês/ano.
  //   o.e2 (ou o.e3) presente  => tirou intervalo => 8h, sempre.
  //   turno único              => 7h; ou 5h se o mês for de recesso reduzido.
  function dailyTargetMinutes(o) {
    o = o || {};
    const hasBreak = !!(o.e2 || o.e3);
    if (hasBreak) return JORNADA_COM_INTERVALO_MIN.valor;
    if (o.year && o.month && isReducedRecessMonth(o.year, o.month)) return JORNADA_RECESSO_MIN.valor;
    return JORNADA_TURNO_UNICO_MIN.valor;
  }

  // Tetos de serviço extraordinário.
  const MAX_HE_DIA_UTIL_MIN = { valor: 120, norma: 'Res. 22.901/2008 / Portaria 380/2026', artigo: 'art. 4º', url: URLS.prt380_2026 };
  const MAX_HE_FDS_MIN = { valor: 600, norma: 'Res. 22.901/2008 / Portaria 380/2026', artigo: 'art. 4º', url: URLS.prt380_2026 };
  const MAX_HE_MES_MIN = { valor: 3600, norma: 'Res. 22.901/2008 / Portaria 380/2026', artigo: 'art. 4º', url: URLS.res22901 };
  const EXTRAPOLACAO_COMP_MIN = { valor: 1800, norma: 'Res. 22.901/2008', artigo: 'art. 4º §1º', url: URLS.res22901 };

  // Repousos.
  const REPOUSO_INTRA_MIN = { valor: 60, norma: 'Portaria 380/2026', artigo: 'art. 7º', url: URLS.prt380_2026 };
  const REPOUSO_INTER_MIN = { valor: 480, norma: 'Res. 22.901/2008', artigo: 'art. 7º', url: URLS.res22901 };

  // Regras de banco de horas por regime.
  const VEDA_ADQUIRIR_BH_HIBRIDO = { norma: 'Portaria 490/2022', artigo: 'art. 22', url: URLS.prt490_2022 };
  const VEDA_UTILIZAR_BH_MES_HE = { norma: 'Portaria 380/2026', artigo: 'art. 13', url: URLS.prt380_2026 };
  const VEDA_HE_TELETRABALHO = { norma: 'Portaria 380/2026 / Portaria 490/2022', artigo: 'art. 12 / art. 23', url: URLS.prt380_2026 };
  const AUTORIZACAO_PREVIA_HE = { norma: 'Portaria 380/2026', artigo: 'art. 3º / §4º', url: URLS.prt380_2026 };
  const HOMOLOGACAO_RELATORIO = { norma: 'Portaria 380/2026', artigo: 'art. 10', url: URLS.prt380_2026 };

  function ref(o) {
    if (!o || !o.norma) return '';
    return `${o.norma}, ${o.artigo}`;
  }

  return {
    URLS,
    REDUCED_JOURNEY_NOTICE,
    SATURDAY_FACTOR,
    SUNDAY_HOLIDAY_FACTOR,
    JORNADA_ORDINARIA_MIN,
    COMPLEMENTACAO_MAX_MIN,
    JORNADA_TURNO_UNICO_MIN,
    JORNADA_COM_INTERVALO_MIN,
    JORNADA_RECESSO_MIN,
    MAX_HE_DIA_UTIL_MIN,
    MAX_HE_FDS_MIN,
    MAX_HE_MES_MIN,
    EXTRAPOLACAO_COMP_MIN,
    REPOUSO_INTRA_MIN,
    REPOUSO_INTER_MIN,
    VEDA_ADQUIRIR_BH_HIBRIDO,
    VEDA_UTILIZAR_BH_MES_HE,
    VEDA_HE_TELETRABALHO,
    AUTORIZACAO_PREVIA_HE,
    HOMOLOGACAO_RELATORIO,
    isElectionYear,
    isReducedRecessMonth,
    dailyTargetMinutes,
    ref
  };
})();
