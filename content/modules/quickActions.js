/**
 * JE Pessoas XT - Barra Flutuante de Ações Rápidas e Exportação
 */

window.JEPessoasQuickActions = (function () {
  'use strict';

  function createFloatingActions() {
    if (document.getElementById('je-floating-actions')) return;

    const fabContainer = document.createElement('div');
    fabContainer.id = 'je-floating-actions';
    fabContainer.className = 'je-fab-container';

    fabContainer.innerHTML = `
      <div class="je-fab-menu" id="je-fab-menu">
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

        <button type="button" class="je-fab-item" id="je-fab-print" title="Imprimir / Salvar PDF">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          <span>Imprimir / PDF</span>
        </button>
      </div>

      <button type="button" class="je-fab-main" id="je-fab-main" title="Ações Rápidas JE Pessoas XT">
        <svg class="je-fab-icon-open" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    `;

    document.body.appendChild(fabContainer);

    const mainBtn = fabContainer.querySelector('#je-fab-main');
    const fabMenu = fabContainer.querySelector('#je-fab-menu');

    mainBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fabContainer.classList.toggle('active');
    });

    fabContainer.querySelector('#je-fab-export-csv').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      exportTableToCSV();
      fabContainer.classList.remove('active');
    });

    fabContainer.querySelector('#je-fab-today').addEventListener('click', (e) => {
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

    fabContainer.querySelector('#je-fab-print').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.print();
      fabContainer.classList.remove('active');
    });

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
  }

  function exportTableToCSV() {
    const table = document.getElementById('tblEspelhoPontoMesCorrente');
    if (!table) {
      alert('Tabela de espelho de ponto não encontrada.');
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
