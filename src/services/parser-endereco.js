// ─── Tipos de logradouro reconhecidos ────────────────────────────────────────
const TIPOS_LOGRADOURO = [
  'rua', 'r\\.', 'avenida', 'av\\.', 'av', 'alameda', 'al\\.', 'travessa',
  'estrada', 'rodovia', 'praca', 'praça', 'largo', 'viela', 'beco',
  'viaduto', 'marginal', 'condominio', 'condomínio', 'residencial',
  'setor', 'quadra', 'conjunto', 'loteamento', 'jardim', 'vila',
];

// Regex compilado uma vez (performance)
const LOGRADOURO_RE = new RegExp(`\\b(${TIPOS_LOGRADOURO.join('|')})\\b`, 'i');
const CEP_RE = /\b\d{5}-?\d{3}\b/;
const NUMERO_RE = /(?:,\s*|\b(?:n[°º]?|num|numero)\s*[:\.]?\s*|\s+n?\s*)(\d{1,6}[a-zA-Z]?|s\/?n)\b/i;
const COMPLEMENTO_RE = /\b(apto?|apartamento|bloco|casa|fundos|sala|torre|lote|quadra)\s*[:\-]?\s*[a-z0-9 -]{1,20}/i;

// ─── Normalização ─────────────────────────────────────────────────────────────
const normalizarEspacos = (value) =>
  String(value || '')
    .normalize('NFKC')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/[|•·*=_~]/g, ' ')
    .trim();

const removerAcentos = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Limpeza específica para saída de OCR:
 * - Remove estados/país
 * - Corrige CEPs com caractere OCR errado (01234A567 → 01234-567)
 * - Normaliza espaços em excesso
 */
const limparTextoOCR = (texto) => {
  let limpo = texto
    .replace(/\b(brasil|brazil|br)\b/gi, '')
    .replace(/\b(SP|RJ|MG|PR|SC|RS|BA|GO|DF|PE|CE|AM|PA|MA|PI|AL|SE|RN|PB|ES|MT|MS|RO|TO|AC|RR|AP)\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();

  // Corrige CEPs com erro de OCR: 01234A567 → 01234-567 ou 01234 567 → 01234-567
  limpo = limpo.replace(/\b(\d{5})[^-\d\s](\d{3})\b/g, '$1-$2');
  limpo = limpo.replace(/\b(\d{5})\s(\d{3})\b/g, '$1-$2');

  return limpo;
};

// ─── Filtro de linhas inúteis ─────────────────────────────────────────────────
const PALAVRAS_RUIDO = new Set([
  'amazon', 'flex', 'amazon flex', 'itinerario', 'itinerary',
  'paradas', 'parada', 'entregas', 'entrega', 'pacotes', 'pacote',
  'navegar', 'iniciar', 'concluir', 'finalizar', 'rota', 'codigo',
  'scanner', 'coletar', 'retirada', 'proxima', 'hoje', 'manha', 'tarde',
  'status', 'voltar', 'ajuda', 'atualizar', 'gps', 'abrir', 'maps',
  'iniciar navegacao', 'chegar', 'destino', 'confirmar', 'entregue',
]);

const linhaInutil = (linha) => {
  const v = removerAcentos(linha).toLowerCase().trim();
  if (!v || v.length < 4) return true;
  if (/^\d+$/.test(v)) return true;              // Só números
  if (/^\d{1,2}:\d{2}/.test(v)) return true;    // Horário
  if (/^(entrega|parada|stop)\s+\d+/i.test(v)) return true;
  if (/^\d+\s+(pacotes?|itens?)/i.test(v)) return true;
  if (/\b\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}\b/.test(v)) return true;
  if (PALAVRAS_RUIDO.has(v)) return true;
  if (PALAVRAS_RUIDO.has(v.replace(/[^a-z]/g, ''))) return true;
  // Linhas que são só um número de parada tipo "1.", "2."
  if (/^\d{1,3}\.$/.test(v)) return true;
  return false;
};

