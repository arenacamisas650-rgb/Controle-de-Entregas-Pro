const TIPOS_LOGRADOURO = [
  'rua', 'r\\.', 'r', 'avenida', 'av\\.', 'av', 'alameda', 'travessa', 
  'estrada', 'rodovia', 'praca', 'praça', 'largo', 'viela', 
  'condominio', 'condomínio', 'residencial', 'beco', 'viaduto', 'marginal'
];

const normalizarEspacos = (value) => String(value || '')
  .normalize('NFKC')
  .replace(/[^\S\r\n]+/g, ' ')
  .replace(/[|•·*=_~]/g, ' ')
  .trim();

const removerAcentos = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const limparTextoOCR = (texto) => {
  let limpo = texto
    .replace(/\b(Brasil|Brazil|SP|RJ|MG|PR|SC|RS|BA)\b/gi, '') // Remove estados comuns ou pais
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();
  
  // Corrige erros comuns de OCR em CEPs (ex: 0123A-456 para 01234-456)
  limpo = limpo.replace(/\b(\d{5})[^\d\s](\d{3})\b/g, '$1-$2');
  
  return limpo;
};

const linhaInutil = (linha) => {
  const value = removerAcentos(linha).toLowerCase().trim();
  if (!value || value.length < 5) return true; // Muito curto
  if (/^\d+$/.test(value)) return true; // Apenas numeros
  if (/^entrega\s+\d+/.test(value)) return true;
  if (/^parada\s+\d+/.test(value)) return true;
  if (/^stop\s+\d+/.test(value)) return true;
  if (/^\d{1,2}:\d{2}/.test(value)) return true; // Horario
  if (/\b\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\b/.test(value)) return true; // Intervalo horario
  
  const palavrasIgnoradas = [
    'amazon flex', 'amazon', 'flex', 'itinerario', 'itinerary', 
    'paradas', 'parada', 'entregas', 'entrega', 'pacotes', 'pacote', 
    'navegar', 'iniciar', 'concluir', 'finalizar', 'rota', 'codigo', 
    'scanner', 'coletar', 'retirada', 'proxima', 'hoje', 'manha', 'tarde',
    'status', 'voltar', 'ajuda', 'atualizar', 'gps'
  ];
  
  return palavrasIgnoradas.some((token) => value === token || value.includes(`${token}:`));
};

export const calcularScoreConfianca = (texto, temCep, temNumero, temLogradouro) => {
  let score = 0;
  if (temLogradouro) score += 40; // Muito forte
  if (temNumero) score += 30; // Muito forte
  if (temCep) score += 20; // Muito forte
  
  if (texto.length > 15) score += 5; // Provavelmente detalhado
  if (texto.length > 30) score += 5;
  
  if (!temLogradouro && !temCep && temNumero && texto.length > 10) {
    score += 10; // Talvez seja endereco, mas nao achou a palavra "Rua"
  }
  
  return Math.min(100, score);
};

