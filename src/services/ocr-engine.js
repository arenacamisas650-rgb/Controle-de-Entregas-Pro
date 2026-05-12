import { extrairEnderecosInteligente } from './parser-endereco.js';
// CACHE BUSTER: 2026-05-12 14:50

// ─── Constantes ───────────────────────────────────────────────────────────────
const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
const OCR_TIMEOUT_MS = 90_000; // 90 segundos por imagem

// ─── Singleton do Worker ──────────────────────────────────────────────────────
let tesseractWorker = null;

/**
 * Handler de progresso dinâmico — substitui o logger fixo do v4.
 * No Tesseract.js v5, o logger vai em createWorker() e não em recognize().
 * Usamos um closure mutável para continuar suportando progresso por chamada.
 */
let _progressHandler = null;

// Injeta Tesseract.js via CDN (lazy, sem bloquear o boot do app)
const carregarTesseract = () => {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TESSERACT_CDN;
    script.async = true;
    script.onload = () => {
      if (window.Tesseract) {
        console.info('[OCR] Tesseract.js carregado da CDN.');
        resolve(window.Tesseract);
      } else {
        reject(new Error('[OCR] Tesseract.js não inicializou corretamente.'));
      }
    };
    script.onerror = () => reject(new Error('[OCR] Falha ao carregar Tesseract.js da CDN. Verifique sua conexão.'));
    document.head.append(script);
  });
};

/**
 * Cria (ou retorna) o Worker do Tesseract.
 * O logger dinâmico é registrado aqui (requisito da API v5).
 */
const getTesseractWorker = async () => {
  if (tesseractWorker) return tesseractWorker;

  const Tesseract = await carregarTesseract();
  console.info('[OCR-FIX] Criando Worker Tesseract (por+eng) — v2...');

  try {
    // Tentativa de criar o worker sem passar NADA que precise ser clonado
    tesseractWorker = await Tesseract.createWorker('por+eng');
    
    // REMOVIDO: setLogger. Em alguns builds do Tesseract.js v5 (via CDN), 
    // setLogger tenta enviar a função via postMessage e causa DataCloneError.
    // O progresso ficará desativado temporariamente para garantir o funcionamento.
    
    console.info('[OCR-FIX] Worker pronto para uso.');
    return tesseractWorker;
  } catch (err) {
    console.error('[OCR-FIX] Falha ao criar Worker:', err);
    tesseractWorker = null;
    throw err;
  }
};

// ─── Liberação de memória ─────────────────────────────────────────────────────
export const finalizarTesseractWorker = async () => {
  if (tesseractWorker) {
    console.info('[OCR] Finalizando Worker — liberando memória...');
    try {
      await tesseractWorker.terminate();
    } catch (e) {
      console.warn('[OCR] Erro ao terminar Worker (ignorado):', e);
    } finally {
      tesseractWorker = null;
      _progressHandler = null;
    }
  }
};

// ─── Pré-processamento de imagem via Canvas ───────────────────────────────────
const carregarImagemElemento = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`[OCR] Não foi possível decodificar: ${file.name}`));
    };
    img.src = url;
  });

/**
 * Aplica Grayscale + Contraste + Binarização para maximizar precisão do OCR.
 * Upscale 2x melhora detecção de textos pequenos em prints mobile.
 */
const preprocessarImagem = async (file) => {
  console.time('[OCR] Pré-processamento Canvas');
  const { img, url } = await carregarImagemElemento(file);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const scale = 2; // Upscale 2× para melhorar OCR em textos pequenos
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const contraste = 50;
  const fator = (259 * (contraste + 255)) / (255 * (259 - contraste));

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    let valor = fator * (gray - 128) + 128;
    valor = Math.max(0, Math.min(255, valor));
    if (valor > 200) valor = 255; // Binarização leve — remove ruído claro
    data[i] = data[i + 1] = data[i + 2] = valor;
  }

  ctx.putImageData(imageData, 0, 0);
  console.timeEnd('[OCR] Pré-processamento Canvas');

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(url);
      resolve(new File([blob], 'preprocessed.png', { type: 'image/png' }));
    }, 'image/png');
  });
};

// ─── Extração de texto via OCR ────────────────────────────────────────────────
/**
 * Extrai texto de uma imagem usando Tesseract OCR.
 * onProgress(porcentagem 0-100, { status })
 *
 * CORREÇÃO v5: logger agora é registrado no createWorker via closure dinâmico.
 * recognize() NÃO aceita logger como segundo argumento no v5.
 */