// ─── Score de confiança ───────────────────────────────────────────────────────
export const calcularScoreConfianca = (texto, temCep, temNumero, temLogradouro) => {
  let score = 0;
  if (temLogradouro) score += 40;
  if (temNumero)     score += 25;
  if (temCep)        score += 25;
  if (texto.length > 12) score += 5;
  if (texto.length > 25) score += 5;

  // Endereço sem logradouro explícito mas com CEP e número — provavelmente válido
  if (!temLogradouro && temCep && temNumero) score += 10;
  // Só número mas longo: pode ser endereço sem palavra-chave
  if (!temLogradouro && !temCep && temNumero && texto.length > 15) score += 8;

  return Math.min(100, score);
};

// ─── Parse de um candidato de endereço ───────────────────────────────────────
export const parseEndereco = (textoBruto, index = 0, origem = 'amazon-flex') => {
  const texto = limparTextoOCR(textoBruto);
  const semAcento = removerAcentos(texto).toLowerCase();

  const cepMatch  = texto.match(CEP_RE);
  const cep       = cepMatch ? cepMatch[0].replace(/\s/, '-') : '';

  const numeroMatch = texto.match(NUMERO_RE);
  const numero      = numeroMatch ? numeroMatch[1] : '';

  const complementoMatch = texto.match(COMPLEMENTO_RE);
  const complemento      = complementoMatch ? complementoMatch[0] : '';

  const temLogradouro = LOGRADOURO_RE.test(semAcento);

  // Extrai a rua como a primeira parte (até vírgula ou " - ")
  const partes = texto.split(/\s+-\s+|,\s*/).map((p) => p.trim()).filter(Boolean);
  let rua = partes[0] || texto;
  if (rua.length <= 4 && partes.length > 1) rua = `${partes[0]} ${partes[1]}`;

  const bairro = partes.length >= 3 ? partes[partes.length - 2] : '';

  const score  = calcularScoreConfianca(texto, !!cep, !!numero, temLogradouro);

  // Threshold reduzido: 40 pontos (só logradouro já é suficiente)
  // Antes era 50 e rejeitava endereços sem CEP
  const valido = score >= 40 && (temLogradouro || !!cep);

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
    motivoDescarte: valido ? '' : (score < 40 ? `Score ${score} (mín. 40)` : 'Sem logradouro/CEP'),
    origem,
  };
};

// ─── Agrupamento de linhas multi-linha ───────────────────────────────────────
/**
 * Amazon Flex imprime endereços em 2-4 linhas:
 *   Linha 1: "Rua das Flores, 123"       ← logradouro + número
 *   Linha 2: "Jardim Paulista"            ← bairro
 *   Linha 3: "04567-890"                 ← CEP
 *   Linha 4: "2 pacotes"                 ← RUÍDO (já filtrado antes)
 *
 * Estratégia:
 * 1. Sempre inicia buffer ao encontrar logradouro OU linha com CEP standalone
 * 2. Também inicia quando linha tem número E comprimento razoável (OCR pode cortar "Rua")
 * 3. Finaliza ao encontrar novo logradouro, ou após acumular 4 linhas
 */
const agruparLinhas = (linhas) => {
  const candidatos = [];
  let buffer = [];

  const flush = () => {
    if (buffer.length > 0) {
      candidatos.push(buffer.join(', '));
      buffer = [];
    }
  };

  for (const linha of linhas) {
    const sem = removerAcentos(linha).toLowerCase();
    const temLogradouro   = LOGRADOURO_RE.test(sem);
    const temCep          = CEP_RE.test(linha);
    const temNumero       = NUMERO_RE.test(linha);
    const pareceCompl     = COMPLEMENTO_RE.test(sem);
    // Linha que parece ser só bairro/cidade (sem número nem logradouro nem CEP)
    const apenasTextual   = !temLogradouro && !temCep && !temNumero && linha.length > 4 && linha.length < 40;

    if (temLogradouro) {
      // Novo endereço começa — finaliza o anterior
      flush();
      buffer.push(linha);
      // Se já está completo (tem número E CEP), fecha imediatamente
      if (temNumero && temCep) flush();

    } else if (temCep && buffer.length === 0) {
      // CEP sem contexto anterior — tenta salvar como candidato isolado
      buffer.push(linha);
      flush();

    } else if (buffer.length > 0) {
      if (pareceCompl) {
        // Complemento pertence ao endereço atual
        buffer.push(linha);
      } else if (apenasTextual && buffer.length < 3) {
        // Provável bairro/cidade — agrega
        buffer.push(linha);
        if (temCep) flush(); // CEP encerra o bloco
      } else if (temCep) {
        buffer.push(linha);
        flush();
      } else if (temNumero && !temLogradouro && buffer.length < 2) {
        // Número em linha separada (OCR quebrou o endereço)
        buffer.push(linha);
      } else if (temLogradouro) {
        // Já tratado acima, mas por segurança
        flush();
        buffer.push(linha);
      } else {
        flush();
        // Linha não faz sentido no contexto — descarta isolada
        if (linha.length > 10) candidatos.push(linha);
      }

      // Buffer muito longo — força fechamento
      if (buffer.length >= 4) flush();

    } else if (temNumero && linha.length > 10) {
      // Linha com número mas sem logradouro reconhecido (OCR cortou "Rua")
      // Salva como candidato simples para o parser avaliar
      candidatos.push(linha);
    }
  }

  flush();

  // ── Redundância segura ────────────────────────────────────────────────────
  // Adiciona linhas que ainda não estão representadas nos candidatos agrupados
  // Isso garante que endereços em linha única não sejam perdidos
  for (const linha of linhas) {
    const jaPresente = candidatos.some((c) => c.includes(linha));
    if (!jaPresente && linha.length > 8) {
      candidatos.push(linha);
    }
  }

  return candidatos;
};

