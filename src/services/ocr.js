import { extrairEnderecosInteligente } from './parser-endereco.js';

const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
let tesseractWorker = null;

// Carrega a biblioteca Tesseract injetando o script
const carregarTesseract = () => {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TESSERACT_CDN;
    script.async = true;
    script.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error('Tesseract.js nao carregou corretamente.')));
    script.onerror = () => reject(new Error('Erro ao carregar OCR da nuvem.'));
    document.head.append(script);
  });
};

// Inicializa o Worker do Tesseract (se já existir, retorna o atual)
const getTesseractWorker = async () => {
  if (tesseractWorker) return tesseractWorker;
  const Tesseract = await carregarTesseract();
  console.log('[OCR] Criando novo Worker do Tesseract...');
  tesseractWorker = await Tesseract.createWorker('por+eng');
  return tesseractWorker;
};

// Limpa o Worker da memória
export const finalizarTesseractWorker = async () => {
  if (tesseractWorker) {
    console.log('[OCR] Finalizando Worker para liberar memória...');
    await tesseractWorker.terminate();
    tesseractWorker = null;
  }
};

// Transforma arquivo em Imagem HTML
const carregarImagemElemento = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ img, url });
    };
    img.onerror = () => reject(new Error('Erro ao decodificar imagem para pré-processamento.'));
    img.src = url;
  });
};

// Aplica Grayscale, Contraste e Binarização via Canvas (Obrigatório para precisão OCR)
const preprocessarImagem = async (file) => {
  console.time('[OCR] Pre-processamento Canvas');
  const { img, url } = await carregarImagemElemento(file);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // Upscale suave (2x melhora detecção de textos miudos)
  const scale = 2;
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Converter para tons de cinza e aplicar limite de contraste (Binarização suave)
  const contraste = 50; // -255 a 255
  const fator = (259 * (contraste + 255)) / (255 * (259 - contraste));
  
  for (let i = 0; i < data.length; i += 4) {
    // Grayscale: 0.299*R + 0.587*G + 0.114*B
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    
    // Contraste
    let valor = fator * (gray - 128) + 128;
    valor = Math.max(0, Math.min(255, valor));
    
    // Binarização leve (remover cinzas muito claros que viram ruído)
    if (valor > 200) valor = 255;
    
    data[i] = valor;     // R
    data[i + 1] = valor; // G
    data[i + 2] = valor; // B
  }
  
  ctx.putImageData(imageData, 0, 0);
  console.timeEnd('[OCR] Pre-processamento Canvas');
  
  // Converte de volta para File
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(url);
      resolve(new File([blob], 'preprocessed.png', { type: 'image/png' }));
    }, 'image/png');
  });
};

// Função principal exposta
export const extrairTextoImagem = async (file, onProgress = () => {}) => {
  if (!file || !['image/png', 'image/jpeg'].includes(file.type)) {
    throw new Error('Use apenas imagens PNG ou JPG.');
  }

  try {
    onProgress(0, { status: 'pre-processando' });
    const processedFile = await preprocessarImagem(file);
    
    onProgress(10, { status: 'iniciando-ocr' });
    const worker = await getTesseractWorker();
    
    console.time(`[OCR] Extraindo texto de ${file.name}`);
    const result = await worker.recognize(processedFile, {
      logger: (message) => {
        if (message.status === 'recognizing text') {
          // Normalizamos o progresso do Tesseract (0 a 1) para 10% a 100% da etapa total
          const progressReal = 10 + Math.round((message.progress || 0) * 90);
          onProgress(progressReal, message);
        }
      },
    });
    console.timeEnd(`[OCR] Extraindo texto de ${file.name}`);
    
    return result?.data?.text || '';
  } catch (error) {
    console.error('[OCR] Falha ao processar imagem:', error);
    throw error;
  }
};

// Wrapper auxiliar que já chama o parser inteligente
export const processarImagemUnica = async (file, index, total, onProgress) => {
  const fileLogName = file.name || `arquivo_${index}`;
  console.group(`[IMPORT] Processando ${fileLogName} (${index}/${total})`);
  
  onProgress({ arquivoAtual: index, total, progresso: 0, nome: file.name, status: 'iniciando' });
  
  const textoBruto = await extrairTextoImagem(file, (progressoNumber, message) => {
    onProgress({ 
      arquivoAtual: index, 
      total, 
      progresso: progressoNumber, 
      nome: file.name, 
      status: message.status || 'ocr' 
    });
  });

  onProgress({ arquivoAtual: index, total, progresso: 100, nome: file.name, status: 'parsing' });
  
  const extracao = extrairEnderecosInteligente(textoBruto, 'amazon-flex-print');
  
  // Injeta o arquivo e texto bruto em todos para rastreamento
  const tagArquivo = (item) => ({ ...item, arquivo: file.name, textoExtraido: item.textoBruto || item.enderecoCompleto });
  
  extracao.enderecos = extracao.enderecos.map(tagArquivo);
  extracao.ignorados = extracao.ignorados.map(tagArquivo);
  extracao.duplicados = extracao.duplicados.map(tagArquivo);
  
  console.groupEnd();
  
  return {
    texto: textoBruto,
    arquivo: file.name,
    ...extracao
  };
};
