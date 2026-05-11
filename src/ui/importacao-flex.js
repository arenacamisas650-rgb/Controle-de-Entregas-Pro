import { adicionarEnderecosFlex, adicionarTextoFlex, criarResultadoImportacaoFlex } from '../services/importacao-flex.js';
import { $, clear, el, setText } from './dom.js';

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

const renderResultado = () => {
  const lista = $('#flexEnderecosEncontrados');
  const ignorados = $('#flexEnderecosIgnorados');
  clear(lista);
  clear(ignorados);

  const enderecos = resultadoAtual.enderecos || [];
  const invalidos = resultadoAtual.ignorados || [];
  const duplicados = resultadoAtual.duplicados || [];

  setText('flexQtdEncontrados', `${enderecos.length}`);
  setText('flexQtdInvalidos', `${invalidos.length}`);
  setText('flexQtdDuplicados', `${duplicados.length}`);
  setText('flexQtdArquivos', `${resultadoAtual.totalArquivos || selectedFiles.length}`);
  setVisible('flexResultadoBox', Boolean(enderecos.length || invalidos.length || duplicados.length));
  $('#btnConfirmarFlex')?.toggleAttribute('disabled', !enderecos.length);

  enderecos.forEach((endereco) => {
    lista.append(el('div', { className: 'address-item valid' }, [
      el('div', { className: 'address-order', text: `${endereco.ordem}` }),
      el('div', {}, [
        el('div', { className: 'address-main', text: endereco.enderecoCompleto }),
        el('div', { className: 'address-sub', text: [endereco.bairro, endereco.cep, endereco.origem, endereco.arquivo].filter(Boolean).join(' - ') }),
      ]),
    ]));
  });

  [...duplicados.map((item) => ({ ...item, motivo: 'duplicado ignorado' })), ...invalidos]
    .slice(0, 20)
    .forEach((item) => {
      ignorados.append(el('div', { className: 'address-item invalid' }, [
        el('div', { className: 'address-main', text: item.texto || item.enderecoCompleto || 'Item ignorado' }),
        el('div', { className: 'address-sub', text: [item.motivo, item.origem, item.arquivo].filter(Boolean).join(' - ') }),
      ]));
    });
};

