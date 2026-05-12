import { extrairEnderecosInteligente } from './parser-endereco.js';
import { processarImagemUnica, finalizarTesseractWorker } from './ocr.js';
import { criarRelatorioDebug } from './debug-ocr.js';

const tiposPermitidos = new Set(['image/png', 'image/jpeg']);

export const criarResultadoImportacaoFlex = () => ({
  enderecos: [],
  ignorados: [],
  duplicados: [],
  textos: [],
  totalArquivos: 0,
  invalidos: 0,
});

export const validarArquivoPrint = (file) => {
  if (!file) throw new Error('Arquivo inválido.');
  if (!tiposPermitidos.has(file.type)) throw new Error(`Formato não suportado: ${file.name}`);
  if (file.size > 15 * 1024 * 1024) throw new Error(`Imagem muito grande: ${file.name}`);
  return file;
};

// Funcao segura para misturar arrays de enderecos garantindo que nao havera duplicatas no estado global
export const mesclarResultados = (resultadoGlobal, novoResultado) => {
  const chavesExistentes = new Set(resultadoGlobal.enderecos.map(e => `${e.rua}-${e.numero}`.toLowerCase().replace(/[^a-z0-9]/g, '')));

  novoResultado.enderecos.forEach(end => {
    const chave = `${end.rua}-${end.numero}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (chavesExistentes.has(chave)) {
      resultadoGlobal.duplicados.push({...end, motivoDescarte: 'Duplicado no lote'});
    } else {
      chavesExistentes.add(chave);
      resultadoGlobal.enderecos.push({...end, ordem: resultadoGlobal.enderecos.length + 1});
    }
  });

  resultadoGlobal.ignorados.push(...novoResultado.ignorados);
  resultadoGlobal.duplicados.push(...novoResultado.duplicados);
  if (novoResultado.texto) {
    resultadoGlobal.textos.push({ arquivo: novoResultado.arquivo, texto: novoResultado.texto });
  }
  
  resultadoGlobal.invalidos = resultadoGlobal.ignorados.length;
};

export const processarPrintsFlex = async (files, onProgress = () => {}) => {
  const imagens = [...files].map(validarArquivoPrint);
  const total = imagens.length;
  const resultadoFinal = criarResultadoImportacaoFlex();

  if (!total) throw new Error('Selecione pelo menos um print.');

  console.group(`[IMPORT] Iniciando fila para ${total} imagem(ns)`);

  try {
    for (let index = 0; index < imagens.length; index += 1) {
      const file = imagens[index];
      
      const resultadoLocal = await processarImagemUnica(file, index + 1, total, onProgress);
      
      mesclarResultados(resultadoFinal, resultadoLocal);
      
      criarRelatorioDebug(resultadoLocal.texto, resultadoLocal.enderecos, resultadoLocal.ignorados, resultadoLocal.duplicados);

      // Yield event loop para nao travar UI
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  } catch (err) {
    console.error('[IMPORT] Falha critica durante processamento:', err);
    throw err;
  } finally {
    console.groupEnd();
    await finalizarTesseractWorker(); // Libera memoria
  }

  onProgress({ arquivoAtual: total, total, progresso: 100, nome: 'Concluído', status: 'concluido' });
  resultadoFinal.totalArquivos = total;
  
  return resultadoFinal;
};

export const adicionarTextoFlexManual = (resultado, texto) => {
  const destino = resultado || criarResultadoImportacaoFlex();
  const extracao = extrairEnderecosInteligente(texto, 'amazon-flex-manual');
  mesclarResultados(destino, {
    enderecos: extracao.enderecos,
    ignorados: extracao.ignorados,
    duplicados: extracao.duplicados,
    texto,
    arquivo: 'Colagem Manual'
  });
  return destino;
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
