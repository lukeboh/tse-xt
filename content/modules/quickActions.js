/**
 * JE Pessoas XT - Barra Flutuante de Ações Rápidas e Exportação
 */

window.JEPessoasQuickActions = (function () {
  'use strict';

  function isSptContext() {
    return window.location.pathname.includes('/spt-consultafrequencia') || !!document.querySelector('header.navbar-custom');
  }

  function setSafeHTML(el, htmlString) {
    if (!el) return;
    const doc = new DOMParser().parseFromString(`<!DOCTYPE html><html><body>${htmlString}</body></html>`, 'text/html');
    el.replaceChildren(...Array.from(doc.body.childNodes));
  }

  function createFloatingActions() {
    if (document.getElementById('je-floating-actions')) return;

    const spt = isSptContext();
    const fabContainer = document.createElement('div');
    fabContainer.id = 'je-floating-actions';
    fabContainer.className = 'je-fab-container';

    const menuItemsHTML = spt
      ? `
        <button type="button" class="je-fab-item" id="je-fab-spt-report" title="Relatório consolidado de horas por unidade (mensal CLT e espelho diário)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="8" y1="13" x2="16" y2="13"></line>
            <line x1="8" y1="17" x2="16" y2="17"></line>
          </svg>
          <span>Relatório de Horas (CLT)</span>
        </button>

        <button type="button" class="je-fab-item" id="je-fab-export-csv" title="Exportar tabela atual para CSV/Excel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Exportar CSV</span>
        </button>

        <button type="button" class="je-fab-item" id="je-fab-print" title="Imprimir / Salvar PDF">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          <span>Imprimir / PDF</span>
        </button>
      `
      : `
        <button type="button" class="je-fab-item" id="je-fab-export-csv" title="Exportar tabela para CSV/Excel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Exportar CSV</span>
        </button>

        <button type="button" class="je-fab-item" id="je-fab-today" title="Rolar até o dia de hoje">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>Ir para Hoje</span>
        </button>

        <button type="button" class="je-fab-item" id="je-fab-audit" title="Auditoria de Horas Perdidas (excedente sem pecúnia e sem banco)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Horas Perdidas</span>
        </button>

        <button type="button" class="je-fab-item" id="je-fab-recog" title="Relatório de Reconhecimento Posterior (horas feitas × horas pagas, por servidor)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <polyline points="9 15 11 17 15 13"></polyline>
          </svg>
          <span>Reconhecimento Posterior</span>
        </button>

        <button type="button" class="je-fab-item" id="je-fab-pay" title="Auditoria de Pagamento de Pecúnias (horas do espelho × contracheques)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2"></rect>
            <circle cx="12" cy="12" r="2.5"></circle>
            <path d="M6 12h.01M18 12h.01"></path>
          </svg>
          <span>Pagamento de Pecúnias</span>
        </button>

        <button type="button" class="je-fab-item" id="je-fab-print" title="Imprimir / Salvar PDF">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          <span>Imprimir / PDF</span>
        </button>
      `;

    setSafeHTML(fabContainer, `
      <div class="je-fab-menu" id="je-fab-menu">
        ${menuItemsHTML}
      </div>

      <button type="button" class="je-fab-main" id="je-fab-main" title="Ações Rápidas TSE XT">
        <svg class="je-fab-icon-open" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    `);

    document.body.appendChild(fabContainer);

    const mainBtn = fabContainer.querySelector('#je-fab-main');

    mainBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fabContainer.classList.toggle('active');
    });

    const exportBtn = fabContainer.querySelector('#je-fab-export-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        exportTableToCSV();
        fabContainer.classList.remove('active');
      });
    }

    const todayBtn = fabContainer.querySelector('#je-fab-today');
    if (todayBtn) {
      todayBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const todayRow = document.querySelector('.je-row-today');
        if (todayRow) {
          todayRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          todayRow.style.outline = '2px solid var(--je-primary-light)';
          setTimeout(() => { todayRow.style.outline = ''; }, 2000);
        }
        fabContainer.classList.remove('active');
      });
    }

    const printBtn = fabContainer.querySelector('#je-fab-print');
    if (printBtn) {
      printBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.print();
        fabContainer.classList.remove('active');
      });
    }

    const sptRepBtn = fabContainer.querySelector('#je-fab-spt-report');
    if (sptRepBtn) {
      sptRepBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.JEPessoasSptReport) window.JEPessoasSptReport.open();
        fabContainer.classList.remove('active');
      });
    }

    const auditBtn = fabContainer.querySelector('#je-fab-audit');
    if (auditBtn) {
      auditBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.JEPessoasLostHours) {
          window.JEPessoasLostHours.open();
        } else {
          alert('A Auditoria de Horas Perdidas só está disponível na tela do Espelho de Ponto Mensal.');
        }
        fabContainer.classList.remove('active');
      });
    }

    const recogBtn = fabContainer.querySelector('#je-fab-recog');
    if (recogBtn) {
      recogBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.JEPessoasRecognitionReport) window.JEPessoasRecognitionReport.open();
        fabContainer.classList.remove('active');
      });
    }

    const payBtn = fabContainer.querySelector('#je-fab-pay');
    if (payBtn) {
      payBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.JEPessoasPayrollAudit) window.JEPessoasPayrollAudit.open();
        fabContainer.classList.remove('active');
      });
    }
  }

  function exportTableToCSV() {
    const table = document.getElementById('tblEspelhoPontoMesCorrente') || document.getElementById('maintable');
    if (!table) {
      alert('Tabela de frequência não encontrada.');
      return;
    }

    const rows = table.querySelectorAll('tr');
    const csvLines = [];

    rows.forEach((tr) => {
      const cols = tr.querySelectorAll('th, td');
      const rowData = [];
      cols.forEach((col) => {
        let text = col.innerText.replace(/"/g, '""').trim();
        // Remove quebras de linha internas
        text = text.replace(/[\r\n]+/g, ' ');
        // Previne CSV / Formula Injection no Excel para strings que comecem com =, +, -, @, tab ou CR
        // Não altera horários válidos como +01:30 ou -00:45 nem números simples
        if (/^[=+\-@\t\r]/.test(text) && !/^[+\-]?\d{1,2}:\d{2}$/.test(text) && !/^[+\-]?\d+(\.\d+)?$/.test(text)) {
          text = "'" + text;
        }
        rowData.push(`"${text}"`);
      });
      if (rowData.length > 0) {
        csvLines.push(rowData.join(';'));
      }
    });

    const csvContent = '\uFEFF' + csvLines.join('\r\n'); // BOM para acentuação no Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const mes = document.getElementById('mesSelecionado')?.value || 'mes';
    const ano = document.getElementById('anoSelecionado')?.value || 'ano';
    a.href = url;
    a.download = `Espelho_Ponto_${mes}_${ano}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    init: createFloatingActions,
    exportTableToCSV
  };
})();
