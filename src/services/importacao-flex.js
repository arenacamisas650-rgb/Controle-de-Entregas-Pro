import { extrairEnderecos, extrairTextoImagem } from './ocr.js';

const tiposPermitidos = new Set(['image/png', 'image/jpeg']);

export const criarResultadoImportacaoFlex = () => ({
  enderecos: [],
  ignorados: [],
  duplicados: [],
  textos: [],
  totalArquivos: 0,
  invalidos: 0,
});

export const chaveEnderecoFlex = (endereco) => String(
  endereco?.rua && endereco?.numero
    ? `${endereco.rua}-${endereco.numero}-${endereco.cep || ''}`
    : endereco?.enderecoCompleto || ''
).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

export const adicionarEnderecosFlex = (resultado, enderecos = [], origem = '') => {
  const destino = resultado || criarResultadoImportacaoFlex();
  const existentes = new Set(destino.enderecos.map(chaveEnderecoFlex));

  enderecos.forEach((endereco) => {
    const chave = chaveEnderecoFlex(endereco);
    if (!chave) return;
    if (existentes.has(chave)) {
      destino.duplicados.push({ texto: endereco.enderecoCompleto, origem: origem || endereco.origem || 'importacao' });
      return;
    }
    existentes.add(chave);
    destino.enderecos.push({
      ...endereco,
      origem: origem || endereco.origem || 'amazon-flex',
      ordem: destino.enderecos.length + 1,
    });
  });

  return destino;
};

export const adicionarTextoFlex = (resultado, texto, origem = 'manual') => {
  const destino = resultado || criarResultadoImportacaoFlex();
  const extraido = extrairEnderecos(texto);
  adicionarEnderecosFlex(destino, extraido.enderecos, origem);
  extraido.ignorados.forEach((item) => destino.ignorados.push({ ...item, origem }));
  (extraido.duplicados || []).forEach((item) => destino.duplicados.push({ ...item, origem }));
  destino.textos.push({ origem, texto });
  destino.invalidos = destino.ignorados.length;
  return destino;
};

export const validarArquivoPrint = (file) => {
  if (!file) throw new Error('Arquivo invalido.');
  if (!tiposPermitidos.has(file.type)) throw new Error(`Formato nao suportado: ${file.name}`);
  if (file.size > 12 * 1024 * 1024) throw new Error(`Imagem muito grande: ${file.name}`);
  return file;
};

export const processarPrintsFlex = async (files, onProgress = () => {}) => {
  const imagens = [...files].map(validarArquivoPrint);
  const total = imagens.length;
  const resultadoFinal = criarResultadoImportacaoFlex();

  if (!total) throw new Error('Selecione pelo menos um print.');

  for (let index = 0; index < imagens.length; index += 1) {
    const file = imagens[index];
    onProgress({ arquivoAtual: index + 1, total, progresso: Math.round((index / total) * 100), nome: file.name, status: 'ocr' });
    const texto = await extrairTextoImagem(file, (ocrProgress) => {
      const base = (index / total) * 100;
      const slice = ocrProgress / total;
      onProgress({ arquivoAtual: index + 1, total, progresso: Math.min(99, Math.round(base + slice)), nome: file.name, status: 'ocr' });
    });
    resultadoFinal.textos.push({ arquivo: file.name, texto });
    const resultado = extrairEnderecos(texto);
    adicionarEnderecosFlex(resultadoFinal, resultado.enderecos.map((endereco) => ({ ...endereco, arquivo: file.name })), 'amazon-flex-print');
    resultado.ignorados.forEach((item) => resultadoFinal.ignorados.push({ ...item, arquivo: file.name, origem: 'amazon-flex-print' }));
    (resultado.duplicados || []).forEach((item) => resultadoFinal.duplicados.push({ ...item, arquivo: file.name, origem: 'amazon-flex-print' }));

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  onProgress({ arquivoAtual: total, total, progresso: 100, nome: '', status: 'concluido' });
  resultadoFinal.totalArquivos = total;
  resultadoFinal.invalidos = resultadoFinal.ignorados.length;
  return resultadoFinal;
};

export const montarRotaFlex = ({
  enderecos,
  data,
  valor,
  km,
  duracao,
  empresa = 'Amazon Flex',
  consumoVeiculo,
  precoCombustivel,
  ajudante = 0,
  outros = 0,
} = {}) => {
  const paradas = Array.isArray(enderecos) ? enderecos : [];
  if (!paradas.length) throw new Error('Nenhum endereco valido para importar.');
  return {
    data,
    empresa,
    valor,
    km,
    duracao,
    qtdEntregas: paradas.length,
    consumoVeiculo,
    precoCombustivel,
    ajudante,
    outros,
    origemImportacao: 'amazon-flex-print',
    paradas,
  };
};
