import { criarResultadoImportacaoFlex, adicionarTextoFlexManual, montarRotaFlex } from '../services/importacao-flex.js';
import { gerarCsvCircuit, copiarParaClipboard } from '../services/exportacao-circuit.js';
import { calcularScoreMedio } from '../services/debug-ocr.js';
import { $, clear, el, setText, showToast } from './dom.js';

let selectedFiles = [];
let resultadoAtual = criarResultadoImportacaoFlex();
let urlsPreview = [];
let pararCaptura = null;

const todayISO = () => new Date().toISOString().slice(0, 10);
const readValue = (id) => document.getElementById(id)?.value ?? '';
const setVisible = (id, visible) => {
  const node = document.getElementById(id);
  if (node) node.style.display = visible ? '' : 'none';
};

const setModo = (modo) => {
  document.querySelectorAll('[data-flex-mode-panel]').forEach((panel) => {
    panel.style.display = panel.dataset.flexModePanel === modo ? '' : 'none';
  });
  document.querySelectorAll('[data-flex-mode]').forEach((button) => {
    button.classList.toggle('active', button.dataset.flexMode === modo);
  });
};

const limparPreviews = () => {
  urlsPreview.forEach((url) => URL.revokeObjectURL(url));
  urlsPreview = [];
};

const renderPreviews = () => {
  const container = $('#flexPreviewList');
  if (!container) return;
  clear(container);
  selectedFiles.forEach((file) => {
    const url = URL.createObjectURL(file);
    urlsPreview.push(url);
    container.append(el('div', { className: 'print-preview-item' }, [
      el('img', { src: url, alt: file.name }),
      el('div', {}, [
        el('div', { className: 'print-preview-name', text: file.name }),
        el('div', { className: 'print-preview-size', text: `${(file.size / 1024 / 1024).toFixed(2)} MB` }),
      ]),
    ]));
  });
};

const editarEndereco = (index) => {
  const endereco = resultadoAtual.enderecos[index];
  if (!endereco) return;
  const novoEnd = prompt('Edite o endereço completo:', endereco.enderecoCompleto);
  if (novoEnd !== null && novoEnd.trim() !== '') {
    resultadoAtual.enderecos[index].enderecoCompleto = novoEnd.trim();
    // Força re-render
    renderResultado();
  }
};

const renderResultado = () => {
  const lista = $('#flexEnderecosEncontrados');
  const ignorados = $('#flexEnderecosIgnorados');
  if (!lista || !ignorados) return;
  
  clear(lista);
  clear(ignorados);

  const enderecos = resultadoAtual.enderecos || [];
  const invalidos = resultadoAtual.ignorados || [];
  const duplicados = resultadoAtual.duplicados || [];

  setText('flexQtdEncontrados', `${enderecos.length}`);
  setText('flexQtdInvalidos', `${invalidos.length}`);
  setText('flexQtdDuplicados', `${duplicados.length}`);
  setText('flexQtdArquivos', `${resultadoAtual.totalArquivos || selectedFiles.length}`);
  
  const avgScore = calcularScoreMedio(enderecos);
  setText('flexScoreMedio', avgScore > 0 ? `${avgScore}%` : '-');

  setVisible('flexResultadoBox', Boolean(enderecos.length || invalidos.length || duplicados.length));
  
  const btnConfirmar = $('#btnConfirmarFlex');
  if (btnConfirmar) btnConfirmar.disabled = enderecos.length === 0;

  // Render endereços válidos (modo debug visual opcional com scores)
  enderecos.forEach((endereco, index) => {
    const isBaixaConfianca = endereco.score && endereco.score < 70;
    const classeExtra = isBaixaConfianca ? 'warning' : 'valid';
    
    const divMain = el('div', { className: `address-item ${classeExtra}` }, [
      el('div', { className: 'address-order', text: `${index + 1}` }),
      el('div', { style: 'flex: 1' }, [
        el('div', { className: 'address-main', text: endereco.enderecoCompleto }),
        el('div', { className: 'address-sub', text: [
          endereco.bairro, 
          endereco.cep, 
          endereco.arquivo, 
          endereco.score ? `Score: ${endereco.score}` : ''
        ].filter(Boolean).join(' - ') }),
      ]),
      el('button', { className: 'btn-sm btn-secondary', text: '✏️', title: 'Revisar / Editar' })
    ]);
    
    // Binding do editar
    const editBtn = divMain.querySelector('button');
    if (editBtn) editBtn.addEventListener('click', () => editarEndereco(index));
    
    lista.append(divMain);
  });

  // Render Ignorados
  [...duplicados.map((item) => ({ ...item, motivoDescarte: item.motivoDescarte || 'Duplicado' })), ...invalidos]
    .slice(0, 30) // Mostra no max 30 ignorados para n travar
    .forEach((item) => {
      ignorados.append(el('div', { className: 'address-item invalid' }, [
        el('div', { className: 'address-main', text: item.textoBruto || item.enderecoCompleto || 'Item ignorado' }),
        el('div', { className: 'address-sub', text: [item.motivoDescarte, item.arquivo].filter(Boolean).join(' - ') }),
      ]));
    });
};

const resetarModal = () => {
  selectedFiles = [];
  resultadoAtual = criarResultadoImportacaoFlex();
  if (pararCaptura) pararCaptura();
  pararCaptura = null;
  limparPreviews();
  renderPreviews();
  renderResultado();
  setText('flexProgressText', 'Aguardando prints');
  setText('flexClipboardStatus', 'Captura parada');
  const bar = $('#flexProgressBar');
  if (bar) bar.style.width = '0%';
  const manual = $('#flexManualText');
  if (manual) manual.value = '';
  setVisible('flexResultadoBox', false);
  const btnProcessar = $('#btnProcessarFlex');
  if (btnProcessar) btnProcessar.disabled = true;
};

