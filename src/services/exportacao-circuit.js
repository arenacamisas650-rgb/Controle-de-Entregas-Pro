export const formatarEnderecoCircuit = (endereco) => {
  if (!endereco) return '';
  const num = endereco.numero ? ` ${endereco.numero}` : '';
  const compl = endereco.complemento ? ` - ${endereco.complemento}` : '';
  const br = endereco.bairro ? ` - ${endereco.bairro}` : '';
  return `${endereco.rua || endereco.enderecoCompleto}${num}${compl}${br}`.trim();
};

export const gerarCsvCircuit = (enderecosRaw) => {
  console.info('[CSV] Iniciando geração de arquivo para Circuit Route Planner');
  
  const enderecosValidos = enderecosRaw
    .filter(e => e && e.valido !== false && e.enderecoCompleto && e.enderecoCompleto.length > 5);
    
  console.info(`[CSV] Filtrados ${enderecosValidos.length} endereços válidos para exportação.`);

  const unicos = [];
  const vistos = new Set();
  
  enderecosValidos.forEach(e => {
    const limpo = formatarEnderecoCircuit(e).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!vistos.has(limpo)) {
      vistos.add(limpo);
      unicos.push(e);
    }
  });

  console.info(`[CSV] Total de endereços únicos: ${unicos.length}`);

  if (unicos.length === 0) {
    throw new Error('Nenhum endereço válido para exportar.');
  }

  // Formato: Address,Notes
  const cabecalho = 'Address,Notes\n';
  const linhas = unicos.map(e => {
    const endStr = formatarEnderecoCircuit(e).replace(/"/g, '""'); 
    const notaStr = 'Amazon Flex'; 
    return `"${endStr}","${notaStr}"`;
  });

  const csvContent = cabecalho + linhas.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `rota-amazon-flex.csv`; // Nome fixo solicitado
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.info('[CSV] Exportação concluída e download iniciado.');
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