// ─── Extração principal ───────────────────────────────────────────────────────
export const extrairEnderecosInteligente = (textoOCR, origem = 'amazon-flex') => {
  if (!textoOCR || !textoOCR.trim()) {
    console.warn('[PARSER] Texto vazio recebido — nenhum endereço possível.');
    return { enderecos: [], ignorados: [], duplicados: [] };
  }

  console.groupCollapsed(`[PARSER] Analisando ${textoOCR.length} chars de texto OCR`);

  // Normaliza e filtra linhas inúteis
  const linhas = normalizarEspacos(textoOCR)
    .split(/\r?\n/)
    .map(normalizarEspacos)
    .filter((l) => l && !linhaInutil(l));

  console.info('[PARSER] Linhas úteis após filtro:', linhas.length, linhas);

  const candidatos = agruparLinhas(linhas);
  console.info('[PARSER] Candidatos após agrupamento:', candidatos.length, candidatos);

  const enderecos  = [];
  const ignorados  = [];
  const duplicados = [];
  const vistos     = new Set();

  for (const candidato of candidatos) {
    const parse = parseEndereco(candidato, enderecos.length, origem);

    if (!parse.valido) {
      if (candidato.length > 6) {
        ignorados.push(parse);
      }
      continue;
    }

    // Deduplicação por rua+número normalizado
    const chave = removerAcentos(`${parse.rua}-${parse.numero}`)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    if (vistos.has(chave)) {
      // Substitui se o novo tem score melhor ou mais informação
      const idx = enderecos.findIndex(
        (e) => removerAcentos(`${e.rua}-${e.numero}`).toLowerCase().replace(/[^a-z0-9]/g, '') === chave
      );
      if (idx >= 0) {
        const existente = enderecos[idx];
        if (parse.score > existente.score || (!existente.cep && parse.cep)) {
          enderecos[idx] = { ...parse, ordem: existente.ordem };
        }
      }
      duplicados.push({ ...parse, motivoDescarte: 'Duplicado' });
      continue;
    }

    vistos.add(chave);
    enderecos.push(parse);
  }

  // Recalcula ordem sequencial
  enderecos.forEach((e, i) => { e.ordem = i + 1; });

  console.info(
    `[PARSER] ✅ Resultado: ${enderecos.length} válidos | ${ignorados.length} ignorados | ${duplicados.length} duplicados`
  );

  if (enderecos.length > 0) {
    console.table(
      enderecos.map((e) => ({
        '#': e.ordem,
        Endereço: e.enderecoCompleto?.slice(0, 45),
        CEP: e.cep || '—',
        Score: e.score,
      }))
    );
  } else {
    console.warn('[PARSER] ⚠️ Nenhum endereço encontrado. Verifique a qualidade do print.');
    console.info('[PARSER] Candidatos analisados:', candidatos);
  }

  console.groupEnd();
  return { enderecos, ignorados, duplicados };
};
