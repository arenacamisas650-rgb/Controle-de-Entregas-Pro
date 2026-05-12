export const formatarEnderecoCircuit = (endereco) => {
  if (!endereco) return '';
  const num = endereco.numero ? ` ${endereco.numero}` : '';
  const compl = endereco.complemento ? ` - ${endereco.complemento}` : '';
  const br = endereco.bairro ? ` - ${endereco.bairro}` : '';
  return `${endereco.rua || endereco.enderecoCompleto}${num}${compl}${br}`.trim();
};

export const gerarCsvCircuit = (enderecosRaw) => {
  console.group('[CSV] Iniciando exportacao Circuit');
  
  // Limpeza pre-exportacao
  const enderecosValidos = enderecosRaw
    .filter(e => e && e.valido !== false && e.enderecoCompleto && e.enderecoCompleto.length > 5);
    
  console.log(`[CSV] Filtrados ${enderecosValidos.length} enderecos validos de ${enderecosRaw.length} totais.`);

  // Deduplicacao final de seguranca
  const unicos = [];
  const vistos = new Set();
  
  enderecosValidos.forEach(e => {
    const limpo = formatarEnderecoCircuit(e).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!vistos.has(limpo)) {
      vistos.add(limpo);
      unicos.push(e);
    }
  });

  console.log(`[CSV] Apos deduplicacao: ${unicos.length} enderecos unicos.`);

  if (unicos.length === 0) {
    console.groupEnd();
    throw new Error('Nenhum endereço válido para exportar.');
  }

  const cabecalho = 'Address,Notes\n';
  const linhas = unicos.map(e => {
    const endStr = formatarEnderecoCircuit(e).replace(/"/g, '""'); // Escapar aspas para CSV
    const notaStr = `Entrega ${e.origem || 'Amazon'}`.replace(/"/g, '""');
    return `"${endStr}","${notaStr}"`;
  });

  const csvContent = cabecalho + linhas.join('\n');
  
  // Forca BOM para garantir UTF-8 no Excel/Circuit
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  const data = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `rota-circuit-${data}.csv`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('[CSV] Download concluido.');
    console.groupEnd();
  }, 100);
  
  return unicos.length;
};

export const copiarParaClipboard = async (enderecosRaw) => {
  console.group('[CLIPBOARD] Iniciando copia de enderecos');
  
  const enderecosValidos = enderecosRaw.filter(e => e && e.valido !== false && e.enderecoCompleto);
  const unicos = [];
  const vistos = new Set();
  
  enderecosValidos.forEach(e => {
    const limpo = formatarEnderecoCircuit(e).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!vistos.has(limpo)) {
      vistos.add(limpo);
      unicos.push(e);
    }
  });

  if (unicos.length === 0) {
    console.groupEnd();
    throw new Error('Nenhum endereço para copiar.');
  }

  const textoFinal = unicos.map(formatarEnderecoCircuit).join('\n');
  
  try {
    // API Moderna
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(textoFinal);
      console.log('[CLIPBOARD] Copiado usando API moderna.');
    } else {
      // Fallback Mobile/Legado
      console.log('[CLIPBOARD] Usando fallback de textarea.');
      const textArea = document.createElement('textarea');
      textArea.value = textoFinal;
      textArea.style.position = 'fixed'; // Evita scroll
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const sucesso = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (!sucesso) throw new Error('execCommand falhou');
    }
    console.groupEnd();
    return unicos.length;
  } catch (err) {
    console.error('[CLIPBOARD] Erro ao copiar:', err);
    console.groupEnd();
    throw new Error('Não foi possível copiar para a área de transferência.');
  }
};
