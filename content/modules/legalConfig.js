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
    lei8112: 'http://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm'
  };

  // Fatores de multiplicador do crédito no banco de horas, por tipo de dia.
  const SATURDAY_FACTOR = { valor: 1.5, norma: 'Res. 22.901/2008', artigo: 'art. 9º', url: URLS.res22901 };
  const SUNDAY_HOLIDAY_FACTOR = { valor: 2.0, norma: 'Res. 22.901/2008', artigo: 'art. 9º', url: URLS.res22901 };

  // Jornada ordinária de referência e faixa de complementação.
  const JORNADA_ORDINARIA_MIN = { valor: 420, norma: 'Portaria 380/2026', artigo: 'art. 7º §2º', url: URLS.prt380_2026 };
  const COMPLEMENTACAO_MAX_MIN = { valor: 480, norma: 'Portaria 380/2026', artigo: 'art. 7º §2º', url: URLS.prt380_2026 };

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
    SATURDAY_FACTOR,
    SUNDAY_HOLIDAY_FACTOR,
    JORNADA_ORDINARIA_MIN,
    COMPLEMENTACAO_MAX_MIN,
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
    ref
  };
})();
