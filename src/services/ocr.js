const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
const TIPOS_LOGRADOURO = [
  'rua',
  'r\\.',
  'r',
  'avenida',
  'av\\.',
  'av',
  'alameda',
  'travessa',
  'estrada',
  'rodovia',
  'praca',
  'praça',
  'largo',
  'viela',
  'condominio',
  'condomínio',
  'residencial',
];

let tesseractPromise;

const normalizarEspacos = (value) => String(value || '')
  .normalize('NFKC')
  .replace(/[^\S\r\n]+/g, ' ')
  .replace(/[|•·]/g, ' ')
  .trim();

const removerAcentos = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const carregarTesseract = () => {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (!tesseractPromise) {
    tesseractPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = TESSERACT_CDN;
      script.async = true;
      script.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error('Tesseract.js nao carregou corretamente.')));
      script.onerror = () => reject(new Error('Nao foi possivel carregar o OCR. Verifique a conexao e tente novamente.'));
      document.head.append(script);
    });
  }
  return tesseractPromise;
};

export const validarEndereco = (entrada = {}) => {
  const texto = normalizarEspacos(entrada.enderecoCompleto || entrada.texto || entrada.raw || '');
  const semAcento = removerAcentos(texto).toLowerCase();
  const cep = /\b\d{5}-?\d{3}\b/.test(texto);
  const logradouro = new RegExp(`\\b(${TIPOS_LOGRADOURO.join('|')})\\b`, 'i').test(semAcento);
  const numero = /(?:,\s*|\s+n[ºo]?\s*|\s+)(\d{1,6}[a-z]?|s\/?n)\b/i.test(texto);

  if (texto.length < 8) return { valido: false, motivo: 'texto muito curto', endereco: entrada };
  if (/^\d{1,2}:\d{2}/.test(texto) || /\b\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\b/.test(texto)) return { valido: false, motivo: 'horario detectado', endereco: entrada };
  if (!logradouro) return { valido: false, motivo: 'sem logradouro', endereco: entrada };
  if (!numero && !cep) return { valido: false, motivo: 'sem numero ou CEP', endereco: entrada };

  return { valido: true, motivo: '', endereco: { ...entrada, enderecoCompleto: texto } };
};

const linhaInutil = (linha) => {
  const value = removerAcentos(linha).toLowerCase();
  if (!value) return true;
  if (/^\d+$/.test(value)) return true;
  if (/^entrega\s+\d+/.test(value)) return true;
  if (/^parada\s+\d+/.test(value)) return true;
  if (/^stop\s+\d+/.test(value)) return true;
  if (/^\d{1,2}:\d{2}/.test(value)) return true;
  if (/\b\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\b/.test(value)) return true;
  return [
    'amazon flex',
    'amazon',
    'flex',
    'itinerario',
    'itinerary',
    'paradas',
    'parada',
    'entregas',
    'entrega',
    'pacotes',
    'pacote',
    'navegar',
    'iniciar',
    'concluir',
    'finalizar',
    'rota',
    'codigo',
    'scanner',
    'coletar',
    'retirada',
    'proxima',
    'hoje',
    'manha',
    'tarde',
  ].some((token) => value === token || value.includes(`${token}:`));
};

const parseEndereco = (linha, index) => {
  const texto = normalizarEspacos(linha)
    .replace(/\b(Brasil|Brazil)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();
  const cep = texto.match(/\b\d{5}-?\d{3}\b/)?.[0] || '';
  const numeroMatch = texto.match(/(?:,\s*|\s+n[ºo]?\s*|\s+)(\d{1,6}[a-z]?|s\/?n)\b/i);
  const numero = numeroMatch?.[1] || '';
  const complemento = texto.match(/\b(apto|apartamento|bloco|casa|fundos|sala|torre|lote|quadra|condominio|condomínio)\s+[a-z0-9 -]+/i)?.[0] || '';
  const partes = texto.split(/\s+-\s+|,\s*/).map((p) => p.trim()).filter(Boolean);
  const bairro = partes.length >= 3 ? partes[partes.length - 2] : '';

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${index}`,
    ordem: index + 1,
    enderecoCompleto: texto,
    rua: partes[0] || texto,
    numero,
    cep,
    complemento,
    bairro,
    origem: 'amazon-flex-print',
  };
};

const pareceEnderecoCompleto = (linha) => {
  const texto = normalizarEspacos(linha);
  const semAcento = removerAcentos(texto).toLowerCase();
  const logradouro = new RegExp(`\\b(${TIPOS_LOGRADOURO.join('|')})\\b`, 'i').test(semAcento);
  const cep = /\b\d{5}-?\d{3}\b/.test(texto);
  const numero = /(?:,\s*|\s+n[ºo]?\s*|\s+)(\d{1,6}[a-z]?|s\/?n)\b/i.test(texto);
  return logradouro && (numero || cep);
};

const montarCandidatos = (linhas) => {
  const candidatos = [];
  linhas.forEach((linha, index) => {
    if (linhaInutil(linha)) return;
    candidatos.push(linha);
    if (pareceEnderecoCompleto(linha)) return;
    const proxima = linhas[index + 1];
    if (proxima && !linhaInutil(proxima)) candidatos.push(`${linha}, ${proxima}`);
  });
  return candidatos;
};

export const extrairEnderecos = (texto) => {
  const linhas = normalizarEspacos(texto)
    .split(/\r?\n/)
    .map((linha) => normalizarEspacos(linha))
    .filter(Boolean);
  const vistos = new Set();
  const enderecos = [];
  const ignorados = [];
  const duplicados = [];
  const indicePorChave = new Map();

  montarCandidatos(linhas).forEach((candidato) => {
    const endereco = parseEndereco(candidato, enderecos.length);
    const validacao = validarEndereco(endereco);
    const chaveBase = endereco.rua && endereco.numero
      ? `${endereco.rua}-${endereco.numero}`
      : endereco.enderecoCompleto;
    const chave = removerAcentos(chaveBase).toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!validacao.valido) {
      if (!linhaInutil(candidato)) ignorados.push({ texto: candidato, motivo: validacao.motivo });
      return;
    }
    if (vistos.has(chave)) {
      const existenteIndex = indicePorChave.get(chave);
      const existente = enderecos[existenteIndex];
      const novo = { ...validacao.endereco, ordem: existente.ordem };
      const novoMaisCompleto = (!existente.cep && novo.cep) || novo.enderecoCompleto.length > existente.enderecoCompleto.length + 12;
      if (novoMaisCompleto) enderecos[existenteIndex] = novo;
      else duplicados.push({ texto: endereco.enderecoCompleto, motivo: 'duplicado' });
      return;
    }
    vistos.add(chave);
    indicePorChave.set(chave, enderecos.length);
    enderecos.push({ ...validacao.endereco, ordem: enderecos.length + 1 });
  });

  return { enderecos, ignorados, duplicados };
};

export const extrairTextoImagem = async (file, onProgress = () => {}) => {
  if (!file || !['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Use apenas imagens PNG ou JPG.');
  const Tesseract = await carregarTesseract();
  const result = await Tesseract.recognize(file, 'por+eng', {
    logger: (message) => {
      if (message.status === 'recognizing text') onProgress(Math.round((message.progress || 0) * 100), message);
    },
  });
  return result?.data?.text || '';
};