export const parseEndereco = (textoBruto, index = 0, origem = 'amazon-flex') => {
  const texto = limparTextoOCR(textoBruto);
  const semAcento = removerAcentos(texto).toLowerCase();
  
  const cepMatch = texto.match(/\b\d{5}-?\d{3}\b/);
  const cep = cepMatch ? cepMatch[0] : '';
  
  // Melhoria: capturar numero apos virgula, espaco ou identificador (n, num, sn)
  const numeroMatch = texto.match(/(?:,\s*|\b(?:n|num|nº|numero)\s*[:\.]?\s*|\s+)(\d{1,6}[a-z]?|s\/?n)\b/i);
  const numero = numeroMatch ? numeroMatch[1] : '';
  
  const complementoMatch = texto.match(/\b(apto|apartamento|bloco|casa|fundos|sala|torre|lote|quadra|condominio|condomínio)\s+[a-z0-9 -]+/i);
  const complemento = complementoMatch ? complementoMatch[0] : '';
  
  const logradouroRegex = new RegExp(`\\b(${TIPOS_LOGRADOURO.join('|')})\\b`, 'i');
  const temLogradouro = logradouroRegex.test(semAcento);
  
  const partes = texto.split(/\s+-\s+|,\s*/).map((p) => p.trim()).filter(Boolean);
  
  // Tenta extrair a rua: geralmente a primeira parte
  let rua = partes[0] || texto;
  // Se a rua for só "Rua", e tiver uma segunda parte, pode ser que separou errado
  if (rua.length <= 4 && partes.length > 1) {
    rua = `${partes[0]} ${partes[1]}`;
  }

  const bairro = partes.length >= 3 ? partes[partes.length - 2] : '';
  
  const score = calcularScoreConfianca(texto, !!cep, !!numero, temLogradouro);
  
  const valido = score >= 50 && (temLogradouro || !!cep);

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${index}`,
    ordem: index + 1,
    textoBruto,
    enderecoCompleto: texto,
    rua,
    numero,
    cep,
    complemento,
    bairro,
    score,
    valido,
    motivoDescarte: valido ? '' : (score < 50 ? 'Score muito baixo' : 'Sem logradouro/CEP'),
    origem,
  };
};

// Heuristica para juntar linhas que parecem ser o mesmo endereco (multiline stitching)
const agruparLinhas = (linhas) => {
  const candidatas = [];
  let buffer = [];
  
  const finalizarBuffer = () => {
    if (buffer.length > 0) {
      candidatas.push(buffer.join(', '));
      buffer = [];
    }
  };

  linhas.forEach((linha, i) => {
    const texto = removerAcentos(linha).toLowerCase();
    const isLogradouro = new RegExp(`\\b(${TIPOS_LOGRADOURO.join('|')})\\b`, 'i').test(texto);
    const hasNumero = /(?:,\s*|\b(?:n|num|nº)\s*|\s+)(\d{1,6}[a-z]?|s\/?n)\b/i.test(texto);
    const hasCep = /\b\d{5}-?\d{3}\b/.test(texto);
    
    // Se linha começa com CEP ou tem padrao de complemento solto, junta com a anterior
    const pareceComplementoSolto = /^(apto|apartamento|bloco|casa|fundos|sala|torre|lote|quadra|cep)/i.test(texto);
    
    if (isLogradouro && buffer.length === 0) {
      buffer.push(linha);
      // Se ja tem logradouro e numero, pode estar completo, mas vamos ver a proxima
      if (hasNumero || hasCep) {
         // Opcional: pode finalizar aqui ou esperar o proximo se for bairro
      }
    } else if (buffer.length > 0) {
      // Se a linha tem logradouro, provavel que seja UM NOVO endereco
      if (isLogradouro && !pareceComplementoSolto) {
        finalizarBuffer();
        buffer.push(linha);
      } else {
        // Junta com o buffer
        buffer.push(linha);
        if (hasCep) finalizarBuffer(); // Achou CEP, com certeza acabou o endereco
      }
    } else if (hasCep || hasNumero) {
      // Começou com algo estranho mas tem CEP/Numero, tenta salvar
      buffer.push(linha);
      finalizarBuffer();
    }
    
    // Nao deixa o buffer ficar gigante
    if (buffer.length >= 3) {
      finalizarBuffer();
    }
  });
  
  finalizarBuffer();
  
  // Tenta manter as linhas isoladas tambem caso o agrupamento falhe (Redundancia segura)
  linhas.forEach(linha => {
    if (!candidatas.includes(linha)) {
        candidatas.push(linha);
    }
  });

  return candidatas;
};

export const extrairEnderecosInteligente = (textoOCR, origem = 'amazon-flex') => {
  console.groupCollapsed(`[PARSER] Extraindo texto OCR (${textoOCR.length} chars)`);
  
  const linhas = normalizarEspacos(textoOCR)
    .split(/\r?\n/)
    .map(l => normalizarEspacos(l))
    .filter(l => l && !linhaInutil(l));
    
  console.log('[PARSER] Linhas uteis:', linhas);

  const candidatos = agruparLinhas(linhas);
  console.log('[PARSER] Candidatos apos agrupamento:', candidatos);

  const enderecos = [];
  const ignorados = [];
  const vistos = new Set();
  const duplicados = [];
  
  candidatos.forEach((candidato, index) => {
    const parse = parseEndereco(candidato, enderecos.length, origem);
    
    if (!parse.valido) {
      if (candidato.length > 5) ignorados.push(parse);
      return;
    }
    
    // Deduplicacao inteligente
    const chave = removerAcentos(`${parse.rua}-${parse.numero}`).toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (vistos.has(chave)) {
      console.log(`[PARSER] Duplicado encontrado: ${chave}`, parse);
      duplicados.push({...parse, motivoDescarte: 'Duplicado'});
      
      // Update if new one is better (higher score or more detailed)
      const existenteIndex = enderecos.findIndex(e => removerAcentos(`${e.rua}-${e.numero}`).toLowerCase().replace(/[^a-z0-9]/g, '') === chave);
      if (existenteIndex >= 0) {
        const existente = enderecos[existenteIndex];
        if (parse.score > existente.score || (!existente.cep && parse.cep)) {
            console.log(`[PARSER] Substituindo existente por versao com score melhor (${existente.score} -> ${parse.score})`);
            enderecos[existenteIndex] = { ...parse, ordem: existente.ordem };
        }
      }
      return;
    }
    
    vistos.add(chave);
    enderecos.push(parse);
  });
  
  // Recalcular a ordem
  enderecos.forEach((e, i) => e.ordem = i + 1);

  console.log(`[PARSER] Sucesso: ${enderecos.length}, Ignorados: ${ignorados.length}, Duplicados: ${duplicados.length}`);
  console.groupEnd();

  return { enderecos, ignorados, duplicados };
};
