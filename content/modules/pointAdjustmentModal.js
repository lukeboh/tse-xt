/**
 * TSE XT - Módulo de Formulário Modal de Ajuste de Ponto Inline (v0.3.19)
 */

window.JEPessoasPointModal = (function () {
  'use strict';

  let modalOverlay = null;

  function escapeHTML(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[&<>'"]/g, (tag) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  function executePageScript(scriptCode) {
    if (!scriptCode) return;
    try {
      const script = document.createElement('script');
      script.textContent = scriptCode;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (err) {
      console.error('Erro ao executar script da página:', err);
    }
  }

  function getSelectedServerName(doc) {
    // 1. Tenta pegar da combo de servidores selecionados na tela principal
    const mainSelect = document.querySelector('#servidorSelecionado_matricula, select[name*="servidor" i], select[name*="matricula" i]');
    if (mainSelect && mainSelect.selectedIndex >= 0) {
      const optText = mainSelect.options[mainSelect.selectedIndex].text.trim();
      if (optText && !optText.toLowerCase().includes('selecione')) {
        return optText;
      }
    }

    // 2. Tenta pegar do documento carregado por AJAX (doc)
    if (doc) {
      const docSelect = doc.querySelector('#servidorSelecionado_matricula, select[name*="servidor" i]');
      if (docSelect && docSelect.selectedIndex >= 0) {
        const optText = docSelect.options[docSelect.selectedIndex].text.trim();
        if (optText && !optText.toLowerCase().includes('selecione')) {
          return optText;
        }
      }
    }

    // 3. Fallback: tenta obter do cabeçalho do usuário logado na aplicação
    const userEl = document.querySelector('.usuario-logado, #usuarioLogado, #divTopServidorNome, .no-print strong');
    if (userEl) {
      return userEl.innerText.trim();
    }

    return 'Servidor';
  }

  function applyTimeMask(inputEl) {
    if (!inputEl) return;

    inputEl.setAttribute('maxlength', '5');
    inputEl.setAttribute('placeholder', '00:00');

    inputEl.addEventListener('keydown', (e) => {
      const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
        return;
      }
      if (!/^[0-9:]$/.test(e.key)) {
        e.preventDefault();
      }
    });

    inputEl.addEventListener('input', () => {
      let raw = inputEl.value.replace(/\D/g, '');

      if (raw.length > 4) {
        raw = raw.slice(0, 4);
      }

      if (raw.length >= 3) {
        inputEl.value = raw.slice(0, 2) + ':' + raw.slice(2);
      } else {
        inputEl.value = raw;
      }
    });

    inputEl.addEventListener('blur', () => {
      let v = inputEl.value.trim();
      if (!v) return;

      let digits = v.replace(/\D/g, '');

      if (digits.length === 1) {
        digits = '0' + digits + '00';
      } else if (digits.length === 2) {
        digits = digits + '00';
      } else if (digits.length === 3) {
        digits = '0' + digits;
      }

      if (digits.length >= 4) {
        let hh = parseInt(digits.slice(0, 2), 10);
        let mm = parseInt(digits.slice(2, 4), 10);

        if (isNaN(hh) || hh < 0) hh = 0;
        if (hh > 23) hh = 23;

        if (isNaN(mm) || mm < 0) mm = 0;
        if (mm > 59) mm = 59;

        const hhStr = String(hh).padStart(2, '0');
        const mmStr = String(mm).padStart(2, '0');

        inputEl.value = `${hhStr}:${mmStr}`;
      }
    });
  }

  function createModalDOM() {
    if (document.getElementById('je-point-modal-overlay')) {
      return document.getElementById('je-point-modal-overlay');
    }

    const overlay = document.createElement('div');
    overlay.id = 'je-point-modal-overlay';
    overlay.className = 'je-point-modal-overlay';

    overlay.innerHTML = `
      <div class="je-point-modal-card" role="dialog" aria-modal="true">
        <div class="je-point-modal-body" id="je-point-modal-body">
          <div class="je-modal-loading">
            <div class="je-spinner"></div>
            <span>Carregando formulário de ajuste...</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        closeModal();
      }
    });

    modalOverlay = overlay;
    return overlay;
  }

  function closeModal() {
    if (modalOverlay) {
      modalOverlay.classList.remove('active');
    }
  }

  function getCurrentUserOrSelectedMatricula() {
    // 1. Tenta obter do select de servidores (quando chefe está selecionando um servidor)
    const mainSelect = document.querySelector('#servidorSelecionado_matricula, select[name*="servidor" i], select[name*="matricula" i]');
    if (mainSelect && mainSelect.value && mainSelect.value !== '0') {
      return mainSelect.value.trim();
    }

    // 2. Tenta obter do elemento da página com a matrícula do servidor logado (ex: .matricula strong => 30901018)
    const matEl = document.querySelector('.matricula strong, .matricula span, #divTopServidorMatricula');
    if (matEl) {
      const text = matEl.innerText.replace(/\D/g, '').trim();
      if (text && text.length >= 6) {
        return text;
      }
    }

    // 3. Tenta obter da URL atual
    const match = window.location.search.match(/matricula=(\d+)/i);
    if (match && match[1] && match[1] !== '0') {
      return match[1];
    }

    return '';
  }

  function getLoggedInMatricula() {
    const el = document.querySelector('.matricula strong, .matricula span, .matricula, #divTopServidorMatricula');
    if (el) {
      const digits = (el.innerText || '').replace(/\D/g, '').trim();
      if (digits.length >= 6) return digits;
    }
    return '';
  }

  function getViewedMatricula() {
    const sel = document.querySelector('#servidorSelecionado_matricula, select[name*="servidor" i], select[name*="matricula" i]');
    if (sel && sel.value && sel.value !== '0') return sel.value.replace(/\D/g, '').trim();
    const inp = document.querySelector('input[name="servidorSelecionado.matricula"]');
    if (inp && inp.value && inp.value !== '0') return inp.value.replace(/\D/g, '').trim();
    const m = window.location.search.match(/matricula=(\d+)/i);
    if (m && m[1] && m[1] !== '0') return m[1];
    return '';
  }

  // Regra do sistema: o ajuste de ponto só é permitido quando se visualiza o
  // ponto de OUTRA pessoa (visão de chefia) — se posso ver, é porque tenho
  // gerência para corrigir. No próprio espelho os botões não devem aparecer.
  function canAdjustCurrentTimesheet() {
    const mine = getLoggedInMatricula();
    const viewed = getViewedMatricula();
    return !!(mine && viewed && viewed !== mine);
  }

  function getSelectedServerParams() {
    const params = new URLSearchParams();
    const targetMatricula = getCurrentUserOrSelectedMatricula();
    if (targetMatricula) {
      params.set('servidorSelecionado.matricula', targetMatricula);
      params.set('matricula', targetMatricula);
    }
    return params;
  }

  async function openModalForDate(dateStr) {
    const overlay = createModalDOM();
    const modalBody = overlay.querySelector('#je-point-modal-body');

    modalBody.innerHTML = `
      <div class="je-modal-loading">
        <div class="je-spinner"></div>
        <span>Buscando formulário de alteração de ponto...</span>
      </div>
    `;

    overlay.classList.add('active');

    try {
      const targetMatricula = getCurrentUserOrSelectedMatricula();
      const targetUrl = '/portalservidor2/EspelhoPontoDiaAction_consultar.action';

      const postParams = new URLSearchParams();
      postParams.set('espelhoPontoDia.data.asString', dateStr);
      postParams.set('dataSelecionada', dateStr);
      postParams.set('bolAcessoViaLink', 'false');

      if (targetMatricula) {
        postParams.set('servidorSelecionado.matricula', targetMatricula);
        postParams.set('matricula', targetMatricula);
      }

      const mainUnidade = document.querySelector('#unidadeSelecionada_idUnidade, select[name*="unidade" i]');
      if (mainUnidade && mainUnidade.value && mainUnidade.value !== '0') {
        postParams.set('unidadeSelecionada.idUnidade', mainUnidade.value);
      }

      let response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        body: postParams.toString()
      });

      if (!response.ok) {
        const getUrl = `${targetUrl}?${postParams.toString()}`;
        response = await fetch(getUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      const fetchedForm = doc.querySelector('#formEspelhoPontoDia, form[name*="EspelhoPonto"]');
      const moldura = doc.querySelector('#conteudo > div:nth-child(2) > div.moldura') || doc.querySelector('.moldura');

      if (!moldura) {
        modalBody.innerHTML = `
          <div class="je-modal-alert je-modal-alert-warning">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div>
              <strong>Formulário Não Disponível</strong>
              <p>O formulário de ajuste não está disponível para este servidor ou data. Verifique se o seu perfil possui gerência sobre este registro.</p>
            </div>
          </div>
        `;
        return;
      }

      const serverName = getSelectedServerName(doc);
      // Endpoint exato construído pela função nativa montarNovaURL() do TSE:
      let actionUrl = '/portalservidor2/EspelhoPontoDiaAction_formEspelhoPontoDia_chefeIncluirMarcacao.action';

      const formWrapper = document.createElement('form');
      formWrapper.id = 'je-modal-card-form';
      formWrapper.action = actionUrl;
      formWrapper.method = 'POST';

      const spanOperacaoText = moldura.querySelector('.imitaTextfieldReadonlySemBorda')?.innerText.trim() || 'Inclusão';
      const origInputHorario = moldura.querySelector('#marcacaoPonto_marcacao, input[name*="marcacao" i]');
      const origSelectMotivo = moldura.querySelector('#marcacaoPonto_alteracao_motivo_codigo, select[name*="motivo" i]');
      const origTextareaJustificativa = moldura.querySelector('#marcacaoPonto_alteracao_motivo_justificativa, textarea[name*="justificativa" i]');

      if (fetchedForm) {
        // Copia todos os campos do formulário original (incluindo inputs de texto, selects e hiddens)
        // para garantir o envio dos parâmetros de contexto (data, servidor, unidade, etc)
        const fieldNamesAdded = new Set();
        fetchedForm.querySelectorAll('input, select, textarea').forEach(elem => {
          const name = elem.name;
          if (!name || fieldNamesAdded.has(name)) return;

          // Ignora campos que o modal cria com formulário próprio
          if (name.includes('marcacaoPonto.marcacao') || name.includes('motivo') || name.includes('justificativa')) {
            return;
          }

          fieldNamesAdded.add(name);
          const hiddenInput = document.createElement('input');
          hiddenInput.type = 'hidden';
          hiddenInput.name = name;

          let val = elem.value || '';
          // Se for o campo de matrícula do servidor e veio como "0", substitui pela matrícula resolvida
          if (name === 'servidorSelecionado.matricula' && (val === '0' || !val)) {
            val = getCurrentUserOrSelectedMatricula() || val;
          }

          hiddenInput.value = val;
          formWrapper.appendChild(hiddenInput);
        });
      }

      // Garante a presença do campo de data e de matrícula válida
      const resolvedMatricula = getCurrentUserOrSelectedMatricula();
      if (resolvedMatricula) {
        let matInput = formWrapper.querySelector('input[name="servidorSelecionado.matricula"]');
        if (!matInput) {
          matInput = document.createElement('input');
          matInput.type = 'hidden';
          matInput.name = 'servidorSelecionado.matricula';
          formWrapper.appendChild(matInput);
        }
        matInput.value = resolvedMatricula;
      }

      if (dateStr) {
        let dataInput = formWrapper.querySelector('input[name="espelhoPontoDia.data.asString"]');
        if (!dataInput) {
          dataInput = document.createElement('input');
          dataInput.type = 'hidden';
          dataInput.name = 'espelhoPontoDia.data.asString';
          formWrapper.appendChild(dataInput);
        }
        dataInput.value = dateStr;
      }

      let selectOptionsHTML = '';
      if (origSelectMotivo) {
        Array.from(origSelectMotivo.options).forEach(opt => {
          const isSelected = opt.selected || (opt.text && opt.text.toUpperCase().includes('ESQUECIMENTO'));
          selectOptionsHTML += `<option value="${escapeHTML(opt.value)}" ${isSelected ? 'selected' : ''}>${escapeHTML(opt.text)}</option>`;
        });
      } else {
        selectOptionsHTML = `<option value="1" selected>Esquecimento de registro(s)</option>`;
      }

      const inputName = origInputHorario ? origInputHorario.name : 'marcacaoPonto.marcacao';
      const inputValue = origInputHorario ? origInputHorario.value : '';

      // Extração da Tabela de Marcações Existentes do Dia (#listaMarcacoesPonto)
      const origTable = doc.querySelector('#listaMarcacoesPonto');
      let markingsHTML = '';

      if (origTable) {
        const rows = origTable.querySelectorAll('tbody tr, tr');
        let tableRowsHTML = '';

        rows.forEach((row) => {
          if (row.querySelector('th')) return;

          const cells = row.querySelectorAll('td');
          if (!cells || cells.length < 2) return;

          const deleteImg = cells[0].querySelector('img, a, input');
          const onclickAttr = deleteImg ? (deleteImg.getAttribute('onclick') || '') : '';

          let sqMarcacao = '';
          let strMarcacao = '';
          const match = onclickAttr.match(/formEspelhoPontoDia_chefeExcluirMarcacao\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/i);
          if (match) {
            sqMarcacao = match[1];
            strMarcacao = match[2];
          }

          const marcacaoText = cells[1] ? cells[1].innerText.trim() : '';
          const situacaoText = cells[2] ? cells[2].innerText.trim() : '';
          const respText = cells[3] ? cells[3].innerText.trim() : '';
          const dtText = cells[4] ? cells[4].innerText.trim() : '';
          const motivoText = cells[5] ? cells[5].innerText.trim() : '';
          const justificativaText = cells[6] ? cells[6].innerText.trim() : '';

          if (!marcacaoText) return;

          tableRowsHTML += `
            <tr class="je-modal-table-row">
              <td class="je-col-action">
                ${sqMarcacao ? `
                  <button type="button" class="je-btn-delete-mark" data-sq="${escapeHTML(sqMarcacao)}" data-time="${escapeHTML(strMarcacao || marcacaoText)}" title="Excluir a marcação ${escapeHTML(marcacaoText)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                ` : '<span class="je-col-empty">-</span>'}
              </td>
              <td class="je-col-time"><strong>${escapeHTML(marcacaoText)}</strong></td>
              <td class="je-col-situacao">${escapeHTML(situacaoText)}</td>
              <td class="je-col-resp">${escapeHTML(respText)}</td>
              <td class="je-col-dt">${escapeHTML(dtText)}</td>
              <td class="je-col-motivo">${escapeHTML(motivoText)}</td>
              <td class="je-col-just">${escapeHTML(justificativaText)}</td>
            </tr>
          `;
        });

        if (tableRowsHTML) {
          markingsHTML = `
            <div class="je-modal-markings-section">
              <div class="je-modal-section-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0077ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Marcações Registradas no Dia (${escapeHTML(dateStr)})</span>
              </div>
              <div class="je-modal-table-container">
                <table class="je-modal-markings-table">
                  <thead>
                    <tr>
                      <th class="je-col-action">Excluir</th>
                      <th class="je-col-time">Marcação</th>
                      <th class="je-col-situacao">Situação</th>
                      <th class="je-col-resp">Resp. Alteração</th>
                      <th class="je-col-dt">Dt. Alteração</th>
                      <th class="je-col-motivo">Motivo</th>
                      <th class="je-col-just">Justificativa</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tableRowsHTML}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
      }

      formWrapper.innerHTML += `
        <!-- Cabeçalho com Nome do Servidor e Data -->
        <div class="je-card-header">
          <div class="je-card-header-content">
            <div class="je-card-server-info">
              <span class="je-card-server-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </span>
              <span class="je-card-server-name">${escapeHTML(serverName)}</span>
            </div>
            <span class="je-card-date-badge">${escapeHTML(dateStr)}</span>
          </div>
          <button type="button" class="je-card-close-btn" id="je-card-close-x" title="Fechar (Esc)">&times;</button>
        </div>

        <div class="je-card-content-wrapper">
          <!-- Linha 1: OPERAÇÃO, HORÁRIO DA MARCAÇÃO, MOTIVO -->
          <div class="je-card-row-1">
            <div class="je-card-field-group je-field-operacao">
              <label class="je-card-label">OPERAÇÃO:</label>
              <div class="je-card-badge-operacao">${escapeHTML(spanOperacaoText)}</div>
            </div>

            <div class="je-card-field-group je-field-horario">
              <label class="je-card-label" for="marcacaoPonto_marcacao">HORÁRIO DA MARCAÇÃO:</label>
              <input type="text" id="marcacaoPonto_marcacao" name="${escapeHTML(inputName)}" class="je-card-input-time" value="${escapeHTML(inputValue)}" maxlength="5" placeholder="00:00" autocomplete="off" />
            </div>

            <div class="je-card-field-group je-field-motivo">
              <label class="je-card-label" for="je-select-motivo">MOTIVO:</label>
              <select id="je-select-motivo" name="${origSelectMotivo ? origSelectMotivo.name : 'marcacaoPonto.alteracao.motivo.codigo'}" class="je-card-select-motivo">
                ${selectOptionsHTML}
              </select>
            </div>
          </div>

          <!-- Linha 2: JUSTIFICATIVA -->
          <div class="je-card-row-2">
            <label class="je-card-label" for="je-textarea-justificativa">JUSTIFICATIVA:</label>
            <textarea id="je-textarea-justificativa" name="${origTextareaJustificativa ? origTextareaJustificativa.name : 'marcacaoPonto.alteracao.motivo.justificativa'}" class="je-card-textarea" maxlength="500"></textarea>
          </div>

          <!-- Linha 3: Contador de Caracteres -->
          <div class="je-card-row-3">
            <span class="je-card-char-max">Máx. 500 caracteres</span>
            <span class="je-card-char-rem">Caracteres restantes: <strong id="je-card-rem-val">500</strong> / 500</span>
          </div>

          <!-- Linha 4: Botões no canto inferior direito -->
          <div class="je-card-row-4">
            <button type="submit" class="je-card-btn-incluir" id="je-card-btn-submit">INCLUIR</button>
            <button type="button" class="je-card-btn-limpar" id="je-card-btn-clear">LIMPAR</button>
          </div>
        </div>

        ${markingsHTML}
      `;

      modalBody.innerHTML = '';
      modalBody.appendChild(formWrapper);

      const closeX = formWrapper.querySelector('#je-card-close-x');
      if (closeX) {
        closeX.addEventListener('click', closeModal);
      }

      const timeInput = formWrapper.querySelector('#marcacaoPonto_marcacao');
      if (timeInput) {
        applyTimeMask(timeInput);
        setTimeout(() => {
          timeInput.focus();
        }, 80);
      }

      const ta = formWrapper.querySelector('#je-textarea-justificativa');
      const remVal = formWrapper.querySelector('#je-card-rem-val');
      if (ta && remVal) {
        const updateCount = () => {
          const current = ta.value ? ta.value.length : 0;
          const remaining = Math.max(0, 500 - current);
          remVal.innerText = String(remaining);
          if (remaining < 50) {
            remVal.classList.add('je-char-warning');
          } else {
            remVal.classList.remove('je-char-warning');
          }
        };
        ta.addEventListener('input', updateCount);
        ta.addEventListener('keyup', updateCount);
        ta.addEventListener('change', updateCount);
      }

      const clearBtn = formWrapper.querySelector('#je-card-btn-clear');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          if (timeInput) timeInput.value = '';
          if (ta) ta.value = '';
          if (remVal) {
            remVal.innerText = '500';
            remVal.classList.remove('je-char-warning');
          }
          if (timeInput) timeInput.focus();
        });
      }

      // Handler para os botões de exclusão de marcação
      formWrapper.querySelectorAll('.je-btn-delete-mark').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();

          const sqMarcacao = btn.getAttribute('data-sq');
          const timeStr = btn.getAttribute('data-time');

          if (!confirm(`Tem certeza que deseja excluir a marcação de ponto: ${timeStr}?`)) {
            return;
          }

          btn.disabled = true;
          btn.style.opacity = '0.5';

          try {
            const delFormData = new FormData(formWrapper);
            delFormData.set('marcacaoPonto.sequencialMarcacao', sqMarcacao);
            delFormData.set('marcacaoPonto.marcacao', timeStr);

            const delActionUrl = '/portalservidor2/EspelhoPontoDiaAction_formEspelhoPontoDia_chefeExcluirMarcacao.action';

            const res = await fetch(delActionUrl, {
              method: 'POST',
              body: delFormData,
              headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
              }
            });

            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }

            closeModal();
            window.location.reload();

          } catch (err) {
            console.error('Erro ao excluir marcação:', err);
            alert(`Falha ao excluir marcação: ${err.message}`);
            btn.disabled = false;
            btn.style.opacity = '1';
          }
        });
      });

      formWrapper.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const submitBtn = formWrapper.querySelector('#je-card-btn-submit');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.style.opacity = '0.7';
          submitBtn.innerText = 'ENVIANDO...';
        }

        const formData = new FormData(formWrapper);

        try {
          const res = await fetch(actionUrl, {
            method: 'POST',
            body: formData,
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          });

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }

          closeModal();

          // Recarrega a página para exibir os dados atualizados vindos do banco de dados
          window.location.reload();

        } catch (err) {
          console.error('Erro ao salvar ajuste de ponto:', err);
          alert(`Falha ao registrar ajuste: ${err.message}`);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.innerText = 'INCLUIR';
          }
        }
      });

    } catch (err) {
      console.error('Erro ao carregar modal de ajuste:', err);
      modalBody.innerHTML = `
        <div class="je-modal-alert je-modal-alert-error">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <strong>Falha na Comunicação</strong>
            <p>Não foi possível carregar a tela de ajuste (${escapeHTML(err.message)}). Tente novamente em instantes.</p>
          </div>
        </div>
      `;
    }
  }

  function injectAdjustmentButtons(table) {
    if (!table) return;

    // Só injeta o botão de ajuste quando o ponto exibido é de outra pessoa.
    // Se não for o caso, remove qualquer botão já injetado e sai.
    if (!canAdjustCurrentTimesheet()) {
      table.querySelectorAll('.je-btn-ajustar-ponto').forEach((b) => b.remove());
      return;
    }

    const rows = table.querySelectorAll('tr');

    rows.forEach((tr) => {
      if (tr.querySelector('th')) return;
      if (tr.querySelector('.je-btn-ajustar-ponto')) return;

      const dateCell = tr.querySelector('td.h01');
      if (!dateCell) return;

      const dateText = dateCell.innerText.trim();
      if (!dateText.match(/^\d{2}\/\d{4}$/) && !dateText.match(/^\d{2}\/\d{2}\/\d{4}$/)) return;

      const isPendingRow = tr.classList.contains('je-row-ajuste-pendente') || tr.innerText.includes('Falta') || tr.innerText.includes('AJUSTE') || tr.innerText.includes('INCONSIST');
      
      // Coluna de comandos (td.h17 - Comandos / Relógio de Horas Extras)
      const commandCell = tr.querySelector('td.h17') || tr.querySelector('td.h10') || tr.querySelector('td.h09') || tr.querySelector('td:last-child') || dateCell;

      if (commandCell) {
        commandCell.style.setProperty('text-align', 'left', 'important');
        Array.from(commandCell.childNodes).forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '-') {
            node.textContent = '';
          }
        });
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `je-btn-ajustar-ponto ${isPendingRow ? 'je-btn-ajustar-pendente' : ''}`;
      btn.title = `⚡ Ajustar Ponto para ${dateText}`;
      btn.setAttribute('aria-label', `⚡ Ajustar Ponto para ${dateText}`);

      btn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      `;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openModalForDate(dateText);
      });

      // Se houver botão de relógio na célula ou linha, insere IMEDIATAMENTE À ESQUERDA dele
      const clockBtn = tr.querySelector('.je-overtime-clock-btn, img[src*="iconClock"], img[src*="Clock"], img[src*="relogio"], img[title*="Autorização"], img[title*="Hora Excedente"]');
      if (clockBtn) {
        const targetTd = clockBtn.closest('td');
        if (targetTd) targetTd.style.setProperty('text-align', 'left', 'important');
        clockBtn.parentNode.insertBefore(btn, clockBtn);
      } else {
        commandCell.appendChild(document.createTextNode(' '));
        commandCell.appendChild(btn);
      }
    });
  }

  function init() {
    createModalDOM();
    const table = document.getElementById('tblEspelhoPontoMesCorrente');
    if (table) {
      injectAdjustmentButtons(table);
    }
  }

  return {
    init,
    openModalForDate,
    injectAdjustmentButtons
  };
})();