const resetarModal = () => {
  selectedFiles = [];
  resultadoAtual = criarResultadoImportacaoFlex();
  if (pararCaptura) pararCaptura();
  pararCaptura = null;
  limparPreviews();
  clear($('#flexPreviewList'));
  clear($('#flexEnderecosEncontrados'));
  clear($('#flexEnderecosIgnorados'));
  setText('flexProgressText', 'Aguardando prints');
  setText('flexClipboardStatus', 'Captura parada');
  setText('flexQtdEncontrados', '0');
  setText('flexQtdInvalidos', '0');
  setText('flexQtdDuplicados', '0');
  setText('flexQtdArquivos', '0');
  const bar = $('#flexProgressBar');
  if (bar) bar.style.width = '0%';
  const manual = $('#flexManualText');
  if (manual) manual.value = '';
  setVisible('flexResultadoBox', false);
  $('#btnProcessarFlex')?.toggleAttribute('disabled', true);
  $('#btnConfirmarFlex')?.toggleAttribute('disabled', true);
  $('#btnPararClipboard')?.toggleAttribute('disabled', true);
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

export const inicializarImportacaoFlex = ({
  processarArquivos,
  detectarClipboard,
  iniciarClipboard,
  confirmarImportacao,
  onErro,
}) => {
  document.querySelectorAll('[data-flex-mode]').forEach((button) => {
    button.addEventListener('click', () => setModo(button.dataset.flexMode));
  });

  $('#flexPrintInput')?.addEventListener('change', (event) => {
    limparPreviews();
    selectedFiles = [...(event.target.files || [])];
    renderPreviews();
    $('#btnProcessarFlex')?.toggleAttribute('disabled', !selectedFiles.length);
    setText('flexProgressText', selectedFiles.length ? `${selectedFiles.length} print(s) selecionado(s)` : 'Aguardando prints');
  });

  $('#btnSelecionarFlex')?.addEventListener('click', () => $('#flexPrintInput')?.click());
  $('#btnFecharFlex')?.addEventListener('click', fecharImportacaoFlex);
  $('#btnCancelarFlex')?.addEventListener('click', fecharImportacaoFlex);

  $('#btnProcessarFlex')?.addEventListener('click', async () => {
    try {
      $('#btnProcessarFlex').disabled = true;
      const resultado = await processarArquivos(selectedFiles, ({ progresso, nome, status }) => {
        const bar = $('#flexProgressBar');
        if (bar) bar.style.width = `${progresso}%`;
        setText('flexProgressText', status === 'concluido' ? 'OCR concluido' : `Processando ${nome} - ${progresso}%`);
      });
      adicionarEnderecosFlex(resultadoAtual, resultado.enderecos, 'amazon-flex-print');
      resultado.ignorados.forEach((item) => resultadoAtual.ignorados.push(item));
      resultado.duplicados.forEach((item) => resultadoAtual.duplicados.push(item));
      resultadoAtual.totalArquivos += resultado.totalArquivos || selectedFiles.length;
      renderResultado();
    } catch (error) {
      onErro?.(error);
    } finally {
      $('#btnProcessarFlex').disabled = !selectedFiles.length;
    }
  });

  $('#btnLerClipboard')?.addEventListener('click', async () => {
    try {
      const resultado = await detectarClipboard();
      adicionarEnderecosFlex(resultadoAtual, resultado.enderecos, 'amazon-flex-clipboard');
      resultado.ignorados.forEach((item) => resultadoAtual.ignorados.push({ ...item, origem: 'amazon-flex-clipboard' }));
      renderResultado();
      setText('flexClipboardStatus', resultado.enderecos.length ? 'Endereço capturado do clipboard' : 'Nenhum endereço válido no clipboard');
    } catch (error) {
      onErro?.(error);
    }
  });

  $('#btnIniciarClipboard')?.addEventListener('click', () => {
    try {
      if (pararCaptura) pararCaptura();
      setText('flexClipboardStatus', 'Captura ativa. Copie endereços na Amazon Flex.');
      $('#btnPararClipboard')?.toggleAttribute('disabled', false);
      pararCaptura = iniciarClipboard({
        onEndereco: (endereco) => {
          adicionarEnderecosFlex(resultadoAtual, [endereco], 'amazon-flex-clipboard');
          renderResultado();
          setText('flexClipboardStatus', 'Endereço detectado e adicionado.');
        },
        onIgnorado: (item) => {
          resultadoAtual.ignorados.push({ ...item, origem: 'amazon-flex-clipboard' });
          renderResultado();
        },
        onErro: (error) => {
          setText('flexClipboardStatus', 'Captura parada');
          $('#btnPararClipboard')?.toggleAttribute('disabled', true);
          onErro?.(error);
        },
      });
    } catch (error) {
      onErro?.(error);
    }
  });

  $('#btnPararClipboard')?.addEventListener('click', () => {
    if (pararCaptura) pararCaptura();
    pararCaptura = null;
    setText('flexClipboardStatus', 'Captura parada');
    $('#btnPararClipboard')?.toggleAttribute('disabled', true);
  });

  $('#btnImportarManualFlex')?.addEventListener('click', () => {
    const texto = readValue('flexManualText');
    if (!texto.trim()) {
      onErro?.(new Error('Cole uma lista de endereços antes de importar.'));
      return;
    }
    adicionarTextoFlex(resultadoAtual, texto, 'amazon-flex-manual');
    renderResultado();
  });

  $('#btnLimparFlex')?.addEventListener('click', () => {
    resultadoAtual = criarResultadoImportacaoFlex();
    renderResultado();
  });

  $('#btnConfirmarFlex')?.addEventListener('click', async () => {
    try {
      $('#btnConfirmarFlex').disabled = true;
      await confirmarImportacao({
        enderecos: resultadoAtual.enderecos || [],
        data: readValue('flexData'),
        empresa: readValue('flexEmpresa') || 'Amazon Flex',
        valor: readValue('flexValor'),
        km: readValue('flexKm'),
        duracao: readValue('flexDuracao'),
      });
      fecharImportacaoFlex();
    } catch (error) {
      onErro?.(error);
      $('#btnConfirmarFlex').disabled = !(resultadoAtual.enderecos || []).length;
    }
  });
};