export const abrirImportacaoFlex = () => {
  resetarModal();
  setModo('prints');
  const data = $('#flexData');
  if (data && !data.value) data.value = todayISO();
  const empresa = $('#flexEmpresa');
  if (empresa && !empresa.value) empresa.value = 'Amazon Flex';
  $('#modalImportacaoFlex')?.classList.add('open');
};

export const fecharImportacaoFlex = () => {
  if (pararCaptura) pararCaptura();
  pararCaptura = null;
  $('#modalImportacaoFlex')?.classList.remove('open');
  limparPreviews();
};

let eventBinded = false; // Previne duplicidade de eventos se inicializar multiplas vezes

export const inicializarImportacaoFlex = ({
  processarArquivos,
  detectarClipboard,
  iniciarClipboard,
  confirmarImportacao,
  onErro,
}) => {
  if (eventBinded) return;
  eventBinded = true;

  document.querySelectorAll('[data-flex-mode]').forEach((button) => {
    button.addEventListener('click', () => setModo(button.dataset.flexMode));
  });

  const printInput = $('#flexPrintInput');
  if (printInput) {
    printInput.addEventListener('change', (event) => {
      limparPreviews();
      selectedFiles = [...(event.target.files || [])];
      renderPreviews();
      const btnProcessar = $('#btnProcessarFlex');
      if (btnProcessar) btnProcessar.disabled = !selectedFiles.length;
      setText('flexProgressText', selectedFiles.length ? `${selectedFiles.length} print(s) selecionado(s)` : 'Aguardando prints');
    });
  }

  $('#btnSelecionarFlex')?.addEventListener('click', () => $('#flexPrintInput')?.click());
  $('#btnFecharFlex')?.addEventListener('click', fecharImportacaoFlex);
  $('#btnCancelarFlex')?.addEventListener('click', fecharImportacaoFlex);

  // Botão Processar Prints (OCR)
  $('#btnProcessarFlex')?.addEventListener('click', async () => {
    const btnProcessar = $('#btnProcessarFlex');
    if (!btnProcessar || btnProcessar.disabled) return;
    
    try {
      btnProcessar.disabled = true;
      const progressContainer = $('#flexProgressContainer');
      if (progressContainer) progressContainer.style.display = 'block';

      resultadoAtual = await processarArquivos(selectedFiles, ({ progresso, nome, status }) => {
        const bar = $('#flexProgressBar');
        if (bar) bar.style.width = `${progresso}%`;
        const dict = {
          'pre-processando': 'Preparando Imagem',
          'iniciando-ocr': 'Iniciando Motor OCR',
          'ocr': 'Extraindo Texto',
          'parsing': 'Analisando Endereços',
          'concluido': 'Concluído'
        };
        setText('flexProgressText', status === 'concluido' ? 'OCR concluido' : `${dict[status] || status} [${progresso}%] - ${nome}`);
      });
      
      renderResultado();
    } catch (error) {
      onErro?.(error);
    } finally {
      if (btnProcessar) btnProcessar.disabled = !selectedFiles.length;
    }
  });

  // Copiar Circuit Clipboard
  $('#btnCopiarFlex')?.addEventListener('click', async () => {
    try {
      const qtd = await copiarParaClipboard(resultadoAtual.enderecos);
      showToast(`✅ ${qtd} endereços copiados para a área de transferência!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Exportar Circuit CSV
  $('#btnExportarCsvFlex')?.addEventListener('click', () => {
    try {
      const qtd = gerarCsvCircuit(resultadoAtual.enderecos);
      showToast(`✅ ${qtd} endereços exportados para o Circuit Route Planner!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Clipboard Detection Nativo
  $('#btnLerClipboard')?.addEventListener('click', async () => {
    try {
      const resultado = await detectarClipboard();
      if (!resultado.enderecos.length) throw new Error('Nenhum endereço válido no clipboard');
      // Mix local result 
      resultadoAtual.enderecos.push(...resultado.enderecos);
      renderResultado();
      setText('flexClipboardStatus', 'Endereço capturado!');
    } catch (error) {
      onErro?.(error);
    }
  });

  // Manual Import
  $('#btnImportarManualFlex')?.addEventListener('click', () => {
    const texto = readValue('flexManualText');
    if (!texto.trim()) {
      onErro?.(new Error('Cole uma lista de endereços antes de importar.'));
      return;
    }
    resultadoAtual = adicionarTextoFlexManual(resultadoAtual, texto);
    renderResultado();
  });

  $('#btnLimparFlex')?.addEventListener('click', () => {
    resetarModal();
  });

  // Salvar no App
  $('#btnConfirmarFlex')?.addEventListener('click', async (e) => {
    const btnConfirmar = e.currentTarget;
    if (btnConfirmar.disabled) return;
    
    try {
      btnConfirmar.disabled = true;
      await confirmarImportacao({
        enderecos: resultadoAtual.enderecos || [],
        data: readValue('flexData'),
        empresa: readValue('flexEmpresa') || 'Amazon Flex',
        valor: readValue('flexValor'),
        km: readValue('flexKm'),
        duracao: readValue('flexDuracao'),
      });
      // Fechamento da janela é comandado pela prop ou aqui
      fecharImportacaoFlex();
    } catch (error) {
      onErro?.(error);
    } finally {
      btnConfirmar.disabled = false;
    }
  });
};