export const extrairTextoImagem = async (file, onProgress = () => {}) => {
  if (!file) throw new Error('[OCR] Arquivo inválido.');
  if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
    throw new Error(`[OCR] Formato não suportado: ${file.type}. Use PNG, JPG ou WebP.`);
  }

  console.info(`[OCR-FIX] ── Iniciando: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`);

  try {
    onProgress(0, { status: 'pre-processando' });
    const processedFile = await preprocessarImagem(file);

    onProgress(10, { status: 'iniciando-ocr' });
    const worker = await getTesseractWorker();

    // Registra handler de progresso para ESTA chamada específica
    _progressHandler = (m) => {
      const prog = 10 + Math.round((m.progress || 0) * 88);
      onProgress(Math.min(prog, 98), { status: 'ocr', progress: m.progress });
    };

    console.time(`[OCR-FIX] recognize: ${file.name}`);

    // Race com timeout — garante que o OCR nunca trava o app
    const result = await Promise.race([
      worker.recognize(processedFile),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`[OCR] Timeout: ${file.name} levou mais de ${OCR_TIMEOUT_MS / 1000}s`)),
          OCR_TIMEOUT_MS
        )
      ),
    ]);

    console.timeEnd(`[OCR-FIX] recognize: ${file.name}`);

    const texto = result?.data?.text || '';

    if (!texto.trim()) {
      console.warn(`[OCR] ⚠️ Texto vazio extraído de ${file.name}. Qualidade de imagem pode ser baixa.`);
    } else {
      console.info(`[OCR-FIX] ✅ Processamento concluído: ${file.name} — ${texto.length} chars extraídos`);
      console.info('[OCR] Texto extraído (primeiros 500 chars):', texto.slice(0, 500));
    }

    onProgress(100, { status: 'concluido' });
    return texto;

  } catch (error) {
    console.error(`[OCR] ❌ Falha em ${file.name}:`, error.message);
    throw error;
  } finally {
    // Garante que o handler seja limpo mesmo em caso de erro
    _progressHandler = null;
  }
};

// ─── Processamento completo de uma imagem ─────────────────────────────────────
/**
 * Extrai texto + roda o parser de endereços em sequência.
 * Wrapper usado pela fila de processamento em lote.
 */
export const processarImagemUnica = async (file, index, total, onProgress) => {
  const logName = file.name || `arquivo_${index}`;
  console.group(`[OCR] Arquivo ${index}/${total}: ${logName}`);

  onProgress({ arquivoAtual: index, total, progresso: 0, nome: file.name, status: 'iniciando' });

  let textoBruto = '';
  try {
    textoBruto = await extrairTextoImagem(file, (progressoNumber, msg) => {
      onProgress({
        arquivoAtual: index,
        total,
        progresso: progressoNumber,
        nome: file.name,
        status: msg.status || 'ocr',
      });
    });
  } catch (err) {
    console.error(`[OCR] Erro ao processar ${logName}:`, err.message);
    console.groupEnd();
    // Retorna resultado vazio ao invés de propagar — fail safe
    return {
      texto: '',
      arquivo: file.name,
      enderecos: [],
      ignorados: [],
      duplicados: [],
      erro: err.message,
    };
  }

  onProgress({ arquivoAtual: index, total, progresso: 100, nome: file.name, status: 'parsing' });

  const extracao = extrairEnderecosInteligente(textoBruto, 'amazon-flex-print');

  const tagArquivo = (item) => ({
    ...item,
    arquivo: file.name,
    textoExtraido: item.textoBruto || item.enderecoCompleto,
  });

  extracao.enderecos = extracao.enderecos.map(tagArquivo);
  extracao.ignorados = extracao.ignorados.map(tagArquivo);
  extracao.duplicados = extracao.duplicados.map(tagArquivo);

  console.info(`[OCR] ${logName} → ${extracao.enderecos.length} endereço(s) válido(s)`);
  if (extracao.enderecos.length > 0) {
    console.table(extracao.enderecos.map(e => ({
      Endereço: e.enderecoCompleto?.slice(0, 40),
      CEP: e.cep,
      Score: e.score,
    })));
  }
  console.groupEnd();

  return {
    texto: textoBruto,
    arquivo: file.name,
    ...extracao,
  };
};
